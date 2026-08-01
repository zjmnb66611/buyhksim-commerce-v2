import { describe, expect, it } from "vitest";
import { formatLocale, translate } from "./index";

describe("global translations", () => {
  it("translates storefront copy into English and Traditional Chinese", () => {
    expect(translate("en", "购物车")).toBe("Cart");
    expect(translate("zh-HK", "安全结算")).toBe("安全結算");
  });

  it("interpolates values without losing the selected locale", () => {
    expect(translate("en", "共找到 {count} 个套餐", { count: 5 })).toBe("5 plans found");
  });

  it("falls back to the source copy and exposes an Intl-compatible locale", () => {
    expect(translate("en", "BUYHKSIM")).toBe("BUYHKSIM");
    expect(formatLocale("en")).toBe("en-US");
    expect(formatLocale("zh-HK")).toBe("zh-HK");
  });
});
