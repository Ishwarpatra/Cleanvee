# Attached Fixes Implemented in Cleanvee

## Implemented

| Area | Changes |
|---|---|
| Web production build | Confirmed the Vite production build succeeds. The prior Gemini syntax blocker is no longer present. |
| Mobile navigation | Replaced invalid named navigation on logout with `context.go('/login')`; added GoRouter refresh listening to `AuthProvider`; registered checkpoint, NFC, and camera routes; replaced checkpoint placeholder buttons with route actions. |
| NFC safety | Removed simulated NFC success. The app now fails closed when a tag is detected without server-backed cryptographic verification, provides retry/cancel controls, and does not claim that presence was verified. |
| Mobile data contract | Standardized mobile log fields on `cleaner_id` and `created_at`, with Firestore Timestamp handling for local reads/writes and UTC ordering. Offline writes retain deterministic document IDs for retry-safe synchronization. |
| Storage tenant isolation | Proof uploads now use `proof_of_quality/{buildingId}/{checkpointId}/{fileName}`, require assigned-building access, verify checkpoint/building ownership, require uploader metadata, and remain immutable. |
| Settings authorization | `app_config` is now building-scoped in rules. Managers can only read/write settings for assigned buildings, while administrators retain global access. The web settings context targets the assigned building and no longer reports a failed cloud write as successfully saved. |
| Live data integrity | Demo data is only used when `VITE_DEMO_MODE=true`. Live-data failures no longer silently substitute synthetic operational records. The daily log query uses UTC Firestore Timestamp boundaries and no longer treats a 100-row truncation as the complete daily record set. |
| Mobile upload service | Upload paths are tenant-scoped, uploader metadata is attached, logs use deterministic IDs, abandoned uploads are cleaned up best-effort, and submission refuses to proceed without a presence-verification identifier. |

## Verification

| Check | Result |
|---|---|
| Web production build | Passed |
| Cloud Functions build | Passed |
| Cloud Functions tests | Passed: 3 suites, 20 tests |
| Git diff whitespace check | Passed |
| Root TypeScript typecheck | Still fails on pre-existing unrelated model/UI errors in `BuildingsView`, `DashboardGrid`, `constants.tsx`, `mcpServer`, and privacy-filter typing. No remaining error points to the newly modified `useFirestoreData` hook or settings context. |
| Flutter/Dart verification | Not run because Flutter and Dart are not installed in the sandbox. |
| Firebase Rules Emulator verification | Not run because the Firebase CLI/emulator is not installed in the sandbox. |

## Remaining work

The mobile cleaning journey is now safer and its navigation is connected, but a production-grade NFC flow still requires a server-supported signed tag or challenge-response protocol. The camera screen still needs a real AI inference endpoint and explicit upload-progress UI before it can claim a verified cleaning event. Those capabilities cannot be safely fabricated from the current repository because no signed-tag protocol or mobile AI endpoint is defined.

The attached review also calls for emulator rule tests, navigation widget tests, resumable uploads, signed unsubscribe URLs, cursor pagination, offline conflict policy, and shared cross-platform schemas. These are separate implementation tracks and should be completed before treating the mobile client as a production compliance workflow.
