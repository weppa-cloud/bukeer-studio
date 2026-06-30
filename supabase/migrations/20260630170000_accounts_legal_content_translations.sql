-- Per-locale overlay for account-level legal page bodies
-- (cancellation_policy, terms_conditions, privacy_policy).
--
-- Context: legal pages (/cancellation, /terms, /privacy and their localized
-- slugs such as /en/cancellation-policy) read their body from
-- accounts.{cancellation_policy,terms_conditions,privacy_policy} via the
-- get_website_by_subdomain RPC. Those columns are single-language (Spanish),
-- so the English URL rendered the Spanish body. This adds an additive JSONB
-- overlay keyed by BCP-47 locale; the Studio renderer falls back to the base
-- (default-locale) column when a locale/field is missing.
--
-- Shape: { "en-US": { "cancellation_policy": "<html>", ... }, ... }
-- Hydrated post-RPC in lib/supabase/get-website.ts (getAccountLegalTranslations)
-- and resolved by resolveLegalContent() in @bukeer/website-contract.

BEGIN;

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS legal_translations jsonb;

COMMENT ON COLUMN public.accounts.legal_translations IS
  'Per-locale overlay for legal page bodies. Keyed by BCP-47 locale (e.g. "en-US"); each entry may override terms_conditions, privacy_policy and/or cancellation_policy. Falls back to the base text columns when missing.';

-- Load the English (en-US) cancellation policy for ColombiaTours.
-- Non-destructive: preserves any other locales/fields already present.
UPDATE public.accounts a
SET legal_translations =
  jsonb_set(
    COALESCE(a.legal_translations, '{}'::jsonb),
    '{en-US}',
    COALESCE(a.legal_translations -> 'en-US', '{}'::jsonb)
      || jsonb_build_object(
        'cancellation_policy',
        $html$<h1>Cancellation, Changes &amp; Refunds Policy</h1>
<p><em>Last updated: May 13, 2026</em></p>
<p>This Policy applies to bookings of experiences, activities, day trips, circuits, tour packages and related services contracted with ColombiaTours.Travel S.A.S. through its digital channels, sales advisors or authorized customer-service channels.</p>
<p>The conditions set out herein apply without prejudice to the minimum, non-waivable rights granted to the consumer under the Colombian Consumer Statute, e-commerce regulations, the rules applicable to tourism services and any other provisions in force in Colombia.</p>
<h2>1. Channels to request cancellations, changes or refunds</h2>
<p>Every request must be submitted in writing to hola@colombiatours.travel or to the email address provided by the advisor who handled the booking. The request must include, at minimum:</p>
<ul>
<li>Booking or voucher number.</li>
<li>Full name of the booking holder.</li>
<li>Service contracted and travel or activity date.</li>
<li>Reason for the request.</li>
<li>Supporting documents, where applicable.</li>
<li>Information needed to process the refund, where applicable.</li>
</ul>
<p>A cancellation or change will only be deemed received once ColombiaTours.Travel confirms receipt of the request in writing.</p>
<h2>2. Right of withdrawal in distance or electronic purchases</h2>
<p>Where the purchase was made through non-traditional or distance channels, including digital channels, the consumer may exercise the right of withdrawal within the applicable legal term, provided the service has not begun to be performed and no legal exception applies.</p>
<p>Where withdrawal is applicable, ColombiaTours.Travel will arrange the refund of amounts paid in accordance with the terms and conditions set out in the applicable Colombian regulations. In such cases, no commercial penalties or cancellation deductions will apply, without prejudice to the applicable legal exceptions.</p>
<p>If the tourism service must be performed within the legal withdrawal term, or if the consumer expressly requests or agrees to the start of the service before that term expires, the applicability of withdrawal will be assessed in accordance with the exceptions provided by law.</p>
<h2>3. Payment reversal</h2>
<p>If payment was made through e-commerce mechanisms, the consumer may request a reversal of the payment in the cases provided by law, including fraud, unsolicited transactions, non-receipt of the service, defective performance, or where the service does not match what was purchased.</p>
<p>In these cases, the consumer must submit the claim to ColombiaTours.Travel and carry out the corresponding procedures before the payment instrument issuer or the financial institution, within the applicable legal terms.</p>
<h2>4. Voluntary cancellation of experiences, activities or day trips</h2>
<p>For one-day experiences, activities or day trips, where neither the right of withdrawal nor a legal ground for payment reversal applies, the following commercial rules apply:</p>
<ul>
<li><strong>Request 15 calendar days or more before the activity:</strong> ColombiaTours.Travel will arrange the cancellation with the operator and may refund recoverable amounts, deducting only non-recoverable costs, third-party charges, commissions or penalties previously disclosed or incurred by the operator, where applicable.</li>
<li><strong>Request fewer than 15 calendar days before the activity:</strong> the booking will be subject to the operator's policies. The amount may be non-refundable if the operator has already applied penalties or non-recoverable costs. Where possible, ColombiaTours.Travel may offer rescheduling or travel credit, subject to the operator's availability and conditions.</li>
<li><strong>No-show or late arrival:</strong> if the traveler does not show up at the confirmed date, place and time, or arrives late and misses the service, the booking will be treated as a no-show. In this case there will be no refund, except with the operator's express authorization or where a legal ground applies.</li>
</ul>
<h2>5. Voluntary cancellation of circuits and tour packages</h2>
<p>Circuits and packages may include hotels, transport, guides, activities, tickets, insurance, blocked allotments and other services provided by third parties. For this reason, cancellations are settled based on the amounts actually recoverable and on each supplier's policies.</p>
<ul>
<li><strong>Request 30 calendar days or more before the departure date:</strong> ColombiaTours.Travel will arrange the cancellation and may refund recoverable amounts, deducting non-recoverable costs, non-refundable fares, bank charges, commissions, administrative expenses or supplier penalties that have been disclosed or that are supported by the conditions of the service contracted.</li>
<li><strong>Request between 29 and 8 calendar days before the departure date:</strong> the booking may be subject to high supplier penalties. ColombiaTours.Travel will inform the recoverable amounts, if any, and may offer rescheduling alternatives where suppliers allow it.</li>
<li><strong>Request 7 calendar days or fewer, trip already started, or no-show:</strong> services may be non-refundable. Only refunds authorized by suppliers, applicable legal grounds, or duly supported exceptional circumstances will be reviewed.</li>
</ul>
<h2>6. Airline tickets, hotels and non-refundable fares</h2>
<p>Airline tickets, charter flights, promotional fares, hotels, transport, insurance, admission tickets, special allotments and other services subject to third-party conditions will be governed by the relevant supplier's policies, by the conditions of the fare contracted, and by the applicable sector regulations, provided such conditions were disclosed to the consumer before purchase or form part of the service confirmation.</p>
<p>In the sale of commercial airline tickets, ColombiaTours.Travel acts as a travel agency or intermediary vis-à-vis the airline, unless it is expressly stated that the flight is chartered or directly operated. Therefore, ColombiaTours.Travel does not provide the public air transport service nor guarantee, with its own funds, the refund of tickets, promotional fares, non-refundable fares, administrative fees, service charges, commissions, penalties, fare differences or unused services where such amounts are not authorized, recognized or made available by the airline or supplier, or where the refund is not applicable under the law.</p>
<p>If the air, hotel or supplier fare allows changes, cancellations, re-issuances, credits or refunds, ColombiaTours.Travel will inform the traveler of the available alternatives and process the request with the supplier. Amounts that the supplier authorizes or makes available for refund will be passed on to the traveler, deducting only the corresponding charges, penalties, taxes, commissions or non-recoverable costs that have been disclosed or are supported by the conditions of the service.</p>
<p>The legal concepts of withdrawal, rescission, payment reversal or minimum consumer guarantees will apply only where their legal requirements are met. In particular, withdrawal in distance or electronic sales must not be confused with a voluntary commercial cancellation: if it is legally applicable, it will be handled in accordance with the applicable regulations; if it is not, the conditions of the fare, the supplier and this Policy will apply.</p>
<h2>7. Rescheduling and travel credits</h2>
<p>Rescheduling will be subject to availability, fare differences, supplier validity and the specific conditions of each service.</p>
<ul>
<li>For experiences, activities or day trips, rescheduling may be requested within the three (3) months following the date originally booked, unless the operator sets a different term.</li>
<li>For circuits or tour packages, rescheduling may be requested within the eight (8) months following the originally booked departure date, unless suppliers set different conditions.</li>
</ul>
<p>Every travel credit will carry the validity, restrictions and conditions disclosed in writing at the time of issuance.</p>
<p>A travel credit is not equivalent to a cash refund, unless the law or the applicable supplier policy provides otherwise.</p>
<h2>8. Cancellations or changes by ColombiaTours.Travel or suppliers</h2>
<p>If ColombiaTours.Travel or a supplier must cancel, modify or replace a service for operational reasons, force majeure, fortuitous events, safety, weather, availability, decisions by authorities, entry restrictions, health matters or other circumstances beyond ColombiaTours.Travel's reasonable control, the traveler will be informed as soon as possible.</p>
<p>In these cases, ColombiaTours.Travel may offer reasonable alternatives, such as rescheduling, replacement with an equivalent service, travel credit or refund of recoverable amounts, depending on the cause of the change, the stage of the trip, the suppliers' conditions and the applicable consumer rights.</p>
<h2>9. Services not used during the trip</h2>
<p>Once the trip has started, services contracted but not used due to the traveler's decision, late arrival, voluntary withdrawal, failure to meet immigration requirements, incomplete documentation, health condition, inappropriate behavior or other causes attributable to the traveler will not be refundable, except with the supplier's authorization or where a legal ground applies.</p>
<p>Where the non-use of the service is due to a serious medical situation, death, duly documented force majeure or a cause attributable to the supplier, ColombiaTours.Travel will review the case with the corresponding supporting documents and pursue the available alternatives with the suppliers.</p>
<h2>10. Refund timeframes</h2>
<p>Where a refund is applicable, ColombiaTours.Travel will state in writing the approved amount, any deducted items, and the estimated payment timeframe.</p>
<p>Refunds arising from the right of withdrawal or payment reversal will be processed in accordance with the applicable legal terms.</p>
<p>Other commercial or tourism refunds will be processed once ColombiaTours.Travel confirms the recoverable amounts with the suppliers and, in any case, in accordance with the terms set out in the applicable tourism and consumer regulations.</p>
<p>The refund may be made to the same payment method used for the purchase or to another method agreed in writing with the booking holder, subject to operational availability and the rules of the financial institutions.</p>
<h2>11. Traveler responsibilities</h2>
<p>The traveler is responsible for reviewing the booking confirmation, service conditions, schedules, meeting point, documentation requirements, vaccines, visas, insurance, medical restrictions, minimum age, required physical condition and other requirements disclosed for each experience or package.</p>
<p>The traveler is also responsible for informing the other members of their travel group of these conditions.</p>
<h2>12. Prohibited conduct</h2>
<p>ColombiaTours.Travel promotes safe, lawful and responsible tourism. Conduct that affects the safety, dignity or peace of other travelers, host communities, guides, operators or third parties will not be tolerated.</p>
<p>Any conduct related to commercial sexual exploitation, exploitation of minors, consumption or trafficking of illegal substances, violence, harassment, environmental harm or breach of local regulations is prohibited. Breaching these rules may result in immediate termination of the service with no right to a refund, without prejudice to the corresponding legal actions.</p>
<h2>13. Prevalence of Colombian law</h2>
<p>If any provision of this Policy is found to be contrary to a mandatory rule of consumer protection, e-commerce or tourism in force in Colombia, the applicable legal rule will prevail. In such case, the remaining provisions will retain their validity to the extent they are not incompatible.</p>
<h2>14. Contact</h2>
<p>For requests related to cancellations, changes, withdrawal, payment reversal or refunds, write to hola@colombiatours.travel.</p>$html$
      ),
    true
  )
FROM public.websites w
WHERE w.account_id = a.id
  AND (
    lower(w.custom_domain) = 'colombiatours.travel'
    OR lower(w.subdomain) = 'colombiatours'
  );

COMMIT;

-- Verification (run manually after applying):
-- SELECT a.id, a.name,
--        jsonb_pretty(a.legal_translations -> 'en-US') AS en_overlay
-- FROM public.accounts a
-- JOIN public.websites w ON w.account_id = a.id
-- WHERE lower(w.custom_domain) = 'colombiatours.travel'
--    OR lower(w.subdomain) = 'colombiatours';
