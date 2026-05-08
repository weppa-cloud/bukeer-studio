import { planContentPublication } from "@/lib/growth/autonomy/content-publication-adapter";

const ids = {
  accountId: "11111111-1111-4111-8111-111111111111",
  websiteId: "22222222-2222-4222-8222-222222222222",
  workItemId: "33333333-3333-4333-8333-333333333333",
  changeSetId: "44444444-4444-4444-8444-444444444444",
};

const content = Array.from({ length: 320 }, (_, index) =>
  index % 9 === 0 ? "Colombia" : "travel",
).join(" ");

describe("content publication adapter", () => {
  it("builds a content_publish job for a new organic blog article", () => {
    const plan = planContentPublication({
      ...ids,
      article: {
        title: "Best Colombia itinerary ideas for first-time travelers",
        slug: "best-colombia-itinerary-ideas",
        content,
        excerpt: "Plan a thoughtful Colombia route with local context.",
        seo_title: "Best Colombia Itinerary Ideas for First-Time Travelers",
        seo_description:
          "Explore Colombia itinerary ideas with local context, route planning tips, and practical guidance for a smoother custom trip.",
        seo_keywords: ["Colombia itinerary", "Colombia travel"],
      },
      now: new Date("2026-05-07T12:00:00.000Z"),
    });

    expect(plan.smoke.pass).toBe(true);
    expect(plan.job.lane).toBe("content_creator");
    expect(plan.job.action_class).toBe("content_publish");
    expect(plan.job.target_table).toBe("website_blog_posts");
    expect(plan.job.target_id).toBeNull();
    expect(plan.job.target_path).toBe("/blog/best-colombia-itinerary-ideas");
    expect(plan.job.rollback_payload).toMatchObject({
      table: "website_blog_posts",
      target_id: null,
      delete_created_slug: "best-colombia-itinerary-ideas",
    });
    expect(plan.outcomes.map((outcome) => outcome.evaluation_window)).toEqual([
      "day_21",
      "day_45",
    ]);
  });

  it("blocks thin content and unsafe commercial mutation language", () => {
    const plan = planContentPublication({
      ...ids,
      article: {
        title: "Short Colombia article",
        slug: "short-colombia-article",
        content: "Too short",
        seo_title: "Short Colombia Travel Article",
        seo_description:
          "This short description is long enough but the content tries to mention pricing and paid campaign changes.",
      },
    });

    expect(plan.smoke.pass).toBe(false);
    expect(plan.job.status).toBe("blocked");
    expect(plan.smoke.failures).toContain("content_too_thin");
    expect(plan.smoke.failures).toContain(
      "forbidden_commercial_mutation_language",
    );
  });
});
