# Cleanvee validation notes

## 20 August 2026

The permanent Cleanvee application was checked through the managed preview at desktop (`1280×720`) and narrow mobile (`375×812`) sizes. The verified permanent application now occupies the primary preview port after retiring the legacy prototype preview process.

At desktop size, the workspace renders the matcha sidebar, all six required tabs, Proof Receipt, decision queue, floor-plan panel, search, notifications, dialogs, empty states, and the role-aware **Admin Mode** control. The Admin Mode overview displays site-health, administrative activity, user totals, and invitation totals.

At the narrow mobile size, the sidebar navigation becomes a horizontally scrollable top navigation while all operational content stacks into one column. No desktop-only content overlaps the page body. The Admin Mode summary cards reflow into two columns and the administrative panels stack vertically.

The test suite passed with three tests, TypeScript completed without errors, and the production build completed successfully. The build reports a JavaScript chunk-size warning; this does not block delivery but dynamic import splitting is a future performance enhancement.
