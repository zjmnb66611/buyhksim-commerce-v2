"use client";

import React, { useEffect, useId, useRef } from "react";
import { X } from "@phosphor-icons/react";

const focusableSelector = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

export function AdminModal({ title, onClose, children, maxWidth = "max-w-3xl" }: { title: string; onClose: () => void; children: React.ReactNode; maxWidth?: string }) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    const firstFocusable = panel?.querySelector<HTMLElement>(focusableSelector);
    (firstFocusable ?? panel)?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector));
      if (!focusable.length) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  return <div className="app-overlay fixed inset-0 z-50 grid place-items-center p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={`modal-surface max-h-[92vh] w-full ${maxWidth} overflow-y-auto rounded-2xl shadow-2xl`}>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface-raised)] p-5">
        <h2 id={titleId} className="text-xl font-black">{title}</h2>
        <button type="button" onClick={onClose} aria-label="关闭弹窗" className="grid h-10 w-10 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--wash)] hover:text-[var(--ink)]"><X size={23} /></button>
      </header>
      <div className="p-5">{children}</div>
    </section>
  </div>;
}
