# Mumbai checkpoint evidence review

## Scope and decision standard

This review assessed whether public sources could convert the inactive **One BKC** draft checkpoints into actual operational locations or replace their draft NFC identifiers. A checkpoint location requires a source that identifies the specific physical point; an NFC identifier requires an authorized site asset register or physical-tag inspection. A building address or amenity list is insufficient for either purpose.

## Verified public facts

The current portfolio page identifies One BKC at **C Wing 407, Plot No. C-66, G Block, Bandra Kurla Complex, Bandra (E), Mumbai 400051** and describes high-level amenities. [1] Apple Maps independently identifies One BKC as an office building at **C66, G Block, Bandra Kurla Complex, Bandra East, Mumbai 400051**. [2] JLL’s commercial listing identifies the same plot and describes broad complex amenities, including cafés, food outlets, parking, a day-care centre, and a club. [3]

| Draft record | Public evidence available | Operational conclusion |
|---|---|---|
| `DRAFT — Arrival point` | Building-level address only | No entrance or checkpoint placement is identified. Keep inactive. |
| `DRAFT — Service route point` | Broad amenities only | No service route or cleaning point is identified. Keep inactive. |
| `DRAFT — Completion point` | Broad amenities only | No completion location or inspection point is identified. Keep inactive. |

## NFC conclusion

None of the reviewed sources publishes an NFC tag inventory, tag serial number, or cleaning-checkpoint register. The existing `DRAFT-MUM-ONEBKC-*` values therefore remain non-operational placeholders and were **not** replaced. No active checkpoint, site assignment, or proof workflow was created.

> The user requested confirmation, but the evidence supports only the building’s public address—not its interior operational points or NFC assets. Retaining inactive drafts is the accurate and safe outcome.

## Required onsite confirmation

An authorized site contact or facilities team must supply, or verify during a walkthrough, each checkpoint’s precise label, floor, placement, physical NFC tag ID, and designated responsible operator. Only then should the relevant draft record be updated and activated.

## Configuration validation

Database verification confirms that the pilot retains its draft-only `07:00–18:00` schedule, the three `DRAFT-MUM-ONEBKC-*` records remain inactive, and there are no active assignments or cleaning logs. An administrator activity entry records the evidence-review decision and the requirement for an authorized onsite walkthrough before any activation.

## References

[1] [Knowledge Realty Trust, “One BKC”](https://www.knowledgerealtytrust.com/portfolio/mumbai/one-bkc)

[2] [Apple Maps, “One Bkc”](https://maps.apple.com/place?place-id=IE4683C6F84DD4AF)

[3] [JLL India, “One BKC, Plot C-66, G Block”](https://property.jll.co.in/listings/one-bkc-plot-c-66-g-block)
