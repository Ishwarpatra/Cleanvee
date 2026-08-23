# Cleanvee operational activation

Cleanvee is ready for live operational data. The application already provides administrator-controlled building and checkpoint setup, as well as operator invitations that are completed only after the invitee authenticates with Manus OAuth. This guide deliberately does **not** invent buildings, locations, checkpoints, or operators.

## 1. Create the first real site

In **Admin Mode → Buildings & checkpoints**, create the building using its real name, service address, and shift hours. Then add every physical proof point with its approved checkpoint label, location, floor, NFC tag identifier, and map position.

| Required operational input | Example format | Why Cleanvee needs it |
|---|---|---|
| Building name | `North Wing` | Identifies the site in assignments and reporting. |
| Service address | `100 Example Street, City` | Differentiates physical sites. |
| Shift hours | `06:00–14:00` | Sets the operational context for the site. |
| Checkpoint label | `Level 2 washroom` | Identifies the proof task. |
| Location and floor | `East corridor · Level 2` | Helps the operator locate the task. |
| NFC tag identifier | Real tag ID only | Connects the physical proof point to the checkpoint. |

## 2. Invite and activate an operator

In **Admin Mode → Team access**, queue an invitation with the operator’s real email address, active building assignment, and assignment role. The operator must sign in using that same email through Manus OAuth. An administrator then completes the matching invitation in Cleanvee; no passwords or credential sharing are required.

## 3. Run a live acceptance pass

After the building and operator are active, have the operator complete one real checkpoint. An administrator should verify the proof, try a send-back decision with a clear reason, and confirm that the revised proof appears in the review queue. This validates the intended user-to-admin operational loop before wider rollout.

## 4. Monitor dependencies

The repository now contains `.github/dependabot.yml`, which schedules a weekly npm dependency review. Dependabot version updates are enabled by committing this file, and GitHub supports `npm` updates from the repository root on a weekly schedule.[1] [2]

Review each dependency update pull request with the project checks before merging. Also confirm that **Dependabot alerts** and **Dependabot security updates** are enabled in the repository’s GitHub security settings, so GitHub can raise vulnerability-driven updates in addition to routine version-update pull requests.[1]

| Monitoring path | Cadence | Owner action |
|---|---|---|
| Dependabot version update pull requests | Weekly | Review changelog, run test/type/build checks, then merge or defer with a reason. |
| Dependabot security alerts | Event-driven | Triage severity and reachability; prioritize production dependencies. |
| `pnpm audit --prod` | Before release and after major dependency changes | Record findings and remediate reachable issues. |

## Details needed to activate the first site

Send the following real information when ready: the building name, service address, shift hours, one or more checkpoint labels with location/floor/NFC tag identifiers, and the operator’s email address plus intended assignment role. Cleanvee can then be populated without using placeholder operational records.

## References

[1]: https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configure-version-updates "GitHub Docs — Configuring Dependabot version updates"
[2]: https://docs.github.com/code-security/reference/supply-chain-security/dependabot-options-reference "GitHub Docs — Dependabot options reference"
