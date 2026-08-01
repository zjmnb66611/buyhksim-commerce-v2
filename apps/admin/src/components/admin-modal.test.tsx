/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminModal } from "./admin-modal";

afterEach(cleanup);

describe("AdminModal", () => {
  it("exposes a readable dialog and closes with Escape", () => {
    const onClose = vi.fn();
    render(<AdminModal title="编辑记录" onClose={onClose}><label>名称<input autoFocus /></label></AdminModal>);
    expect(screen.getByRole("dialog").getAttribute("aria-modal")).toBe("true");
    expect(screen.getByRole("heading", { name: "编辑记录" })).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when the overlay itself is clicked", () => {
    const onClose = vi.fn();
    render(<AdminModal title="编辑记录" onClose={onClose}>内容</AdminModal>);
    fireEvent.mouseDown(screen.getByRole("dialog").parentElement!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
