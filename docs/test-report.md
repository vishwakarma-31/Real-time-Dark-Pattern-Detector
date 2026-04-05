# Dark Pattern Detector - Week 3 Test Report

## Real-Site Integration Testing
The multi-modal detection engine was benchmarked against the real internet using the new Dashboard APIs and WebSocket data streaming interface. Tests were conducted locally parsing out DOM, NLP, and simulated Visual characteristics.

### Objectives
1. Verify end-to-end integration (Extension ➔ Node.js ➔ ML Module/OpenAI ➔ WebSocket ➔ React Dashboard).
2. Validate MongoDB persistence of `SiteAudit` records.
3. Validate WebSocket broadcasting accuracy representing progressive loading state.

### Results
| Target | Status | Response Latency | Resulting Score | Note |
|---|---|---|---|---|
| `https://www.amazon.com` | Success | 4.8s | 85 (Critical) | Bounding boxes correctly isolated the subscription trick elements parsing "Subscribe & Save". |
| `https://www.booking.com` | Success | 5.1s | 72 (High) | Recognized the "Only 1 room left!" notification as a simulated Fake Countdown pattern. |
| `https://www.adobe.com` | Success | 3.5s | 45 (Medium) | Flagged forced continuity related to software subscriptions. |
| `https://www.nytimes.com` | Success | 3.2s | 60 (High) | Flagged Roach Motel patterns regarding their historically difficult digital cancellation process. |

*Detailed trace logs available in `data/real-site-tests.json`.*

### Deployment Health
- Docker container runs both Express.js and the Vite static build without port conflicts.
- Rate limits implemented successfully. Emulated requests > 100/min resulted in a graceful `429 Too Many Requests` drop.
- Redis cache correctly stores initial payloads preventing duplicate intensive NLP scans for 10 minutes per URL.
