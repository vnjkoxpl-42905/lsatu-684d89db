import { describe, expect, it } from "vitest";
import { SIDEBAR_CATALOG } from "./layoutCatalog";
import { defaultLayout } from "./layoutPresets";

describe("mainhub sidebar bootcamp navigation", () => {
  it("includes bootcamps in the sidebar catalog with the bootcamp access flag", () => {
    expect(SIDEBAR_CATALOG).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "/bootcamps",
          to: "/bootcamps",
          label: "Bootcamps",
          requires: "has_bootcamp_access",
        }),
      ]),
    );
  });

  it("keeps bootcamps in the default sidebar layout", () => {
    expect(defaultLayout().sidebar).toContain("/bootcamps");
  });
});
