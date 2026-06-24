import { afterEach, describe, expect, it } from "vitest";

import { AnlyxDevOverlay, getAnlyxDevOverlayScriptSrc } from "./next.js";

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
});

describe("Anlyx Next.js helper", () => {
  it("renders the local capture helper script in development", () => {
    process.env.NODE_ENV = "development";

    const element = AnlyxDevOverlay();

    expect(element).toMatchObject({
      type: "script",
      props: {
        src: "http://localhost:4777/_anlyx/overlay.js",
        defer: true,
        "data-anlyx-dev-overlay": "true"
      }
    });
  });

  it("does not render in production", () => {
    process.env.NODE_ENV = "production";

    expect(AnlyxDevOverlay()).toBeNull();
  });

  it("allows overriding the runtime URL", () => {
    expect(getAnlyxDevOverlayScriptSrc("http://localhost:4999")).toBe(
      "http://localhost:4999/_anlyx/overlay.js"
    );
  });
});
