// @vitest-environment jsdom

import { act, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { StorefrontProvider } from "../components/storefront-provider";
import { useCommerceStore } from "../store/commerce-store";
import { useTranslations } from "./use-translations";

function Probe() {
  const { t } = useTranslations();
  return <span>{t("安全结算")}</span>;
}

describe("storefront language switching", () => {
  beforeEach(() => useCommerceStore.setState({ locale: "zh-CN", theme: "light" }));

  it("updates mounted content when the global locale changes", () => {
    render(<Probe />);
    expect(screen.getByText("安全结算")).toBeTruthy();
    act(() => useCommerceStore.getState().setLocale("en"));
    expect(screen.getByText("Secure checkout")).toBeTruthy();
    act(() => useCommerceStore.getState().setLocale("zh-HK"));
    expect(screen.getByText("安全結算")).toBeTruthy();
  });

  it("synchronizes the document language and title", async () => {
    render(<StorefrontProvider><Probe /></StorefrontProvider>);
    act(() => useCommerceStore.getState().setLocale("en"));
    await waitFor(() => expect(document.documentElement.lang).toBe("en"));
    expect(document.title).toBe("BUYHKSIM | Global SIM & eSIM Store");
  });
});
