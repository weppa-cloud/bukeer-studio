import { readFileSync } from "node:fs";
import path from "node:path";

describe("Cloudflare static asset headers", () => {
  it("keeps LCP and Next static assets immutable at the Workers static-assets layer", () => {
    const headers = readFileSync(
      path.join(process.cwd(), "public/_headers"),
      "utf8",
    );

    for (const pattern of ["/_next/static/*", "/tenant-assets/*", "/tenant-icons/*"]) {
      expect(headers).toContain(pattern);
    }

    expect(headers).toContain(
      "Cache-Control: public,max-age=31536000,immutable",
    );
  });
});
