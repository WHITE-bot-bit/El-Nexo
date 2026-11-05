
/**
 * @vitest-environment jsdom
 */

import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

import { createElement } from "../src/vdom/createElement.js";
import { render } from "../src/renderer/render.js";
import { reconcile } from "../src/reconciler/reconcile.js";
import {
  beginComponent,
  endComponent,
  useState,
  setUpdateCallback
} from "../src/core/state.js";

describe("El Nexo — Combined Tests", () => {
  let root;

  beforeEach(() => {
    root = document.createElement("div");
    setUpdateCallback(null);
  });

  // 1. VIRTUAL DOM TESTS

  describe("createElement", () => {
    it("creates a virtual DOM element", () => {
      const vnode = createElement("h1", null, "Hello");

      expect(vnode.type).toBe("h1");
      expect(vnode.props.children).toEqual(["Hello"]);
    });

    it("stores element properties", () => {
      const vnode = createElement(
        "button",
        { id: "counter", className: "primary" },
        "Click"
      );

      expect(vnode.props.id).toBe("counter");
      expect(vnode.props.className).toBe("primary");
    });

    it("supports multiple children", () => {
      const vnode = createElement(
        "div",
        null,
        "First",
        "Second"
      );

      expect(vnode.props.children).toEqual([
        "First",
        "Second"
      ]);
    });

    it("supports an element without children", () => {
      const vnode = createElement("hr", null);

      expect(vnode.props.children).toEqual([]);
    });
  });

  // 2. DOM RENDERER TESTS

  describe("render", () => {
    it("renders an element into the container", () => {
      render(createElement("h1", null, "El Nexo"), root);

      expect(root.innerHTML).toBe("<h1>El Nexo</h1>");
    });

    it("renders nested elements", () => {
      render(
        createElement(
          "section",
          null,
          createElement("p", null, "Hello")
        ),
        root
      );

      expect(root.querySelector("section p").textContent)
        .toBe("Hello");
    });

    it("applies element properties", () => {
      render(
        createElement(
          "button",
          { id: "save-button" },
          "Save"
        ),
        root
      );

      expect(root.querySelector("button").id)
        .toBe("save-button");
    });

    it("renders numeric children as text", () => {
      render(createElement("p", null, 42), root);

      expect(root.querySelector("p").textContent).toBe("42");
    });

    it("attaches click event handlers", () => {
      const handler = vi.fn();

      render(
        createElement("button", { onClick: handler }, "Click"),
        root
      );

      root.querySelector("button").click();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("returns the rendered DOM element", () => {
      const dom = render(
        createElement("p", null, "Hello"),
        root
      );

      expect(dom).toBe(root.firstChild);
    });
  });

  // 3. RECONCILIATION TESTS

  describe("reconcile", () => {
    it("updates text without replacing its text DOM node", () => {
      const oldVNode = createElement("p", null, "Count: 0");
      const newVNode = createElement("p", null, "Count: 1");

      const dom = render(oldVNode, root);
      const originalTextNode = dom.firstChild;

      reconcile(dom, oldVNode, newVNode);

      expect(dom.textContent).toBe("Count: 1");
      expect(dom.firstChild).toBe(originalTextNode);
    });

    it("preserves the parent DOM node when a child changes", () => {
      const oldVNode = createElement(
        "section",
        null,
        createElement("p", null, "Old")
      );

      const newVNode = createElement(
        "section",
        null,
        createElement("p", null, "New")
      );

      const dom = render(oldVNode, root);
      const paragraph = dom.firstChild;

      reconcile(dom, oldVNode, newVNode);

      expect(root.firstChild).toBe(dom);
      expect(dom.firstChild).toBe(paragraph);
      expect(paragraph.textContent).toBe("New");
    });

    it("adds a new child element", () => {
      const oldVNode = createElement(
        "div",
        null,
        createElement("p", null, "First")
      );

      const newVNode = createElement(
        "div",
        null,
        createElement("p", null, "First"),
        createElement("p", null, "Second")
      );

      const dom = render(oldVNode, root);

      reconcile(dom, oldVNode, newVNode);

      expect(dom.children).toHaveLength(2);
      expect(dom.textContent).toBe("FirstSecond");
    });

    it("removes an existing child element", () => {
      const oldVNode = createElement(
        "div",
        null,
        createElement("p", null, "First"),
        createElement("p", null, "Second")
      );

      const newVNode = createElement(
        "div",
        null,
        createElement("p", null, "First")
      );

      const dom = render(oldVNode, root);

      reconcile(dom, oldVNode, newVNode);

      expect(dom.children).toHaveLength(1);
      expect(dom.textContent).toBe("First");
    });

    it("replaces an element when its type changes", () => {
      const oldVNode = createElement("p", null, "Hello");
      const newVNode = createElement("h2", null, "Hello");

      const dom = render(oldVNode, root);

      reconcile(dom, oldVNode, newVNode);

      expect(root.firstChild.tagName).toBe("H2");
      expect(root.firstChild).not.toBe(dom);
    });

    it("uses the updated event handler", () => {
      const oldHandler = vi.fn();
      const newHandler = vi.fn();

      const oldVNode = createElement(
        "button",
        { onClick: oldHandler },
        "Click"
      );

      const newVNode = createElement(
        "button",
        { onClick: newHandler },
        "Click"
      );

      const dom = render(oldVNode, root);

      reconcile(dom, oldVNode, newVNode);
      dom.click();

      expect(oldHandler).not.toHaveBeenCalled();
      expect(newHandler).toHaveBeenCalledTimes(1);
    });

    it("removes an event handler when it is removed from props", () => {
      const handler = vi.fn();

      const oldVNode = createElement(
        "button",
        { onClick: handler },
        "Click"
      );

      const newVNode = createElement("button", null, "Click");
      const dom = render(oldVNode, root);

      reconcile(dom, oldVNode, newVNode);
      dom.click();

      expect(handler).not.toHaveBeenCalled();
    });
  });

  // 4. STATE MANAGEMENT TESTS

  describe("useState", () => {
    it("returns the initial state", () => {
      beginComponent("InitialStateTest");

      try {
        const [value] = useState(10);

        expect(value).toBe(10);
      } finally {
        endComponent();
      }
    });

    it("preserves state between renders", () => {
      function Counter() {
        const [count, setCount] = useState(0);
        return { count, setCount };
      }

      beginComponent(Counter);

      let result;

      try {
        result = Counter();
      } finally {
        endComponent();
      }

      result.setCount(5);

      beginComponent(Counter);

      try {
        const [count] = useState(0);

        expect(count).toBe(5);
      } finally {
        endComponent();
      }
    });

    it("supports functional state updates", () => {
      function Counter() {
        return useState(0);
      }

      beginComponent(Counter);

      let count;
      let setCount;

      try {
        [count, setCount] = Counter();
      } finally {
        endComponent();
      }

      setCount(previous => previous + 1);

      beginComponent(Counter);

      try {
        [count] = useState(0);

        expect(count).toBe(1);
      } finally {
        endComponent();
      }
    });

    it("does not trigger an update for an unchanged value", () => {
      const update = vi.fn();

      setUpdateCallback(update);
      beginComponent("UnchangedStateTest");

      let setValue;

      try {
        [, setValue] = useState(5);
      } finally {
        endComponent();
      }

      setValue(5);

      expect(update).not.toHaveBeenCalled();
    });

    it("triggers an update when state changes", () => {
      const update = vi.fn();

      setUpdateCallback(update);
      beginComponent("ChangedStateTest");

      let setValue;

      try {
        [, setValue] = useState(0);
      } finally {
        endComponent();
      }

      setValue(1);

      expect(update).toHaveBeenCalledTimes(1);
    });

    it("throws when useState is called outside a component", () => {
      expect(() => useState(0)).toThrow(
        "useState must be called while rendering a component."
      );
    });
  });
});
