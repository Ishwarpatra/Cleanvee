# Cleanvee custom icon system audit

**Scope:** Replacement of generic placeholder and third-party glyphs in the primary `Workspace` and `Admin Mode` surfaces with the original Cleanvee SVG system.

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
| Accessibility | Verified | Decorative SVGs are `aria-hidden`; semantic branded marks may use a `title` and `role="img"`. Existing labelled controls retain their visible text or explicit accessible name. |

## Regression safeguards

The mounted Workspace test verifies the brand and six navigation glyphs. A source-level test rejects `lucide-react` imports from the primary Workspace and Admin Mode page files, preventing a mixed generic icon system from returning to those surfaces.

## Validation

The icon update passed **41 Vitest tests**, strict TypeScript checking, and the production build. The rendered public-entry audit reported **0 WCAG 2 A/AA violations**, no horizontal overflow at the four tested viewport sizes, and no reduced-motion regression. Authenticated Workspace and Admin Mode rendering is additionally covered through mounted integration tests.
