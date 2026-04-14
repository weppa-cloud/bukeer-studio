# Specification Examples

## Example: Hotel Rate Management

### Summary
Allow agency admins to manage custom rates for catalog hotels.

### Key Acceptance Criteria
- [ ] Admin can view rates for any account hotel
- [ ] Admin can create new rate with name, season, pricing
- [ ] Rate prices are stored as gross amounts
- [ ] Rates are visible in hotel detail view

### Data Model
| Table | Column | Type |
|-------|--------|------|
| account_rates | id | uuid |
| account_rates | account_hotel_id | uuid (FK) |
| account_rates | name | text |
| account_rates | price_single | numeric |

This is the level of detail expected in every spec.
