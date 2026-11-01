import type { Page } from "@playwright/test";

declare global {
  interface Window {
    resizeTestKeyboard: (height: number, offsetTop?: number, scale?: number) => void;
  }
}

// Browser automation cannot open an OS keyboard. Exercise Safari's separate
// visual viewport explicitly; the layout-resize path is tested with real resizing.
export async function mockVisualViewport(page: Page) {
  await page.addInitScript(() => {
    let height = innerHeight;
    let offsetTop = 0;
    let scale = 1;
    const viewport = new EventTarget();
    Object.defineProperties(viewport, {
      height: { get: () => height },
      width: { get: () => innerWidth },
      offsetTop: { get: () => offsetTop },
      scale: { get: () => scale },
    });
    Object.defineProperty(window, "visualViewport", { configurable: true, value: viewport });
    window.resizeTestKeyboard = (nextHeight, nextTop = 0, nextScale = 1) => {
      height = nextHeight;
      offsetTop = nextTop;
      scale = nextScale;
      viewport.dispatchEvent(new Event("resize"));
    };
  });
}
