
import { beforeEach, describe, expect, it } from "vitest";

import {
  beginComponentRender,
  clearComponentRegistry,
  endComponentRender,
  getRegisteredComponents,
  getComponentRecord,
  unregisterComponent
} from "../src/devtools/componentRegistry.js";

describe("runtime component registry", () => {
  beforeEach(() => clearComponentRegistry());

  it("registers components automatically and records their parent-child relation", () => {
    function App() {}
    function Counter() {}

    beginComponentRender(App, {}, { kind: "Root component" });
    beginComponentRender(Counter, { start: 2 });
    endComponentRender(Counter, [{ index: 1, type: "state", value: 2 }]);
    endComponentRender(App, []);

    const components = getRegisteredComponents();

    expect(components.map(component => component.name))
      .toEqual(["App", "Counter"]);

    expect(components[0].children).toEqual(["Counter"]);
    expect(components[1].parent).toBe("App");
    expect(components[1].props.start).toBe(2);
    expect(components[1].hooks[0].value).toBe(2);
  });

  it("increments render counts on repeat renders", () => {
    function Counter() {}

    for (let index = 0; index < 3; index += 1) {
      beginComponentRender(Counter);
      endComponentRender(Counter, []);
    }

    expect(getRegisteredComponents()[0].renderCount).toBe(3);
  });

  it("records a non-negative render duration", () => {
    function Counter() {}

    beginComponentRender(Counter);
    endComponentRender(Counter);

    expect(
      getRegisteredComponents()[0].lastRenderDurationMs
    ).toBeGreaterThanOrEqual(0);
  });

  it("identifies the initial render reason", () => {
    function Counter() {}

    beginComponentRender(Counter);
    endComponentRender(Counter, []);

    expect(getRegisteredComponents()[0].renderReason)
      .toBe("initial render");
  });

  it("identifies changed props as the render reason", () => {
    function Counter() {}

    beginComponentRender(Counter, { count: 1 });
    endComponentRender(Counter, []);

    beginComponentRender(Counter, { count: 2 });
    endComponentRender(Counter, []);

    const record = getRegisteredComponents()[0];

    expect(record.renderReason).toBe("props changed");
    expect(record.changes).toHaveLength(1);
    expect(record.changes[0].property).toBe("count");
  });

  it("tracks individual component instances separately", () => {
    function Counter() {}

    beginComponentRender(Counter, {}, { instanceId: "counter-1" });
    endComponentRender(Counter, []);

    beginComponentRender(Counter, {}, { instanceId: "counter-2" });
    endComponentRender(Counter, []);

    expect(getRegisteredComponents()).toHaveLength(2);
    expect(getComponentRecord("counter-1").renderCount).toBe(1);
    expect(getComponentRecord("counter-2").renderCount).toBe(1);
  });

  it("returns null for an unknown component instance", () => {
    expect(getComponentRecord("missing-component")).toBeNull();
  });

  it("unregisters a component instance", () => {
    function Counter() {}

    beginComponentRender(Counter, {}, { instanceId: "counter-1" });
    endComponentRender(Counter, []);

    unregisterComponent("counter-1");

    expect(getComponentRecord("counter-1")).toBeNull();
    expect(getRegisteredComponents()).toHaveLength(0);
  });

  it("clears the complete component registry", () => {
    function App() {}
    function Counter() {}

    beginComponentRender(App);
    endComponentRender(App, []);

    beginComponentRender(Counter);
    endComponentRender(Counter, []);

    clearComponentRegistry();

    expect(getRegisteredComponents()).toHaveLength(0);
  });
});
