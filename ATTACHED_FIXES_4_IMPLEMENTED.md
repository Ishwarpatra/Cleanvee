# Latest Attached Fixes Applied

## Implemented changes

| Finding | Change |
|---|---|
| Browser-exposed Gemini API key | Removed `GEMINI_API_KEY` and `API_KEY` from Vite `define`. Removed the local `.env` containing the previously exposed key, replaced key documentation with `VITE_GEMINI_FUNCTION_URL`, and changed the browser service to call an authenticated backend endpoint or use a safe local fallback. Any key previously shipped must still be rotated in Google AI Studio/Secret Manager. |
| Secured Gemini backend | Added `functions/src/geminiAnalysis.ts`, requiring a Firebase ID token, an active Firestore user profile, bounded operation/prompt input, an allow-listed operation, and a per-user daily quota of 100 requests. The provider key is loaded through Firebase Functions Secret Manager. |
| Dismissible demo warning | Made `DemoModeBanner` persistent, labelled it `DEMO DATA`, and exposed it through an accessible status region. |
| Reproducible containers | Updated the web Dockerfile to pinned Node/Nginx images, `npm ci`, a production build gate, and a non-empty `dist/index.html` assertion. Nginx now expands the deployment `PORT` value from a template. |
| Notification recipient safety | Added active-user, assignment, and notification-preference checks before sending alert emails. |
| External font dependency | Removed runtime Google Fonts requests and retained local system-font fallbacks. |
| Documentation | Updated README and archived architecture configuration examples to remove browser Gemini-key setup instructions. |

## Verification

| Check | Result |
|---|---|
| Web production build | Passed |
| Cloud Functions TypeScript build | Passed |
| Cloud Functions tests | Passed: 3 suites, 20 tests |
| Secret reference scan | No browser-facing Gemini key injection references remain |
| Git diff check | Passed |
| Root TypeScript typecheck | Still fails on unrelated existing model/UI errors in `BuildingsView`, `DashboardGrid`, `constants.tsx`, `mcpServer`, and privacy-filter typing. |
| Docker image smoke test | Not run because Docker is unavailable in the sandbox. |
| Flutter/Dart verification | Not run because Flutter/Dart is unavailable in the sandbox. |
| Firebase Emulator rules verification | Not run because the Firebase CLI/emulator is unavailable in the sandbox. |

## Required operational follow-up

The previously exposed Gemini key must be rotated and revoked. The new backend endpoint also requires deployment configuration for `GEMINI_API_KEY` in Secret Manager, `APP_ORIGIN`, and optionally `GEMINI_MODEL`; the frontend should set `VITE_GEMINI_FUNCTION_URL` only to the deployed HTTPS Function endpoint.

The backend endpoint is intentionally authenticated and rate-limited, but the existing mobile NFC workflow still requires a real signed-tag or challenge-response protocol before it can claim production-grade presence verification. The remaining root typecheck errors and unavailable emulator/mobile toolchains should be resolved in CI before release.
