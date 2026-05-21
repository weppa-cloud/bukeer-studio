import {
  GrowthMediaPackSchema,
  evaluateGrowthMediaPackReadiness,
} from "@bukeer/website-contract";

const scope = {
  account_id: "11111111-1111-4111-8111-111111111111",
  website_id: "22222222-2222-4222-8222-222222222222",
  locale: "es-CO",
  market: "CO",
};

const baseSlot = {
  slot_index: 1,
  section_key: "hero",
  visual_intent: "Spratt Bight beach hero with visible San Andres shoreline",
  status: "filled",
  image_url: "https://cdn.colombiatours.travel/media/san-andres-spratt-bight.webp",
  source_url: "https://colombiatours.travel/media-library/san-andres-spratt-bight",
  source_ref: "media_assets:asset-001",
  license_status: "approved",
  provenance_type: "first_party_media_library",
  destination_match: "pass",
  section_match: "pass",
  alt: "Playa Spratt Bight en San Andrés con mar turquesa",
  caption: "Spratt Bight, San Andrés",
  dimensions: { width: 1600, height: 1067 },
  hash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  duplicate_check: "unique",
  visual_quality_score: 92,
};

const makeSlots = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    ...baseSlot,
    slot_index: index + 1,
    source_ref: `media_assets:asset-${String(index + 1).padStart(3, "0")}`,
    hash: `sha256:${String(index + 1).padStart(64, "a")}`,
  }));

describe("Growth MediaPack contract", () => {
  it("accepts a traffic-ready pack with 25 approved real-image slots", () => {
    const pack = GrowthMediaPackSchema.parse({
      ...scope,
      pack_version: "growth-media-pack-v1",
      requested_by: "growth-content-agent",
      owned_by_lane: "growth-media-agent",
      canonical_url: "https://colombiatours.travel/blog/san-andres",
      keyword: "San Andrés Colombia",
      destination_entities: ["San Andrés", "Spratt Bight"],
      target_image_count: 25,
      required_visual_intents: makeSlots(25).map((slot) => ({
        section_key: slot.section_key,
        visual_intent: slot.visual_intent,
        required_count: 1,
      })),
      slots: makeSlots(25),
      human_approved_exception: null,
      generated_at: "2026-05-20T23:00:00.000Z",
    });

    const readiness = evaluateGrowthMediaPackReadiness(pack);

    expect(pack.slots).toHaveLength(25);
    expect(readiness.status).toBe("traffic_ready");
    expect(readiness.filled_approved_slots).toBe(25);
  });

  it("holds traffic readiness when only 4 slots are filled and the remaining benchmark slots are missing", () => {
    const slots = [
      ...makeSlots(4),
      ...Array.from({ length: 21 }, (_, index) => ({
        slot_index: index + 5,
        section_key: "body",
        visual_intent: `Required San Andres supporting visual ${index + 1}`,
        status: "missing",
        license_status: "missing",
        provenance_type: "not_sourced",
        destination_match: "unknown",
        section_match: "unknown",
        duplicate_check: "not_checked",
        visual_quality_score: null,
      })),
    ];

    const pack = GrowthMediaPackSchema.parse({
      ...scope,
      pack_version: "growth-media-pack-v1",
      requested_by: "growth-content-agent",
      owned_by_lane: "growth-media-agent",
      canonical_url: "https://colombiatours.travel/blog/san-andres",
      keyword: "San Andrés Colombia",
      destination_entities: ["San Andrés"],
      target_image_count: 25,
      required_visual_intents: [],
      slots,
      generated_at: "2026-05-20T23:00:00.000Z",
    });

    const readiness = evaluateGrowthMediaPackReadiness(pack);

    expect(readiness.status).toBe("hold_scale");
    expect(readiness.filled_approved_slots).toBe(4);
    expect(readiness.missing_slots).toBe(21);
  });

  it("does not let a human exception override missing explicit slots", () => {
    const slots = [
      ...makeSlots(4),
      ...Array.from({ length: 21 }, (_, index) => ({
        slot_index: index + 5,
        section_key: "body",
        visual_intent: `Required San Andres supporting visual ${index + 1}`,
        status: "missing",
        license_status: "missing",
        provenance_type: "not_sourced",
        destination_match: "unknown",
        section_match: "unknown",
        duplicate_check: "not_checked",
        visual_quality_score: null,
      })),
    ];

    const pack = GrowthMediaPackSchema.parse({
      ...scope,
      pack_version: "growth-media-pack-v1",
      requested_by: "growth-content-agent",
      owned_by_lane: "growth-media-agent",
      canonical_url: "https://colombiatours.travel/blog/san-andres",
      keyword: "San Andrés Colombia",
      destination_entities: ["San Andrés"],
      target_image_count: 25,
      required_visual_intents: [],
      slots,
      human_approved_exception: {
        approved_by: "SEO Council",
        approved_at: "2026-05-20T23:30:00.000Z",
        reason: "Temporary launch exception still cannot hide missing slots.",
        minimum_publishable_slots: 4,
      },
      generated_at: "2026-05-20T23:00:00.000Z",
    });

    const readiness = evaluateGrowthMediaPackReadiness(pack);

    expect(readiness.status).toBe("hold_scale");
    expect(readiness.blockers).toContain("missing_slots");
  });

  it("rejects Google image candidates without license proof as publishable slots", () => {
    const parsed = GrowthMediaPackSchema.safeParse({
      ...scope,
      pack_version: "growth-media-pack-v1",
      requested_by: "growth-content-agent",
      owned_by_lane: "growth-media-agent",
      canonical_url: "https://colombiatours.travel/blog/san-andres",
      keyword: "San Andrés Colombia",
      destination_entities: ["San Andrés"],
      target_image_count: 1,
      required_visual_intents: [],
      slots: [
        {
          ...baseSlot,
          source_url: "https://www.google.com/maps/contrib/example/photo",
          source_ref: "google_places:photo_reference:abc123",
          license_status: "reference_only",
          provenance_type: "google_places_discovery",
        },
      ],
      generated_at: "2026-05-20T23:00:00.000Z",
    });

    expect(parsed.success).toBe(false);
  });

  it("allows reference-only Google imagery only as a visual brief that still requires a publishable base", () => {
    const pack = GrowthMediaPackSchema.parse({
      ...scope,
      pack_version: "growth-media-pack-v1",
      requested_by: "growth-content-agent",
      owned_by_lane: "growth-media-agent",
      canonical_url: "https://colombiatours.travel/blog/san-andres",
      keyword: "San Andrés Colombia",
      destination_entities: ["San Andrés"],
      target_image_count: 1,
      required_visual_intents: [],
      slots: [
        {
          slot_index: 1,
          section_key: "hero",
          visual_intent: "Spratt Bight factual visual brief",
          status: "needs_human_asset",
          license_status: "reference_only",
          provenance_type: "google_places_discovery",
          source_url: "https://www.google.com/maps/contrib/example/photo",
          source_ref: "google_places:photo_reference:abc123",
          destination_match: "pass",
          section_match: "pass",
          duplicate_check: "not_checked",
          visual_quality_score: null,
          reference_only_visual_brief: {
            allowed: true,
            non_publishable_source_url: "https://www.google.com/maps/contrib/example/photo",
            factual_observations: ["turquoise water", "urban beachfront"],
          },
          publishable_base_required: true,
          generated_or_edited_final: null,
          reality_preservation_pass: false,
        },
      ],
      generated_at: "2026-05-20T23:00:00.000Z",
    });

    const readiness = evaluateGrowthMediaPackReadiness(pack);

    expect(readiness.status).toBe("hold_scale");
    expect(readiness.blockers).toContain("publishable_base_required");
  });

  it("rejects AI-assisted derivatives that change destination reality or are based on reference-only pixels", () => {
    const parsed = GrowthMediaPackSchema.safeParse({
      ...scope,
      pack_version: "growth-media-pack-v1",
      requested_by: "growth-content-agent",
      owned_by_lane: "growth-media-agent",
      canonical_url: "https://colombiatours.travel/blog/san-andres",
      keyword: "San Andrés Colombia",
      destination_entities: ["San Andrés"],
      target_image_count: 1,
      required_visual_intents: [],
      slots: [
        {
          ...baseSlot,
          provenance_type: "ai_assisted_real_photo_derivative",
          license_status: "approved",
          generated_or_edited_final: {
            model: "image-editor-v1",
            base_provenance_type: "google_places_discovery",
            base_license_status: "reference_only",
            editing_actions: ["replace cloudy sky with impossible mountains"],
            disclosure_label: "AI-assisted real-photo derivative",
          },
          reality_preservation_pass: false,
        },
      ],
      generated_at: "2026-05-20T23:00:00.000Z",
    });

    expect(parsed.success).toBe(false);
  });
});
