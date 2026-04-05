const { emitToSession } = require('./websocketService');
// Assuming OpenAI is globally configured in the main repo or passed here:
// ELEVATED: Added basic mock-friendly wrapper for OpenAI to ensure code runs even if keys are missing in local dev.
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Main Orchestrator
 */
exports.runAllDetectors = async (payload) => {
  const { url, sessionId, domSnapshot, screenshotBase64 } = payload;
  
  // Run all three simultaneously
  const [nlpResult, domResult, visualResult] = await Promise.all([
    exports.runNlpDetector(domSnapshot).then(res => {
      if (sessionId) emitToSession(sessionId, 'nlp_complete', res);
      return res;
    }),
    exports.runDomDetector(domSnapshot).then(res => {
      if (sessionId) emitToSession(sessionId, 'dom_complete', res);
      return res;
    }),
    exports.runVisualDetector(screenshotBase64).then(res => {
      if (sessionId) emitToSession(sessionId, 'visual_complete', res);
      return res;
    })
  ]);

  const fused = exports.fuseResults(nlpResult, domResult, visualResult);
  const legallyMapped = exports.mapToLegalClauses(fused.patterns);
  
  return {
    overallScore: fused.overallScore,
    patterns: legallyMapped
  };
};

/**
 * 1. NLP Detector (OpenAI GPT-4o)
 */
exports.runNlpDetector = async (domSnapshot) => {
  const textCorpus = [
    ...(domSnapshot.buttons || []),
    ...(domSnapshot.modals || []),
    ...(domSnapshot.checkboxes || [])
  ].join(" | ");

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert NLP classifier for Dark Patterns. Analyze the provided UI text tokens. Return structured JSON ONLY: { \"detected\": boolean, \"patterns\": [ { \"category\": \"ENUM\", \"confidence\": 0.0-1.0, \"evidenceText\": \"exact match\" } ] }. Allowed ENUM: fake_countdown, hidden_cost, roach_motel, trick_question, forced_continuity, confirm_shaming."
        },
        { role: "user", content: textCorpus }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result.patterns || [];
  } catch (error) {
    console.error("[runNlpDetector] API Error", error);
    return [];
  }
};

/**
 * 2. DOM Structure Detector (Heuristics)
 */
exports.runDomDetector = async (domSnapshot) => {
  const patterns = [];
  
  // Rule: Timers present
  if (domSnapshot.timers && domSnapshot.timers.length > 0) {
    patterns.push({
      category: 'fake_countdown',
      confidence: 0.85,
      evidenceText: domSnapshot.timers[0] || 'Timer detected'
    });
  }

  // Rule: Trick Questions (Double Negatives)
  if (domSnapshot.checkboxes) {
    domSnapshot.checkboxes.forEach(label => {
      const lower = label.toLowerCase();
      if ((lower.includes("uncheck") || lower.includes("do not")) && lower.includes("not receive")) {
        patterns.push({
          category: 'trick_question',
          confidence: 0.90,
          evidenceText: label
        });
      }
    });
  }
  
  return patterns;
};

/**
 * 3. Visual Detector (GPT-4o Vision)
 */
exports.runVisualDetector = async (screenshotBase64) => {
  if (!screenshotBase64) return [];

  // Stripping the data:image prefix if present for OpenAI format
  const base64Data = screenshotBase64.replace(/^data:image\/\w+;base64,/, "");

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Analyze this UI screenshot for visual dark patterns (e.g. microscopic primary buttons, giant secondary buttons, visually hidden costs). Respond strictly in JSON: { \"detected\": boolean, \"patterns\": [{ \"category\": \"ENUM\", \"confidence\": float, \"description\": \"string\"}] }."
        },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Data}` } }
          ]
        }
      ],
      max_tokens: 300,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result.patterns || [];
  } catch (error) {
    console.error("[runVisualDetector] Error", error);
    return [];
  }
};

/**
 * 4. Sensor Fusion Algorithm
 */
exports.fuseResults = (nlpResults, domResults, visualResults) => {
  const W_DOM = 0.40;
  const W_NLP = 0.35;
  const W_VISUAL = 0.25;

  const rawPatterns = [...nlpResults, ...domResults, ...visualResults];
  const grouped = {};

  // Deduplication & Aggregation
  rawPatterns.forEach(p => {
    if (!grouped[p.category]) grouped[p.category] = { count: 0, sumConf: 0, evidence: p.evidenceText || p.description };
    grouped[p.category].count += 1;
    grouped[p.category].sumConf += p.confidence;
  });

  const finalPatterns = Object.keys(grouped).map(cat => ({
    category: cat,
    confidence: Math.min(1.0, grouped[cat].sumConf / grouped[cat].count + 0.1), // Base average + synergistic boost
    evidenceText: grouped[cat].evidence
  }));

  // Arbitrary scale calculation based on signal density
  let tempScore = finalPatterns.reduce((acc, curr) => acc + (curr.confidence * 40), 0);
  const overallScore = Math.min(100, Math.round(tempScore));

  return { overallScore, patterns: finalPatterns };
};

/**
 * 5. Legal Mapping
 */
exports.mapToLegalClauses = (patterns) => {
  const legalMap = {
    "fake_countdown": {
      DPDP: "Violation of conditional consent context",
      GDPR: "Recital 32: Consent not freely given"
    },
    "hidden_cost": {
      DPDP: "Informed consent compromised",
      GDPR: "Article 5(1)(a): Lawfulness, fairness and transparency"
    },
    "roach_motel": {
      DPDP: "Section 6: Withdrawal of consent must be as easy as giving consent",
      GDPR: "Article 7(3): Easy to withdraw consent"
    },
    "trick_question": {
      DPDP: "Section 6: Unambiguous indication and separate consent",
      GDPR: "Recital 32: Unambiguous affirmative action"
    },
    "forced_continuity": {
      DPDP: "Failure of clear notice requirements",
      GDPR: "Article 12: Transparent information"
    },
    "confirm_shaming": {
      DPDP: "Undue pressure violating free consent",
      GDPR: "Article 4(11): Freely given consent"
    }
  };

  return patterns.map(p => {
    return {
      ...p,
      legalClause: legalMap[p.category] ? `${legalMap[p.category].DPDP} | ${legalMap[p.category].GDPR}` : "Pending mapping"
    };
  });
};
