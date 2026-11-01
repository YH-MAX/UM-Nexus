"use client";

import { type RefObject, useEffect } from "react";

// Safari resizes the visual viewport; Chrome may resize the layout viewport.
// Only treat a substantial resize while editing as a keyboard, never pinch zoom.
export function useMobileViewport(rootRef: RefObject<HTMLElement>, route: string) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const viewport = window.visualViewport;
    let baseline = window.innerHeight;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const active = document.activeElement;
        const editing = active instanceof HTMLElement && active.matches('textarea, input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="button"]):not([type="submit"]), [contenteditable="true"]');
        const height = viewport?.height ?? window.innerHeight;
        const top = viewport?.offsetTop ?? 0;
        if (!editing) baseline = window.innerHeight;
        const keyboard = editing && (viewport?.scale ?? 1) <= 1.05 && baseline - height > 120;
        const inset = keyboard ? Math.max(0, window.innerHeight - height - top) : 0;
        root.dataset.keyboardOpen = String(keyboard);
        root.style.setProperty("--keyboard-inset", `${inset}px`);
        root.style.setProperty("--visible-height", `${height}px`);
        root.style.setProperty("--viewport-top", `${top}px`);
        if (!editing || window.innerWidth >= 1024 || !keyboard) return;
        if (active.closest("dialog[open]")) {
          active.scrollIntoView({ block: "nearest", behavior: "instant" });
          return;
        }
        const field = active.getBoundingClientRect();
        const bar = root.querySelector<HTMLElement>(".nexus-mobile-actions");
        const bottom = top + height - (bar?.getBoundingClientRect().height ?? 0) - 12;
        const header = root.querySelector<HTMLElement>(".nexus-header");
        const visibleTop = top + (header?.getBoundingClientRect().height ?? 0) + 8;
        if (field.bottom > bottom) window.scrollBy({ top: field.bottom - bottom, behavior: "instant" });
        else if (field.top < visibleTop) window.scrollBy({ top: field.top - visibleTop, behavior: "instant" });
      });
    };
    const rotate = () => { baseline = window.innerHeight; update(); };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", rotate);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", rotate);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
    };
  }, [rootRef, route]);
}
