# Mumbai map-reference site proposal

## Proposed public reference site

The proposed initial reference is **One BKC, Bandra East, Mumbai 400051**, identified from two independent public commercial-office location pages. Cushman & Wakefield lists its Mumbai office at **C-401, 4th Floor, One BKC, G Block, Bandra East, Bandra Kurla, Mumbai, Maharashtra 400051**.[1] Colliers lists its Mumbai corporate office at **Unit 601, 6th Floor, A Wing, One BKC, Plot C-66, Bandra East, Mumbai 400051**, and provides public map coordinates for that office.[2]

> This is a **map-reference pilot**, not a claim that One BKC, Cushman & Wakefield, or Colliers is a Cleanvee customer or has authorized operational access.

## Safe proposed record

| Cleanvee field | Proposed value | Verification status |
|---|---|---|
| Building name | `Mumbai Map Reference Pilot — One BKC` | Clearly marked as a non-customer pilot. |
| Address | `One BKC, Bandra East, Bandra Kurla, Mumbai, Maharashtra 400051` | Publicly listed by independent commercial-office pages. |
| Shift hours | Not entered | Requires operating agreement or administrator approval. |
| Checkpoints | None created | Interior locations and NFC identifiers are not map-verifiable. |

## Approval needed before creation

The building record can be created with the verified address, but no checkpoint record should be created until an authorized operator supplies the actual interior locations, shift hours, and NFC tag IDs. This prevents the map reference from being mistaken for a live serviced location.

## Creation record

The approved building was created in Cleanvee as **record ID 1** with the explicit schedule value `Not configured — map reference only`. Verification confirmed that the building is active, its administrator activity entry is present, and **zero checkpoints** were created. The map reference therefore remains non-operational until authorized site details are provided.

## User-authorized draft configuration

The user authorized a **07:00–18:00** schedule and requested an agent-defined setup because the record will not yet be used operationally. The following records are therefore drafts, not claims about the building interior. Each will remain inactive and must be replaced or confirmed during an authorized site walk-through before activation.

| Draft label | Stored location | Floor | Draft NFC identifier | Status |
|---|---|---|---|---|
| `DRAFT — Arrival point` | `Unverified — confirm at site walk-through` | `To be confirmed` | `DRAFT-MUM-ONEBKC-001` | Inactive |
| `DRAFT — Service route point` | `Unverified — confirm at site walk-through` | `To be confirmed` | `DRAFT-MUM-ONEBKC-002` | Inactive |
| `DRAFT — Completion point` | `Unverified — confirm at site walk-through` | `To be confirmed` | `DRAFT-MUM-ONEBKC-003` | Inactive |

> No operator, team assignment, proof record, or active NFC workflow is created by this draft configuration.

## Verified draft state

The draft configuration is now applied. The building retains an active map-reference record only; its schedule is `07:00–18:00 — map reference draft only`. All three draft checkpoints are inactive, have no asserted physical placement, and have no active team assignment. Administrator activity records capture both the schedule update and the draft-checkpoint creation.

Before any checkpoint is activated, an authorized site contact must confirm its actual label, interior location, floor, NFC tag identifier, and the assigned operator. The corresponding `DRAFT-*` record should then be replaced or explicitly updated; it must not be silently reused as an asserted site fact.

## References

[1]: https://www.cushmanwakefield.com/en/india/offices/mumbai "Cushman & Wakefield — Mumbai office"
[2]: https://www.colliers.com/en-in/india/cities/mumbai "Colliers — Mumbai office locations"
