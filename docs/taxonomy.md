# Dark Pattern Taxonomy

This taxonomy outlines the exact 6 dark pattern categories that the Real-Time Dark Pattern Detector is trained to identify. It establishes the baseline definitions, required DOM features, and natural language signals necessary for positive classification.

### 1. Fake Countdown (`fake_countdown`)
**Definition:** A timer that appears to limit an offer but resets on page reload or is purely decorative, creating artificial scarcity and false urgency.
**DOM Signals:**
- Presence of elements matching countdown logic (e.g., ticking seconds).
- Elements structured with classes like `timer`, `countdown`, or `time-left`.
- Accompanying urgent Call-To-Action (CTA) elements.
**NLP Signals:**
- "Hurry"
- "Expires in"
- "Only X left"
- "Deal ends"
- "Sale ends soon"

### 2. Hidden Cost (`hidden_cost`)
**Definition:** Fees, charges, or compulsory add-ons that are concealed during the initial stages of a funnel and revealed only at the final checkout step.
**DOM Signals:**
- Sudden unexpected price DOM node mutation between cart step and checkout step.
- Pre-checked add-on checkboxes hidden within accordions.
- Micro-text placed distantly from the main purchase button.
**NLP Signals:**
- "Convenience fee"
- "Processing charge"
- "Handling fee"
- "Mandatory service charge"

### 3. Roach Motel (`roach_motel`)
**Definition:** A design architecture that makes it extremely easy to subscribe, sign up, or opt-in, but deliberately difficult and friction-heavy to cancel or unsubscribe.
**DOM Signals:**
- Absence of a visible `<button>` or `<a>` tag for cancellation.
- Cancellation flows requiring more than 3 nested clicks or hidden deeply in account settings.
- Phone numbers or email links specifically assigned to the cancellation action rather than a direct web flow.
**NLP Signals:**
- "Call to cancel"
- "Contact support to unsubscribe"
- "Email us to terminate your account"

### 4. Trick Question (`trick_question`)
**Definition:** A checkbox or toggle phrased using double negatives or confusing, convoluted language intended to trick the user into giving unintended consent.
**DOM Signals:**
- Opt-out interactions disguised as opt-ins.
- Unchecked checkboxes required for rejection.
- Checkboxes placed immediately below densely worded paragraphs.
**NLP Signals:**
- "Uncheck to not receive"
- "Do not opt out"
- "Deselect if you don't want"
- "I do not wish to not subscribe"

### 5. Forced Continuity (`forced_continuity`)
**Definition:** A free trial that silently auto-converts to a paid subscription without clear, prominent warning, relying heavily on the user forgetting to cancel.
**DOM Signals:**
- Free trial CTAs coupled with mandatory credit card input fields.
- Absence of cancellation reminder disclaimers in the immediate visual hierarchy of the submit button.
- Terms of service nested behind obscure or low-contrast links.
**NLP Signals:**
- "Free trial"
- "Cancel anytime"
- "No commitment"
- "We will charge you after"

### 6. Confirm Shaming (`confirm_shaming`)
**Definition:** The decline or secondary option of a prompt is deliberately worded to make the user feel guilty, ignorant, or embarrassed for declining the offer.
**DOM Signals:**
- Two-button modals with highly asymmetric CSS styling (e.g., massive primary button, microscopic low-contrast secondary link).
- Secondary decline links disguised as regular text spans to evade visual detection.
**NLP Signals:**
- "No thanks, I don't want to save money"
- "I prefer paying full price"
- "No, I hate discounts"
- "I'd rather be uninformed"
