
/**
 * @vitest-environment jsdom
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  vi
} from "vitest";

import { createElement } from "../src/vdom/createElement.js";

import {
  createFiber,
  buildFiberTree
} from "../src/fiber/fiber.js";

import {
  createDomForFiber,
  performWork
} from "../src/fiber/performWork.js";

import {
  performUnitOfWork,
  workLoop
} from "../src/fiber/workLoop.js";

import {
  commitWork,
  commitRoot
} from "../src/fiber/commitWork.js";

describe("El Nexo Fiber", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  // Fiber creation

  it("creates a Fiber for an HTML element", () => {
    const fiber = createFiber(
      createElement("div", { id: "app" })
    );

    expect(fiber.type).toBe("div");
    expect(fiber.props.id).toBe("app");
    expect(fiber.dom).toBeNull();
    expect(fiber.child).toBeNull();
    expect(fiber.sibling).toBeNull();
  });

  it("creates a Fiber for a text node", () => {
    const fiber = createFiber("Hello El Nexo");

    expect(fiber.type).toBe("TEXT_ELEMENT");
    expect(fiber.props.nodeValue).toBe("Hello El Nexo");
    expect(fiber.props.children).toEqual([]);
  });

  it("supports numeric text nodes", () => {
    const fiber = createFiber(42);

    expect(fiber.type).toBe("TEXT_ELEMENT");
    expect(fiber.props.nodeValue).toBe("42");
  });

  // Fiber tree structure

  it("links a child Fiber to its parent", () => {
    const root = buildFiberTree(
      createElement("div", null, createElement("p", null, "Hello"))
    );

    expect(root.type).toBe("div");
    expect(root.child.type).toBe("p");
    expect(root.child.parent).toBe(root);
  });

  it("links multiple children using siblings", () => {
    const root = buildFiberTree(
      createElement(
        "div",
        null,
        createElement("p", null, "First"),
        createElement("span", null, "Second"),
        createElement("button", null, "Third")
      )
    );

    const first = root.child;
    const second = first.sibling;
    const third = second.sibling;

    expect(first.type).toBe("p");
    expect(second.type).toBe("span");
    expect(third.type).toBe("button");
    expect(third.sibling).toBeNull();
  });

  it("builds nested Fiber relationships correctly", () => {
    const root = buildFiberTree(
      createElement(
        "div",
        null,
        createElement(
          "section",
          null,
          createElement("p", null, "Nested")
        )
      )
    );

    const section = root.child;
    const paragraph = section.child;
    const text = paragraph.child;

    expect(section.parent).toBe(root);
    expect(paragraph.parent).toBe(section);
    expect(text.parent).toBe(paragraph);
    expect(text.type).toBe("TEXT_ELEMENT");
  });

  it("builds a Fiber for a function component", () => {
    function Greeting() {
      return createElement("h1", null, "Welcome");
    }

    const root = buildFiberTree(
      createElement(Greeting, null)
    );

    expect(root.type).toBe(Greeting);
    expect(root.child.type).toBe("h1");
    expect(root.child.parent).toBe(root);
  });

  it("stores the provided parent Fiber", () => {
    const parent = createFiber(createElement("main", null));
    const child = createFiber(createElement("p", null), parent);

    expect(child.parent).toBe(parent);
  });

  it("initializes alternate and effectTag", () => {
    const fiber = createFiber(createElement("div", null));

    expect(fiber.alternate).toBeNull();
    expect(fiber.effectTag).toBeNull();
  });

  // DOM creation

  it("creates a real DOM element for an element Fiber", () => {
    const fiber = createFiber(
      createElement("div", { id: "app" })
    );

    const dom = createDomForFiber(fiber);

    expect(dom.tagName).toBe("DIV");
    expect(dom.id).toBe("app");
  });

  it("creates a real DOM text node", () => {
    const dom = createDomForFiber(createFiber("Hello El Nexo"));

    expect(dom.nodeType).toBe(Node.TEXT_NODE);
    expect(dom.nodeValue).toBe("Hello El Nexo");
  });

  it("attaches event handlers to DOM elements", () => {
    const handleClick = vi.fn();
    const fiber = createFiber(
      createElement("button", { onClick: handleClick })
    );

    createDomForFiber(fiber).click();

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("stores the created DOM node on the Fiber", () => {
    const fiber = createFiber(createElement("p", null));

    performWork(fiber);

    expect(fiber.dom).toBeInstanceOf(HTMLElement);
    expect(fiber.dom.tagName).toBe("P");
  });

  it("returns the processed Fiber", () => {
    const fiber = createFiber(createElement("div", null));

    expect(performWork(fiber)).toBe(fiber);
  });

  // Work loop

  it("visits a child before its sibling", () => {
    const root = buildFiberTree(
      createElement(
        "div",
        null,
        createElement("p", null),
        createElement("span", null)
      )
    );

    expect(performUnitOfWork(root)).toBe(root.child);
    expect(performUnitOfWork(root.child)).toBe(root.child.sibling);
  });

  it("moves to the parent's sibling after finishing a subtree", () => {
    const root = buildFiberTree(
      createElement(
        "main",
        null,
        createElement(
          "section",
          null,
          createElement("p", null)
        ),
        createElement("footer", null)
      )
    );

    expect(
      performUnitOfWork(root.child.child)
    ).toBe(root.child.sibling);
  });

  it("returns null when traversal is complete", () => {
    const root = buildFiberTree(createElement("div", null));

    expect(performUnitOfWork(root)).toBeNull();
  });

  it("processes every Fiber in the work loop", () => {
    const root = buildFiberTree(
      createElement(
        "div",
        null,
        createElement("p", null, "Hello"),
        createElement("span", null, "World")
      )
    );

    const fibers = [
      root,
      root.child,
      root.child.child,
      root.child.sibling,
      root.child.sibling.child
    ];

    workLoop(root);

    for (const fiber of fibers) {
      expect(fiber.dom).not.toBeNull();
    }

    expect(console.log).toHaveBeenCalledWith(
      "WORK LOOP COMPLETED"
    );
  });

  // Commit phase

  it("attaches child DOM nodes to their parent", () => {
    const root = buildFiberTree(
      createElement(
        "div",
        null,
        createElement("p", null, "Hello")
      )
    );

    workLoop(root);
    commitWork(root);

    expect(root.dom.children).toHaveLength(1);
    expect(root.dom.firstElementChild.tagName).toBe("P");
  });

  it("attaches nested DOM nodes correctly", () => {
    const root = buildFiberTree(
      createElement(
        "main",
        null,
        createElement(
          "section",
          null,
          createElement("p", null, "Nested")
        )
      )
    );

    workLoop(root);
    commitWork(root);

    expect(root.dom.querySelector("section p").textContent)
      .toBe("Nested");
  });

  it("attaches the root DOM node to the container", () => {
    const container = document.createElement("div");
    const root = buildFiberTree(
      createElement("h1", null, "Hello El Nexo")
    );

    workLoop(root);
    commitRoot(root, container);

    expect(container.children).toHaveLength(1);
    expect(container.firstElementChild.tagName).toBe("H1");
    expect(container.textContent).toBe("Hello El Nexo");
  });

  it("does nothing when commitRoot receives a missing root", () => {
    const container = document.createElement("div");

    expect(() => commitRoot(null, container)).not.toThrow();
    expect(container.children).toHaveLength(0);
  });

  it("does nothing when the root has no DOM node", () => {
    const container = document.createElement("div");
    const root = createFiber(createElement("div", null));

    commitRoot(root, container);

    expect(container.children).toHaveLength(0);
  });

  // Function component commit regression tests

  it("commits a DOM element rendered through a function component", () => {
    function Greeting() {
      return createElement("h1", null, "Welcome");
    }

    const container = document.createElement("div");
    const root = buildFiberTree(
      createElement(
        "div",
        null,
        createElement(Greeting, null)
      )
    );

    workLoop(root);
    commitRoot(root, container);

    expect(container.querySelector("h1")?.textContent)
      .toBe("Welcome");
  });

  it("commits nested function components", () => {
    function Greeting() {
      return createElement("p", null, "Nested greeting");
    }

    function Page() {
      return createElement(
        "section",
        null,
        createElement(Greeting, null)
      );
    }

    const container = document.createElement("div");
    const root = buildFiberTree(
      createElement("main", null, createElement(Page, null))
    );

    workLoop(root);
    commitRoot(root, container);

    expect(container.querySelector("section p")?.textContent)
      .toBe("Nested greeting");
  });

  it("commits multiple DOM children rendered through a function component", () => {
    function Content() {
      return createElement(
        "div",
        null,
        createElement("h2", null, "Title"),
        createElement("p", null, "Description")
      );
    }

    const container = document.createElement("div");
    const root = buildFiberTree(
      createElement("main", null, createElement(Content, null))
    );

    workLoop(root);
    commitRoot(root, container);

    expect(container.querySelector("h2")?.textContent)
      .toBe("Title");
    expect(container.querySelector("p")?.textContent)
      .toBe("Description");
  });

  it("preserves the correct DOM parent for function component children", () => {
    function Content() {
      return createElement("span", null, "Child");
    }

    const container = document.createElement("div");
    const root = buildFiberTree(
      createElement(
        "main",
        null,
        createElement("section", null, createElement(Content, null))
      )
    );

    workLoop(root);
    commitRoot(root, container);

    const section = container.querySelector("section");
    const span = container.querySelector("span");

    expect(span.parentElement).toBe(section);
    expect(section.parentElement.tagName).toBe("MAIN");
  });
    // --------------------------------------------------
  // Incremental Fiber reconciliation regression tests
  // --------------------------------------------------

  describe("Incremental reconciliation", () => {
    let container;

    function renderFiberTree(vnode, alternate = null) {
      const fiber = buildFiberTree(
        vnode,
        null,
        null,
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

    it("preserves the root DOM node during an update", () => {
      const oldVNode = createElement(
        "div",
        null,
        createElement("p", null, "Old"),
      );

      const oldFiber = renderFiberTree(oldVNode);
      const originalRoot = oldFiber.dom;

      const newVNode = createElement(
        "div",
        null,
        createElement("p", null, "New"),
      );

      const newFiber = renderFiberTree(newVNode, oldFiber);

      expect(newFiber.dom).toBe(originalRoot);
      expect(container.firstChild).toBe(originalRoot);
      expect(container.textContent).toBe("New");
    });

    it("updates text without replacing the existing text node", () => {
      const oldVNode = createElement("p", null, "Count: 0");
      const oldFiber = renderFiberTree(oldVNode);

      const originalTextNode = oldFiber.dom.firstChild;

      const newVNode = createElement("p", null, "Count: 1");
      const newFiber = renderFiberTree(newVNode, oldFiber);

      expect(newFiber.dom.firstChild).toBe(originalTextNode);
      expect(newFiber.dom.textContent).toBe("Count: 1");
    });

    it("inserts a new element using placement", () => {
      const oldVNode = createElement(
        "div",
        null,
        createElement("p", { "data-item": "A" }, "A"),
      );

      const oldFiber = renderFiberTree(oldVNode);
      const originalA = container.querySelector('[data-item="A"]');

      const newVNode = createElement(
        "div",
        null,
        createElement("p", { "data-item": "A" }, "A"),
        createElement("p", { "data-item": "B" }, "B"),
      );

      renderFiberTree(newVNode, oldFiber);

      expect(container.querySelectorAll("[data-item]")).toHaveLength(2);
      expect(container.querySelector('[data-item="A"]')).toBe(originalA);
      expect(container.querySelector('[data-item="B"]').textContent).toBe("B");
    });

    it("removes an element using deletion", () => {
      const oldVNode = createElement(
        "div",
        null,
        createElement("p", { "data-item": "A" }, "A"),
        createElement("p", { "data-item": "B" }, "B"),
      );

      const oldFiber = renderFiberTree(oldVNode);

      const newVNode = createElement(
        "div",
        null,
        createElement("p", { "data-item": "A" }, "A"),
      );

      renderFiberTree(newVNode, oldFiber);

      expect(container.querySelector('[data-item="A"]')).not.toBeNull();
      expect(container.querySelector('[data-item="B"]')).toBeNull();
    });

    it("updates properties without replacing the existing element", () => {
      const oldVNode = createElement(
        "div",
        null,
        createElement("p", { className: "old-class" }, "Hello"),
      );

      const oldFiber = renderFiberTree(oldVNode);
      const originalParagraph = container.querySelector("p");

      const newVNode = createElement(
        "div",
        null,
        createElement("p", { className: "new-class" }, "Hello"),
      );

      renderFiberTree(newVNode, oldFiber);

      const updatedParagraph = container.querySelector("p");

      expect(updatedParagraph).toBe(originalParagraph);
      expect(updatedParagraph.className).toBe("new-class");
    });

    it("replaces an element when its type changes", () => {
      const oldVNode = createElement(
        "div",
        null,
        createElement("p", null, "Hello"),
      );

      const oldFiber = renderFiberTree(oldVNode);
      const originalParagraph = container.querySelector("p");

      const newVNode = createElement(
        "div",
        null,
        createElement("span", null, "Hello"),
      );

      renderFiberTree(newVNode, oldFiber);

      expect(container.querySelector("p")).toBeNull();
      expect(container.querySelector("span")).not.toBeNull();
      expect(container.querySelector("span")).not.toBe(originalParagraph);
    });

    it("preserves DOM identity when keyed elements are reordered", () => {
      const oldVNode = createElement(
        "div",
        null,
        createElement("p", { key: "A", "data-item": "A" }, "A"),
        createElement("p", { key: "B", "data-item": "B" }, "B"),
        createElement("p", { key: "C", "data-item": "C" }, "C"),
      );

      const oldFiber = renderFiberTree(oldVNode);

      const originalNodes = {
        A: container.querySelector('[data-item="A"]'),
        B: container.querySelector('[data-item="B"]'),
        C: container.querySelector('[data-item="C"]'),
      };

      const newVNode = createElement(
        "div",
        null,
        createElement("p", { key: "C", "data-item": "C" }, "C"),
        createElement("p", { key: "B", "data-item": "B" }, "B"),
        createElement("p", { key: "A", "data-item": "A" }, "A"),
      );

      renderFiberTree(newVNode, oldFiber);

      const updatedNodes = [
        ...container.querySelectorAll("[data-item]"),
      ];

      expect(updatedNodes.map((node) => node.dataset.item)).toEqual([
        "C",
        "B",
        "A",
      ]);

      expect(container.querySelector('[data-item="A"]')).toBe(originalNodes.A);
      expect(container.querySelector('[data-item="B"]')).toBe(originalNodes.B);
      expect(container.querySelector('[data-item="C"]')).toBe(originalNodes.C);
    });

    it("updates event handlers without replacing the DOM element", () => {
      const oldHandler = vi.fn();
      const newHandler = vi.fn();

      const oldVNode = createElement(
        "div",
        null,
        createElement("button", { onClick: oldHandler }, "Click"),
      );

      const oldFiber = renderFiberTree(oldVNode);
      const originalButton = container.querySelector("button");

      const newVNode = createElement(
        "div",
        null,
        createElement("button", { onClick: newHandler }, "Click"),
      );

      renderFiberTree(newVNode, oldFiber);

      const updatedButton = container.querySelector("button");

      expect(updatedButton).toBe(originalButton);

      updatedButton.click();

      expect(oldHandler).not.toHaveBeenCalled();
      expect(newHandler).toHaveBeenCalledTimes(1);
    });

    it("preserves function component identity across updates", () => {
      function Counter() {
        return createElement("p", null, "Counter");
      }

      const oldVNode = createElement(
        "div",
        null,
        createElement(Counter, { key: "counter" }),
      );

      const oldFiber = renderFiberTree(oldVNode);
      const oldComponentFiber = oldFiber.child;

      const newVNode = createElement(
        "div",
        null,
        createElement(Counter, { key: "counter" }),
      );

      const newFiber = renderFiberTree(newVNode, oldFiber);

      expect(newFiber.child.instanceId).toBe(oldComponentFiber.instanceId);
      expect(newFiber.child.alternate).toBe(oldComponentFiber);
    });
  });
});
