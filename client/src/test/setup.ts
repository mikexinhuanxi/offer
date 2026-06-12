import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

const svgElementPrototype = SVGElement.prototype as SVGElement & {
  getComputedTextLength?: () => number;
};

if (!svgElementPrototype.getComputedTextLength) {
  svgElementPrototype.getComputedTextLength = () => 260;
}

afterEach(() => {
  cleanup();
});
