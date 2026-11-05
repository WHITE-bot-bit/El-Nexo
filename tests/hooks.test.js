
/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  beginComponent,
  endComponent,
  setUpdateCallback,
  useEffect,
  useMemo,
  useState,
  resetHooks,
  getComponentHookSnapshot,
} from "../src/core/state.js";

import { createElement } from "../src/vdom/createElement.js";
import { buildFiberTree } from "../src/fiber/fiber.js";
import { workLoop } from "../src/fiber/workLoop.js";
import { commitRoot } from "../src/fiber/commitWork.js";

describe("El Nexo Hooks", () => {
  beforeEach(() => {
    setUpdateCallback(null);
    resetHooks();
  });

  // --------------------------------------------------
  // useState
  // --------------------------------------------------

  it("supports multiple state hooks", () => {
    function Counter() {
      const [count, setCount] = useState(0);
      const [name, setName] = useState("El Nexo");

      return { count, setCount, name, setName };
    }

    beginComponent(Counter);

    let result;

    try {
      result = Counter();
    } finally {
      endComponent();
    }

    result.setCount(3);
    result.setName("Updated");

    beginComponent(Counter);

    try {
      const next = Counter();

      expect(next.count).toBe(3);
      expect(next.name).toBe("Updated");
    } finally {
      endComponent();
    }
  });

  // --------------------------------------------------
  // useEffect
  // --------------------------------------------------

  it("runs effects after rendering", () => {
    const effect = vi.fn();

    beginComponent("EffectTest");

    try {
      useEffect(effect, []);

      expect(effect).not.toHaveBeenCalled();
    } finally {
      endComponent();
    }

    expect(effect).toHaveBeenCalledTimes(1);
  });

  it("does not rerun an effect when dependencies are unchanged", () => {
    const effect = vi.fn();

    for (let index = 0; index < 2; index += 1) {
      beginComponent("StableEffect");

      try {
        useEffect(effect, [1]);
      } finally {
        endComponent();
      }
    }

    expect(effect).toHaveBeenCalledTimes(1);
  });

  it("cleans up before rerunning an effect", () => {
    const calls = [];

    function renderEffect(value) {
      beginComponent("CleanupEffect");

      try {
        useEffect(() => {
          calls.push(`run ${value}`);

          return () => calls.push(`cleanup ${value}`);
        }, [value]);
      } finally {
        endComponent();
      }
    }

    renderEffect(1);
    renderEffect(2);

    expect(calls).toEqual([
      "run 1",
      "cleanup 1",
      "run 2",
    ]);
  });

  // --------------------------------------------------
  // useMemo
  // --------------------------------------------------

  it("memoizes values until dependencies change", () => {
    const factory = vi.fn((value) => value * 2);

    function renderMemo(value) {
      beginComponent("MemoTest");

      try {
        return useMemo(() => factory(value), [value]);
      } finally {
        endComponent();
      }
    }

    expect(renderMemo(2)).toBe(4);
    expect(renderMemo(2)).toBe(4);

    expect(factory).toHaveBeenCalledTimes(1);

    expect(renderMemo(3)).toBe(6);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  // --------------------------------------------------
  // Hook instance identity
  // --------------------------------------------------

  it("keeps state isolated between component instances", () => {
    function Counter() {
      const [count, setCount] = useState(0);

      return { count, setCount };
    }

    beginComponent("CounterA");

    let counterA;

    try {
      counterA = Counter();
    } finally {
      endComponent();
    }

    beginComponent("CounterB");

    let counterB;

    try {
      counterB = Counter();
    } finally {
      endComponent();
    }

    counterA.setCount(5);

    beginComponent("CounterA");

    try {
      expect(Counter().count).toBe(5);
    } finally {
      endComponent();
    }

    beginComponent("CounterB");

    try {
      expect(Counter().count).toBe(0);
    } finally {
      endComponent();
    }

    expect(counterB.count).toBe(0);
  });

  // --------------------------------------------------
  // Fiber + Hooks integration
  // --------------------------------------------------

  describe("Fiber and Hooks integration", () => {
    let container;

    function renderFiber(vnode, alternate = null) {
      const fiber = buildFiberTree(
        vnode,
        null,
        (component, props, metadata) => {
          const componentId = metadata.instanceId || component;

          beginComponent(componentId);

          try {
            return component(props);
          } finally {
            endComponent();
          }
        },
        "root",
        alternate,
      );

      workLoop(fiber);
      commitRoot(fiber, container);

      return fiber;
    }

    beforeEach(() => {
      container = document.createElement("div");
    });

    it("preserves component state across Fiber updates", () => {
      let setCount;

      function Counter() {
        const [count, updateCount] = useState(0);

        setCount = updateCount;

        return createElement(
          "p",
          { "data-counter": "main" },
          `Count: ${count}`,
        );
      }

      const oldVNode = createElement(Counter, {});
      const oldFiber = renderFiber(oldVNode);

      expect(container.textContent).toBe("Count: 0");

      setCount(3);

      const newVNode = createElement(Counter, {});
      const newFiber = renderFiber(newVNode, oldFiber);

      expect(container.textContent).toBe("Count: 3");
      expect(newFiber.instanceId).toBe(oldFiber.instanceId);
    });

    it("preserves independent state between two Fiber component instances", () => {
      const setters = {};

      function Counter(props) {
        const [count, setCount] = useState(0);

        setters[props.id] = setCount;

        return createElement(
          "p",
          { "data-counter": props.id },
          `${props.id}: ${count}`,
        );
      }

      function App() {
        return createElement(
          "div",
          null,
          createElement(Counter, { id: "A", key: "A" }),
          createElement(Counter, { id: "B", key: "B" }),
        );
      }

      const oldFiber = renderFiber(createElement(App, {}));

      setters.A(4);
      setters.B(7);

      const newFiber = renderFiber(createElement(App, {}), oldFiber);

      expect(
        container.querySelector('[data-counter="A"]').textContent,
      ).toBe("A: 4");

      expect(
        container.querySelector('[data-counter="B"]').textContent,
      ).toBe("B: 7");

      const appFiber = newFiber.child;
      const firstCounterFiber = appFiber.child;
      const secondCounterFiber = firstCounterFiber.sibling;

      expect(firstCounterFiber).not.toBeNull();
      expect(secondCounterFiber).not.toBeNull();

      expect(firstCounterFiber.instanceId).not.toBe(
        secondCounterFiber.instanceId,
      );
    });

    it("preserves a component's state when a sibling is added", () => {
      let setCount;

      function Counter() {
        const [count, updateCount] = useState(0);

        setCount = updateCount;

        return createElement(
          "p",
          { "data-counter": "main" },
          `Count: ${count}`,
        );
      }

      function Extra() {
        return createElement("span", null, "Extra");
      }

      const oldVNode = createElement(
        "div",
        null,
        createElement(Counter, { key: "counter" }),
      );

      const oldFiber = renderFiber(oldVNode);

      setCount(8);

      const newVNode = createElement(
        "div",
        null,
        createElement(Counter, { key: "counter" }),
        createElement(Extra, { key: "extra" }),
      );

      renderFiber(newVNode, oldFiber);

      expect(
        container.querySelector('[data-counter="main"]').textContent,
      ).toBe("Count: 8");

      expect(container.textContent).toContain("Extra");
    });

    it("preserves a component's state when a sibling is removed", () => {
      let setCount;

      function Counter() {
        const [count, updateCount] = useState(0);

        setCount = updateCount;

        return createElement(
          "p",
          { "data-counter": "main" },
          `Count: ${count}`,
        );
      }

      function Extra() {
        return createElement("span", { "data-extra": true }, "Extra");
      }

      const oldVNode = createElement(
        "div",
        null,
        createElement(Counter, { key: "counter" }),
        createElement(Extra, { key: "extra" }),
      );

      const oldFiber = renderFiber(oldVNode);

      setCount(9);

      const newVNode = createElement(
        "div",
        null,
        createElement(Counter, { key: "counter" }),
      );

      renderFiber(newVNode, oldFiber);

      expect(
        container.querySelector('[data-counter="main"]').textContent,
      ).toBe("Count: 9");

      expect(container.querySelector("[data-extra]")).toBeNull();
    });

    it("retains the hook snapshot for a component instance", () => {
      function Counter() {
        useState(10);
        useState("El Nexo");

        return createElement("p", null, "Counter");
      }

      const fiber = renderFiber(createElement(Counter, {}));

      const snapshot = getComponentHookSnapshot(fiber.instanceId);

      expect(snapshot).toHaveLength(2);
    });

    // --------------------------------------------------
    // Component lifecycle tests
    // --------------------------------------------------

    it("mounts a component and initializes its hooks", () => {
      function Counter() {
        const [count] = useState(5);

        return createElement("p", null, `Count: ${count}`);
      }

      const fiber = renderFiber(
        createElement(
          "div",
          null,
          createElement(Counter, { key: "counter" }),
        ),
      );

      // Counter is the direct child of the root div Fiber.
      const counterFiber = fiber.child;

      expect(container.textContent).toBe("Count: 5");

      expect(
        getComponentHookSnapshot(counterFiber.instanceId),
      ).toHaveLength(1);
    });

    it("does not run unmount cleanup when a component is updated", () => {
      const cleanup = vi.fn();

      function Counter(props) {
        useEffect(() => {
          return cleanup;
        }, []);

        return createElement("p", null, props.label);
      }

      const oldFiber = renderFiber(
        createElement(
          "div",
          null,
          createElement(Counter, {
            key: "counter",
            label: "Before",
          }),
        ),
      );

      const newFiber = renderFiber(
        createElement(
          "div",
          null,
          createElement(Counter, {
            key: "counter",
            label: "After",
          }),
        ),
        oldFiber,
      );

      expect(container.textContent).toBe("After");
      expect(cleanup).not.toHaveBeenCalled();
      expect(newFiber.child.instanceId).toBe(
        oldFiber.child.instanceId,
      );
    });

    it("runs effect cleanup when a component is unmounted", () => {
      const cleanup = vi.fn();

      function Counter() {
        useEffect(() => {
          return cleanup;
        }, []);

        return createElement("p", null, "Counter");
      }

      const oldFiber = renderFiber(
        createElement(
          "div",
          null,
          createElement(Counter, { key: "counter" }),
        ),
      );

      expect(cleanup).not.toHaveBeenCalled();

      const newFiber = renderFiber(
        createElement("div", null),
        oldFiber,
      );

      expect(container.textContent).toBe("");
      expect(cleanup).toHaveBeenCalledTimes(1);
      expect(newFiber.child).toBeNull();
    });

    it("cleans up nested components when their parent is unmounted", () => {
      const parentCleanup = vi.fn();
      const childCleanup = vi.fn();

      function Child() {
        useEffect(() => {
          return childCleanup;
        }, []);

        return createElement("span", null, "Child");
      }

      function Parent() {
        useEffect(() => {
          return parentCleanup;
        }, []);

        return createElement(
          "section",
          null,
          createElement(Child, {}),
        );
      }

      const oldFiber = renderFiber(
        createElement(
          "div",
          null,
          createElement(Parent, { key: "parent" }),
        ),
      );

      expect(container.textContent).toBe("Child");

      renderFiber(
        createElement("div", null),
        oldFiber,
      );

      expect(parentCleanup).toHaveBeenCalledTimes(1);
      expect(childCleanup).toHaveBeenCalledTimes(1);
      expect(container.textContent).toBe("");
    });

    it("runs each effect cleanup exactly once during unmount", () => {
      const cleanup = vi.fn();

      function Counter() {
        useEffect(() => {
          return cleanup;
        }, []);

        return createElement("p", null, "Counter");
      }

      const oldFiber = renderFiber(
        createElement(
          "div",
          null,
          createElement(Counter, { key: "counter" }),
        ),
      );

      renderFiber(
        createElement("div", null),
        oldFiber,
      );

      expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it("disposes hook state when a component is removed", () => {
      function Counter() {
        useState(10);
        useState("El Nexo");

        return createElement("p", null, "Counter");
      }

      const oldFiber = renderFiber(
        createElement(
          "div",
          null,
          createElement(Counter, { key: "counter" }),
        ),
      );

      // Counter is the direct child of the root div Fiber.
      const counterFiber = oldFiber.child;
      const componentId = counterFiber.instanceId;

      expect(
        getComponentHookSnapshot(componentId),
      ).toHaveLength(2);

      renderFiber(
        createElement("div", null),
        oldFiber,
      );

      expect(
        getComponentHookSnapshot(componentId),
      ).toHaveLength(0);
    });
  });
});
