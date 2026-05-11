# Epic #471 Backlog Cleanup — 2026-05-11T03:23:23.744Z

- Mode: apply
- Decisions: 191
- Applied: 191

## Operational Learnings

- Duplicate noise came mostly from candidates with the same evidence and the
  same action target. The preventive rule is now to block or coalesce before
  candidates are promoted, not only during executor gating.
- Work already in a measurement window must not re-enter `ready`; it should stay
  blocked/skipped until its outcome window closes.
- Backlog cleanup needs an auditable ledger. Every row below records the table,
  row id, previous status, final status and correlation reason.
- Runtime process hygiene matters: multiple daemons with different SHAs can
  reintroduce duplicate work even when the current code is correct.

## Follow-Up Implemented

- Candidate correlation now derives target identity from `evidence.target` and
  `evidence.adapter_input`, so legacy or brain-created work without explicit
  correlation can still be deduped.
- Brain materialization now reads adapter target fields before falling back to a
  generic agentic target key.
- Production cycle now supports explicit `runtime_mode`:
  - `monitor`: profiles, heartbeat and learning only; no brain materialization,
    no discovery, no promotion and no claims.
  - `executor`: full live-gated runtime path.
- Scheduler heartbeat metadata now records a lease token, PID, runtime mode and
  lease expiration.
- The scheduler script now refuses to start a second scheduled daemon while a
  fresh lease exists.

## Validation

- Unit/runtime tests passed:
  `npm test -- __tests__/lib/growth/autonomy/evidence-correlation.test.ts __tests__/lib/growth/autonomy/production-cycle.test.ts --runInBand`
- Typecheck passed:
  `npm run typecheck`
- Production monitor cycle completed with:
  - `runtime_mode=monitor`
  - `candidate_count=0`
  - `promoted_count=0`
  - `claimed_count=0`
  - `production_mutation_performed=false`
- Second daemon start was blocked with:
  `fresh_scheduler_lease_exists`

| Table | ID | From | To | Reason |
|---|---|---|---|---|
| growth_opportunity_candidates | `0052be33-5323-4dc0-a895-2d6b3e267bc7` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `68525fb8-7c23-48ee-ac0c-d7a2397e371c` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `0080fe80-7627-401a-bff1-c72d12ef40b4` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `d5ac26e2-583e-4730-b930-4ad3b1e526cc` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `6e25ef11-63b5-46a4-bd1e-555995482842` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `4e0ee799-acfc-4004-9c28-409932d77748` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `749fe240-4941-4595-9e80-d5ce6d720d7b` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `67eb24ec-fa58-483d-af89-1d24e145b52b` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `8740c615-4d36-4d41-9fba-e78bb3ecfef6` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `f71c14d7-bcad-4d13-b595-aa69a82a11d1` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `dcb6ab9c-f36b-4cd2-bf07-8e3f4fdbf31d` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `5eb31b94-6e03-4c02-81d4-5cd9c3c50681` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `ab784526-6048-4923-8582-9e688c064809` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `4694c305-2c78-4680-8ebf-4269c7c19994` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `4a6b8de8-2de5-4c1e-99af-f660e3be137f` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `79cd819e-a5b5-4a60-b8c4-ec53f19a0ec0` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `90303725-4e16-4b17-b215-0377e9d47aef` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `13a51fcb-6f24-43b8-8581-c8068100e658` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `54efcbc3-9c99-4b04-856f-c928cf4c3fc3` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `20d10506-ae8a-4fa0-add1-244723476529` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `51a79b65-190f-4a1a-838b-dd5999760d0f` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `a59865be-ce5c-42ef-975c-48ab12f68450` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `fa6567a7-5dd1-42c5-af63-489eb39b7fe9` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `d46352ff-349d-4415-9cb5-25e3d9379974` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `178744d3-a5fb-4c6b-9e6c-bcb23ccf52e2` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `90d5b98e-290f-4aea-a557-37f19fe78d04` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `893cb4b8-12d3-49c3-a021-dd47d8c90d05` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `5d98c1ed-da37-45ac-8a1d-21eef15d26db` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `c0b0ec4d-8a53-4b30-99cd-c9b3090414d2` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `54c1cbe4-0972-47f3-af45-fafe6340927e` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `c6127b69-5d7a-4509-a2bf-f104beb7febd` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `0b6dc156-1ba9-4367-961c-b87c3bffead6` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `b38c9b36-2f37-4122-8208-d2e1d2107018` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `350f6ec3-638c-4636-8642-f972a032e807` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `670b9919-b75d-48c8-bc29-9b9fcb81c2fb` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `a061029e-e36c-4881-a5be-005c08de72f8` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `f8dbedbd-b922-41eb-abaf-c11edeee3350` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `2733232a-07e9-4f3d-85ac-9ff328c34a75` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `841b5ec7-0cb5-467e-93f8-ccc38ed67048` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `1ccd2058-e024-4494-8bab-7c3bb25c7bcb` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `289eef3d-f810-4aa1-b7e0-49e3615266c2` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `06147efd-d948-49dd-8658-bb494e1d4b24` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `e923c5c8-aa57-4b32-b344-331dd1ada10f` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `e600b731-f1a2-4bbd-882b-c2ff2edfc4ec` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `79226ff6-cb0b-411d-8414-92b2530bb258` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `b27cf0f2-0268-49c1-bc28-03f93f656853` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `cccde0dc-73cc-4cc9-9d83-ff4bd0b2654e` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `34ba7edf-1715-4d85-8b86-cc600e624b56` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `f151b6f5-5d7c-4a22-ae11-b3596e7357e4` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `6fbe3b15-1cba-438d-9b83-a896f8941aff` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `821de88e-5c5a-4329-9106-fc0a16106688` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `887f9fd9-ebe0-4493-9cbb-135e79218232` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `63990809-7a17-4242-8d58-3cd0bb0758dd` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `8b921120-be95-4153-8590-7ff889d93057` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `c8467a98-6c80-4e88-afc7-e39464387056` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `bff476c9-ae51-44b4-9fe4-45a3c93785f0` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `db8958e3-1804-4353-ac50-d61f000b1a38` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `7b181a5c-8503-4d88-94b3-fa8b39a9e223` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `74d6cbae-5aad-4b92-a230-217def9a5259` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `56d312a5-f683-4e39-b171-1e6dd51d5023` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `18edd164-3611-4114-98c2-f1449e83fcfe` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `71ea19a2-e4c8-4997-be5c-92a7d47cc9f0` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `66323b68-681b-4ca3-89a9-f986a3eb4ba3` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `bf459a95-067c-44f9-8ed6-a4b76feae9b4` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `e4ce2eb4-c977-4b00-a025-62527901110b` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `449ab386-0d48-4d09-9997-8ecfe85f5147` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `566fb818-5f47-4686-8baf-2520fb791c23` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `ba2708c3-8bd5-4f75-98f9-2c5d8b5c70f6` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `fbfe2276-fcdd-4efe-a1fb-1a78f7bee0ee` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `fdd45752-d800-42e7-92fe-b80e63918b48` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `6dc31992-b65b-40d1-bf8d-8af722adf582` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `c10be18e-687b-493c-a930-801604a0a3ec` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `38c1ff39-f2a5-4fde-a647-3414a6697d68` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `4a441103-abd3-4524-a81d-61445aaa3762` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `e9b7a0f2-24ee-447f-ae0f-2258802c4211` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `8637d9f6-263b-46ef-8ec6-cca6a0a954f8` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `479b6ee5-4d8f-448d-ba01-50dbb2d5723c` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `c5a9b350-8b3f-4a2e-a9e3-260a8a6dd10b` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `a930778d-ceea-4cd1-9d1e-e144da54ebf8` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `88654287-9c4b-4933-b79b-47d0703e9ea7` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `ff4440bb-c113-4915-9dc7-31204d403712` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `f10f6f22-f433-43ce-9b2e-7edfce937f07` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `97bdf9b9-54c1-4573-ba61-17a4fe285d35` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `79affabd-97ec-4e42-985e-8a23d16e2fa5` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `25dcb347-430a-485a-86fe-72e7e03698d2` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `65b916fe-54ae-4352-b417-9a7e14d2f6f7` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `20dcb228-f7e6-4426-93a6-687129866152` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `e1a15a6f-f317-4ce7-89ea-433781b176bc` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `c82aa584-30e3-4a82-b978-f8eb201f520e` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `7bbb2b44-e99c-4b0b-9745-95c2e3f3ecac` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `325004b5-5e8b-43ca-95e1-c925ac889378` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `552de6eb-278d-40b6-a5a0-9674eda45fdb` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `8f6de2c8-015b-42fe-99f6-89894b78c4e2` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `f55bcfb1-63c5-4c39-9522-60801e06c4cd` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `ab1ed74c-1dcd-469d-bf94-1405cdc87edb` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `3a3f78a5-e1e5-40ff-9947-8a03d977171f` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `ca8a93c5-d15f-4509-9761-6c315aabea32` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `0eb8c56a-85bf-4f64-acce-f05bf7b4b523` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `c432daab-85e5-411e-8353-d59f5212ccb0` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `286d4663-0c2a-43e4-b03b-ec038170e436` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `1acdb772-6c2f-4515-9851-15ab62f7965b` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `4a4cd066-2fdd-4f29-a93a-e34875dde387` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `41d92139-0ef0-4cf0-a449-235ae29eecaa` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `343200b4-3a98-48ea-8ef7-18d9446738f2` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `ffe1fbce-4844-4937-a91a-26deaa2ae616` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `f2752835-2129-4b5c-aeed-a0e1346d5f91` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `1ec92a5a-5c29-4a23-a5f3-7ec1f3869d9d` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `acf59d85-990e-4e50-bbf1-4b1df12c113a` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `8600d1b9-d35b-45ae-a46d-52f51bf4256d` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `08360c05-45eb-4cc7-9679-74a46e84d269` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `6ea438ae-4ac3-434a-9a72-12ee8c7c8338` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `887f1bdd-9ea5-49a4-9905-8a76931d9c32` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `2f3062fa-86cf-496f-a87c-6eed3c1493f9` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `46bc9bde-b524-4ead-89dd-791b970572a2` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `43cd73d9-39e4-4aa7-8a9f-da3229b50a2a` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `f424895c-aece-4dec-a123-a800b478647c` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `5554628c-f784-41bb-937b-e8da8ec3566f` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `0e1c7b14-9462-4df1-84e0-1229362a847f` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `5911c39d-c440-45a5-a4c1-6bfeee613db7` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `402e85b5-e1d1-4dbc-aa62-371871685fe0` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `fdab9361-3fcd-44de-adf5-44fc35cfaf0a` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `e6ad9326-3def-4cf6-afad-a53d0bf64a24` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `1061db91-3b01-4b9a-bca0-04042125c043` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `0bd0c5f9-299d-4f84-a079-7a7d15732a3e` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `e64f2393-742b-43b3-b1a2-050b051062b6` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `a238ad9a-48bc-4f8e-bfa2-008d2c902b72` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `5de60a12-ddbc-4d61-b49a-33589d5eca65` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `4fc91552-af1a-4358-95ba-e373ebd1e9da` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `d1f9933c-3c0e-42bd-994b-2a63e1036145` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `d56e62fb-4c14-4c81-8141-d79c038dcbbb` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `9f69a943-7c7e-4a59-b8c4-564994a9055e` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `f85d879e-8fa2-4cdf-9699-a564423f4879` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `005168dc-d05f-4194-9085-65cb7c80f1fc` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `6d1e45f0-f5fb-43a2-8ccf-2ad591c1ddf0` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `ce09bb2a-e263-428e-b6d9-9d3ade835796` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `7bf5fd02-5a25-4286-8c98-13230adb812d` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `5ef67785-3756-4277-8e6e-907fa1abe923` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `63d36141-23b3-4300-a648-f518f9f376d9` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `0c1c6edf-d694-49c9-a995-478747ba7e23` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `dd891649-5497-494e-8035-b0170cafa50b` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `ef5ce817-fc6b-4061-b9c2-2935e81b58c1` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `df0b7b76-895b-420d-85ff-704f891765de` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `ade6939c-3d79-4a69-9d3a-399852d22930` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `277e1372-9e89-4685-9fa2-93b14dce4daf` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `1851672a-827a-4121-8351-50d330434def` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `e5351a2f-91d9-4947-a915-2d3bf1118050` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `6a85a0e5-f3ec-4d48-a016-7d4ce63f6b15` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `ad965e65-c9ad-4ad9-a5c0-54bc71369abc` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `25c33132-3616-4758-8a24-497a1d2745fb` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `30b2e77b-b82d-43f5-b445-1fe055f09fec` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `e3ba9339-b7ea-4fff-88a8-d21f14abec7b` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `8ecd243b-5bf5-44b4-a75c-b2a54ed2146c` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `c83d65a3-a9b3-4120-89cb-932959285ff2` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `cd7b8081-8eb8-4929-a300-850f32e21db3` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `94fc89a6-5b80-4376-8574-2d242e53870e` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `31cee2db-fafc-4bab-9614-5e99a907291b` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `fcf36067-7483-4aee-8a53-56c7e15b9c0b` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `4cf7ad16-cd48-424d-8a2d-8e831145008e` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `fb7d57a2-8ea9-4330-9db5-f5cfbb5822a1` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `95b2b1ec-490e-4ddd-ab5c-d42c143a90d8` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `26d81e2b-dcbd-45a2-8aca-19be2aafea80` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `3245bcbe-09ca-4cdd-afd4-fdac1aad892c` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `f2f33c35-e761-49c3-91cb-8dc6d03dd1fd` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `625beef0-eda8-4ab1-87f1-35b7cf53bf5e` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `37ecc1bb-197a-4e7b-b9c7-b95afadfc376` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `56dd51b4-503c-4b6a-b6a0-b3d2f06d9d89` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `d264c9d0-e556-440c-ad6e-ab8db53cd6e8` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `252067fd-f85c-4a8e-8728-a2d373368f97` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `1a574202-42d8-49ea-986a-05a93bf658b9` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `9778a34e-67de-4c2e-aa03-dd7175681c94` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `a8ccc700-dcda-4dc2-9ae5-45cab5db2e4b` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `7bb88162-c144-4d9e-a97e-e99c4a0893fa` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `f59302de-7977-4f27-b873-27659ad8e88c` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `3a338114-8efc-4b2a-9a7e-568406a7a9ea` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `60ae3207-2d07-419a-9e6a-c1832db5e0b7` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `d618f6d7-291e-485d-b03d-e30b874ee42f` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `4fa264d7-d824-4cb5-a327-6e0644031bc8` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `ec59b4c0-6d24-4781-a1bd-c0a3e204ac54` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `8647a31c-2ce5-4e43-a7f8-68941da327e0` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `719b0246-ec4a-4f0f-af68-e16816e450bb` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `bd4d1afa-5a3b-471b-a764-f339fbd82edf` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `a632bd29-1a67-449a-a503-f41af214ddaf` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `091ab262-4a3d-41fb-a1ce-3ec858bf8724` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `4e708d9c-a414-4c63-8925-6293cf52343f` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `40ddfada-ac23-4e72-9ec6-0e5f517c0c95` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `5bbd2d3d-0261-4967-a138-d460e1fb6c66` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_opportunity_candidates | `0c1a457d-ec74-4fe3-86c6-95998d7cd7a6` | ready_for_backlog | blocked | correlation:same_evidence_same_action |
| growth_work_items | `80cc1ed7-35a9-47cc-8043-77743476efea` | ready | blocked | correlation:measurement_window_open |
| growth_work_items | `d0b95550-8d6a-49bd-ae37-f5978dc72cff` | ready | blocked | correlation:same_evidence_same_action |
| growth_work_items | `c56696e1-24d2-4547-9838-9bb978b555e0` | ready | blocked | correlation:same_evidence_same_action |
| growth_work_items | `7b936e4c-413b-4070-b4e6-a7851a7ff7b7` | ready | blocked | correlation:same_evidence_same_action |
