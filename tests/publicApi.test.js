import { describe, expect, it } from "vitest";
import * as ElNexo from "../src/index.js";

describe("El Nexo public API", () => {
  it("exposes the VDOM API", () => {
    expect(typeof ElNexo.createElement).toBe("function");
    expect(typeof ElNexo.render).toBe("function");
    expect(typeof ElNexo.reconcile).toBe("function");
  });

  it("exposes state hooks", () => {
    expect(typeof ElNexo.useState).toBe("function");
    expect(typeof ElNexo.useEffect).toBe("function");
    expect(typeof ElNexo.useMemo).toBe("function");
  });

  it("exposes Fiber and DevTools entry points", () => {
    expect(typeof ElNexo.createFiber).toBe("function");
    expect(typeof ElNexo.buildFiberTree).toBe("function");
    expect(typeof ElNexo.commitRoot).toBe("function");
    expect(typeof ElNexo.getRegisteredComponents).toBe("function");
    expect(typeof ElNexo.renderFiberInspector).toBe("function");
  });
});
