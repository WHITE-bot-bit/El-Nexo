
/**
 * @vitest-environment jsdom
 *
 * El Nexo - Fiber Render Bailout Tests
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";

// --------------------------------------------------
// Mock dirty-component tracking
// --------------------------------------------------

const { dirtyIds } = vi.hoisted(() => ({
  dirtyIds: new Set(),
}));

vi.mock("../src/core/state.js", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,

    isComponentDirty: vi.fn((componentId) => {
      return dirtyIds.has(componentId);
    }),
  };
});

import { isComponentDirty } from "../src/core/state.js";

import { createElement } from "../src/vdom/createElement.js";

import {
  buildFiberTree,
} from "../src/fiber/fiber.js";

import {
  workLoop,
} from "../src/fiber/workLoop.js";

import {
  commitRoot,
} from "../src/fiber/commitWork.js";

// --------------------------------------------------
// Test helpers
// --------------------------------------------------

function findFiber(fiber, componentType) {
  if (!fiber) return null;

  if (fiber.type === componentType) {
    return fiber;
  }

  let child = fiber.child;

  while (child) {
    const result = findFiber(child, componentType);

    if (result) return result;

    child = child.sibling;
  }

  return null;
}

function renderFiberTree(vnode, alternate = null, container = null) {
  const fiber = buildFiberTree(
    vnode,
    null,
    (component, props) => component(props),
    "root",
    alternate,
  );

  workLoop(fiber);

  if (container) {
    commitRoot(fiber, container);
  }

  return fiber;
}

// --------------------------------------------------
// Fiber render bailout tests
// --------------------------------------------------

describe("Fiber Render Bailout", () => {
  beforeEach(() => {
    dirtyIds.clear();

    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ----------------------------------------------
  // Test 1: Clean component bailout
  // ----------------------------------------------

  it("skips rendering a clean component when props are unchanged", () => {
    let renderCount = 0;

    function Header() {
      renderCount += 1;

      return createElement("header", null, "El Nexo");
    }

    const firstTree = renderFiberTree(
      createElement("main", null, createElement(Header, null)),
    );

    expect(renderCount).toBe(1);

    const secondTree = renderFiberTree(
      createElement("main", null, createElement(Header, null)),
      firstTree,
    );

    expect(renderCount).toBe(1);
    expect(secondTree.child.alternate).toBe(firstTree.child);
    expect(isComponentDirty).toHaveBeenCalled();
  });

  // ----------------------------------------------
  // Test 2: Dirty component rendering
  // ----------------------------------------------

  it("renders a dirty component again", () => {
    let renderCount = 0;

    function Counter() {
      renderCount += 1;

      return createElement("p", null, "Counter");
    }

    const firstTree = renderFiberTree(
      createElement("main", null, createElement(Counter, null)),
    );

    const counterFiber = findFiber(firstTree, Counter);

    expect(counterFiber).not.toBeNull();
    expect(renderCount).toBe(1);

    dirtyIds.add(counterFiber.instanceId);

    const secondTree = renderFiberTree(
      createElement("main", null, createElement(Counter, null)),
      firstTree,
    );

    expect(renderCount).toBe(2);
    expect(secondTree.child.alternate).toBe(counterFiber);
  });

  // ----------------------------------------------
  // Test 3: Dirty child under a clean parent
  // ----------------------------------------------

  it("renders a dirty child while its clean parent skips rendering", () => {
    let parentRenderCount = 0;
    let childRenderCount = 0;

    let childText = "Initial child";

    function Child() {
      childRenderCount += 1;

      return createElement("p", null, childText);
    }

    function Parent() {
      parentRenderCount += 1;

      return createElement(Child, null);
    }

    const container = document.createElement("div");

    const firstTree = renderFiberTree(
      createElement("main", null, createElement(Parent, null)),
      null,
      container,
    );

    const parentFiber = findFiber(firstTree, Parent);
    const childFiber = findFiber(firstTree, Child);

    expect(parentRenderCount).toBe(1);
    expect(childRenderCount).toBe(1);

    expect(parentFiber).not.toBeNull();
    expect(childFiber).not.toBeNull();

    dirtyIds.add(childFiber.instanceId);

    childText = "Updated child";

    const secondTree = renderFiberTree(
      createElement("main", null, createElement(Parent, null)),
      firstTree,
      container,
    );

    expect(parentRenderCount).toBe(1);
    expect(childRenderCount).toBe(2);

    expect(container.querySelector("p").textContent).toBe(
      "Updated child",
    );

    expect(findFiber(secondTree, Parent).alternate).toBe(parentFiber);
    expect(findFiber(secondTree, Child).alternate).toBe(childFiber);
  });

  // ----------------------------------------------
  // Test 4: Changed props
  // ----------------------------------------------

  it("renders a clean component when its props change", () => {
    let renderCount = 0;

    function Greeting(props) {
      renderCount += 1;

      return createElement("p", null, props.message);
    }

    const firstTree = renderFiberTree(
      createElement(
        "main",
        null,
        createElement(Greeting, { message: "Hello" }),
      ),
    );

    expect(renderCount).toBe(1);

    const secondTree = renderFiberTree(
      createElement(
        "main",
        null,
        createElement(Greeting, { message: "Welcome" }),
      ),
      firstTree,
    );

    expect(renderCount).toBe(2);
    expect(secondTree.child.alternate).toBe(firstTree.child);
  });

  // ----------------------------------------------
  // Test 5: DOM identity preservation
  // ----------------------------------------------

  it("preserves existing DOM nodes when a component bails out", () => {
    let renderCount = 0;

    function Content() {
      renderCount += 1;

      return createElement(
        "section",
        null,
        createElement("p", null, "Stable DOM"),
      );
    }

    const container = document.createElement("div");

    const firstTree = renderFiberTree(
      createElement("main", null, createElement(Content, null)),
      null,
      container,
    );

    const originalSection = container.querySelector("section");
    const originalParagraph = container.querySelector("p");

    expect(originalSection).not.toBeNull();
    expect(originalParagraph).not.toBeNull();

    const secondTree = renderFiberTree(
      createElement("main", null, createElement(Content, null)),
      firstTree,
      container,
    );

    expect(renderCount).toBe(1);

    expect(container.querySelector("section")).toBe(originalSection);
    expect(container.querySelector("p")).toBe(originalParagraph);

    expect(secondTree.child.alternate).toBe(firstTree.child);
  });
});
