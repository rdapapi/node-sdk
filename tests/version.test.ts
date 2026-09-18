import { describe, it, expect } from "vitest";

import manifest from "../package.json";
import { VERSION } from "../src/version.js";

// VERSION feeds the User-Agent, so a release that bumps only package.json ships
// a package announcing the previous version. That has happened twice.
describe("VERSION", () => {
  it("matches the version in package.json", () => {
    expect(VERSION).toBe(manifest.version);
  });
});
