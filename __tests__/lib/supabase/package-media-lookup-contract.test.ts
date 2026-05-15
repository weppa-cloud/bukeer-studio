import { readFileSync } from "fs";
import path from "path";

describe("package media lookup contract", () => {
  const sourcePath = path.join(process.cwd(), "lib/supabase/get-pages.ts");

  it("does not call generic image RPC for package activity/hotel itinerary items", () => {
    const source = readFileSync(sourcePath, "utf8");

    expect(source).toContain("function needsGenericPackageMediaLookup");
    expect(source).toContain("!isActivityLikeProductType(productType)");
    expect(source).toContain("!isHotelLikeProductType(productType)");
    expect(source).toContain("!isTransferLikeProductType(productType)");
    expect(source).toContain('.from("transfers")');
    expect(source).toContain("genericMediaLookupProductIds.map");
    expect(source).not.toContain("productIds.map(async (productId) =>");
  });
});
