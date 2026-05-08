import {
  extractRollbackRestore,
  planTechnicalRemediation,
} from "@/lib/growth/autonomy/technical-remediation-adapter";

const ids = {
  accountId: "11111111-1111-4111-8111-111111111111",
  websiteId: "22222222-2222-4222-8222-222222222222",
  workItemId: "33333333-3333-4333-8333-333333333333",
  changeSetId: "44444444-4444-4444-8444-444444444444",
  targetId: "55555555-5555-4555-8555-555555555555",
};

describe("technical remediation adapter", () => {
  it("builds a safe website_pages dry-run job with smoke and outcomes", () => {
    const plan = planTechnicalRemediation({
      ...ids,
      targetTable: "website_pages",
      beforeRow: {
        seo_title: "Old Colombia travel page title",
        seo_description: "Old page description with enough length to be valid.",
        robots_noindex: true,
      },
      patch: {
        seo_title: "Colombia travel packages crafted by local experts",
        seo_description:
          "Plan a custom Colombia trip with local experts, curated routes, and reliable support before and during travel.",
        robots_noindex: false,
      },
      now: new Date("2026-05-07T12:00:00.000Z"),
    });

    expect(plan.smoke.pass).toBe(true);
    expect(plan.job.lane).toBe("technical_remediation");
    expect(plan.job.action_class).toBe("safe_apply");
    expect(plan.job.status).toBe("dry_run_ready");
    expect(plan.job.target_table).toBe("website_pages");
    expect(plan.job.evaluation_date).toBe("2026-05-14");
    expect(plan.job.rollback_payload).toMatchObject({
      table: "website_pages",
      target_id: ids.targetId,
      restore: {
        seo_title: "Old Colombia travel page title",
        seo_description: "Old page description with enough length to be valid.",
        robots_noindex: true,
      },
    });
    expect(plan.outcomes.map((outcome) => outcome.evaluation_window)).toEqual([
      "immediate",
      "day_7",
      "day_28",
    ]);
  });

  it("blocks forbidden pricing or paid fields", () => {
    const plan = planTechnicalRemediation({
      ...ids,
      targetTable: "website_pages",
      beforeRow: { seo_title: "Old title", price: 100 },
      patch: {
        seo_title: "Colombia trips for private custom vacations",
        price: 80,
      },
    });

    expect(plan.smoke.pass).toBe(false);
    expect(plan.job.status).toBe("blocked");
    expect(plan.smoke.failures).toContain("field_not_allowed:price");
    expect(plan.smoke.failures).toContain("forbidden_field:price");
  });

  it("rejects non-technical content publication targets", () => {
    expect(() =>
      planTechnicalRemediation({
        ...ids,
        targetTable: "website_blog_posts" as never,
        beforeRow: { seo_title: "Old title" },
        patch: { seo_title: "New title with a safe length" },
      }),
    ).toThrow("technical_remediation does not publish content");
  });

  it("extracts rollback restore only for supported safe fields", () => {
    const restore = extractRollbackRestore({
      table: "product_seo_overrides",
      target_id: ids.targetId,
      restore: {
        meta_title: "Old product title",
        meta_desc: "Old product meta description.",
      },
    });

    expect(restore).toEqual({
      table: "product_seo_overrides",
      targetId: ids.targetId,
      restore: {
        meta_title: "Old product title",
        meta_desc: "Old product meta description.",
      },
    });
  });

  it("rejects rollback restore for unsafe fields", () => {
    expect(() =>
      extractRollbackRestore({
        table: "product_seo_overrides",
        target_id: ids.targetId,
        restore: { price: 100 },
      }),
    ).toThrow("Rollback field not allowed: price");
  });
});
