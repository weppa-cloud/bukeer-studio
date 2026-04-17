# Specification Examples

Specs are GitHub Issues. Examples below show the **issue body** content.

## Example: Hotel Rate Management

Title: `[SPEC] Hotel Rate Management`
Labels: `spec`, `needs-tech-validation`, `area:catalog`

### Summary
Allow agency admins to manage custom rates for catalog hotels.

### Key Acceptance Criteria
- [ ] AC1: Admin can view rates for any account hotel
- [ ] AC2: Admin can create a new rate with name, season, pricing
- [ ] AC3: Rate prices are stored as gross amounts
- [ ] AC4: Rates are visible in hotel detail view

### Data Model
| Table | Column | Type |
|-------|--------|------|
| account_rates | id | uuid |
| account_rates | account_hotel_id | uuid (FK) |
| account_rates | name | text |
| account_rates | price_single | numeric |

## Publish command

```bash
gh issue create \
  --title "[SPEC] Hotel Rate Management" \
  --label "spec,needs-tech-validation,area:catalog" \
  --body-file /tmp/spec-hotel-rates.md
```

Expected output: `https://github.com/weppa-cloud/bukeer-studio/issues/<N>` — that URL is the source of truth from now on.

## Follow-up flow

1. `tech-validator` MODE:PLAN reads issue `#N`, posts TVB as comment, flips label `needs-tech-validation` → `tvb`
2. Implementation PR title: `feat: hotel rate management`, body includes `Closes #N`
3. Merge closes issue automatically
