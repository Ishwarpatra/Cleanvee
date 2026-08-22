# Cleanvee custom icon system audit

**Scope:** Replacement of generic placeholder and third-party glyphs in the route-reachable `Workspace`, `Admin Mode`, and error fallback surfaces with the original Cleanvee SVG system.

## Original icon language

The icons in `client/src/components/CleanveeIcon.tsx` are authored as Cleanvee-specific, 24 × 24 SVG glyphs. The language combines the brand’s proof-of-clean motif—spark, checkpoint, route, verification, and report marks—with a consistent **1.7 px rounded stroke**, oat/matcha color inheritance, and no imported icon geometry.

| Icon family | Original Cleanvee glyphs | Replaced surfaces |
|---|---|---|
| Brand and navigation | `mark`, `shift`, `review`, `site`, `reports`, `team`, `rules`, `admin` | Sidebar brand, all six Workspace tabs, Admin Mode navigation, and account entry. |
| Operational controls | `sync`, `offline`, `search`, `notice`, `proof`, `add`, `issue`, `export`, `send` | Live-sync state, search, notification button, proof receipt, report issue, CSV export, and primary actions. |
| Evidence status | `warning`, `waiting`, `approved`, `verified`, `retake` | Checkpoint status, review queue, proof decisions, quality receipt, and retry actions. |
| Interface movement | `close`, `back`, `launch`, `chevronRight`, `chevronDown` | Dialog close, return, Admin Mode launch, rows, menus, and disclosure controls. |

## Replacement coverage

| Surface | Coverage | Evidence |
|---|---|---|
| Workspace shell | Complete | Brand, navigation, global search, notifications, mobile controls, sync state, and Admin Mode entry use `CleanveeIcon`. |
| Workspace tab content | Complete | Shift, Review, Sites, Reports, Team, Settings, proof receipt, empty states, filters, status indicators, and dialogs use the custom set where an icon is shown. |
| Admin Mode | Complete | Identity, navigation, account marker, site overview, building/checkpoint controls, invitations, and invitation completion use the custom set where an icon is shown. |
| Error fallback | Complete | The route-reachable `ErrorBoundary` uses the custom `warning` and `retake` glyphs rather than third-party icons. |
| Accessibility | Verified | Decorative SVGs are `aria-hidden`; semantic branded marks may use a `title` and `role="img"`. Existing labelled controls retain their visible text or explicit accessible name. |

## Regression safeguards

The `cleanveeIconNames` catalog is rendered exhaustively by `server/cleanveeIcon.test.tsx`: all **27** glyphs must produce a marked, non-empty `24 × 24` SVG with the expected decorative or semantic accessibility behavior. Mounted Workspace coverage checks all six tabs, the notification drawer, and the member proof dialog; mounted Admin Mode coverage checks all four sections plus building, invitation, and assignment dialogs. The route-reachable ErrorBoundary fallback is also rendered in a dedicated test. A source-level safeguard rejects `lucide-react` imports from `Workspace`, `AdminMode`, and `ErrorBoundary`.

## Validation

The verification passed **46 Vitest tests**, strict TypeScript checking, and the production build. The rendered unauthenticated public-entry audit reported **0 WCAG 2 A/AA violations**, no horizontal overflow at desktop, tablet, mobile portrait, or mobile landscape, and no reduced-motion regression. Desktop and mobile preview captures showed the active Workspace icons with no visible clipping. Authenticated Workspace and Admin Mode rendering is covered through mounted integration tests; no OAuth credentials were used for a scripted authenticated browser audit.
