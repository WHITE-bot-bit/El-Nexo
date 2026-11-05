/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { createElement } from "../src/vdom/createElement.js";
import { render } from "../src/renderer/render.js";
import { reconcile } from "../src/reconciler/reconcile.js";

describe("El Nexo reconciliation", () => {
  let root;

  beforeEach(() => {
    root = document.createElement("div");
  });

  it("preserves zero as valid text", () => {
    const oldVNode = createElement("p", null, 0);
    const newVNode = createElement("p", null, 1);

    const dom = render(oldVNode, root);
    const originalTextNode = dom.firstChild;

    reconcile(dom, oldVNode, newVNode);

    expect(dom.textContent).toBe("1");
    expect(dom.firstChild).toBe(originalTextNode);
  });

  it("preserves an empty string as valid text", () => {
    const oldVNode = createElement("p", null, "");
    const newVNode = createElement("p", null, "Hello");

    const dom = render(oldVNode, root);

    reconcile(dom, oldVNode, newVNode);

    expect(dom.textContent).toBe("Hello");
  });

  it("replaces a text node with an element", () => {
    const oldVNode = createElement("div", null, "Hello");
    const newVNode = createElement(
      "div",
      null,
      createElement("span", null, "Hello"),
    );

    const dom = render(oldVNode, root);

    reconcile(dom, oldVNode, newVNode);

    expect(dom.firstChild.tagName).toBe("SPAN");
    expect(dom.firstChild.textContent).toBe("Hello");
  });

  it("updates text without replacing the text DOM node", () => {
    const oldVNode = createElement("p", null, "Count: 0");
    const newVNode = createElement("p", null, "Count: 1");

    const oldDom = render(oldVNode, root);
    const originalTextNode = oldDom.firstChild;

    reconcile(oldDom, oldVNode, newVNode);

    expect(oldDom.textContent).toBe("Count: 1");
    expect(oldDom.firstChild).toBe(originalTextNode);
  });

  it("preserves the parent DOM node when a child changes", () => {
    const oldVNode = createElement(
      "section",
      null,
      createElement("p", null, "Count: 0"),
    );

    const newVNode = createElement(
      "section",
      null,
      createElement("p", null, "Count: 1"),
    );

    const oldDom = render(oldVNode, root);
    const originalSection = oldDom;
    const originalParagraph = oldDom.firstChild;

    reconcile(oldDom, oldVNode, newVNode);

    expect(root.firstChild).toBe(originalSection);
    expect(oldDom.firstChild).toBe(originalParagraph);
    expect(originalParagraph.textContent).toBe("Count: 1");
  });

  it("uses the updated event handler", () => {
    const oldHandler = vi.fn();
    const newHandler = vi.fn();

    const oldVNode = createElement("button", { onClick: oldHandler }, "Click");

    const newVNode = createElement("button", { onClick: newHandler }, "Click");

    const button = render(oldVNode, root);

    reconcile(button, oldVNode, newVNode);
    button.click();

    expect(oldHandler).not.toHaveBeenCalled();
    expect(newHandler).toHaveBeenCalledTimes(1);
  });

  it("removes an event handler when it is removed from props", () => {
    const handler = vi.fn();

    const oldVNode = createElement("button", { onClick: handler }, "Click");

    const newVNode = createElement("button", null, "Click");

    const button = render(oldVNode, root);

    reconcile(button, oldVNode, newVNode);
    button.click();

    expect(handler).not.toHaveBeenCalled();
  });
});
