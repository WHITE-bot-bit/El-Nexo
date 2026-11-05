
import {
  UPDATE,
  DELETION
} from "./effectTags.js";

import {
  cleanupComponent
} from "../core/state.js";

function setDomProperty(dom, key, value) {
  if (key === "children" || key === "key") return;

  if (key.startsWith("on") && typeof value === "function") {
    const eventName = key.slice(2).toLowerCase();

    if (!dom.__nexoEvents) {
      dom.__nexoEvents = {};
    }

    const previousHandler = dom.__nexoEvents[eventName];

    if (previousHandler) {
      dom.removeEventListener(eventName, previousHandler);
    }

    dom.addEventListener(eventName, value);
    dom.__nexoEvents[eventName] = value;
    return;
  }

  if (key.startsWith("on")) return;

  if (key === "className") {
    dom.className = value ?? "";
    return;
  }

  if (key === "style" && value && typeof value === "object") {
    Object.assign(dom.style, value);
    return;
  }

  if (value === false || value === null || value === undefined) {
    dom.removeAttribute(key);

    if (key in dom && typeof dom[key] === "boolean") {
      dom[key] = false;
    }

    return;
  }

  try {
    if (key in dom && key !== "form") {
      dom[key] = value;
      return;
    }
  } catch {
    // Fall back to attribute handling.
  }

  dom.setAttribute(key, String(value));
}

function removeDomProperty(dom, key) {
  if (key === "children" || key === "key") return;

  if (key.startsWith("on")) {
    const eventName = key.slice(2).toLowerCase();
    const registered = dom.__nexoEvents?.[eventName];

    if (registered) {
      dom.removeEventListener(eventName, registered);
      delete dom.__nexoEvents[eventName];
    }

    return;
  }

  if (key === "className") {
    dom.className = "";
    dom.removeAttribute("class");
    return;
  }

  if (key === "style") {
    dom.removeAttribute("style");

    if (dom.style) {
      dom.style.cssText = "";
    }

    return;
  }

  if (key === "value") {
    dom.value = "";
    return;
  }

  if (key === "checked" || key === "selected") {
    dom[key] = false;
    return;
  }

  dom.removeAttribute(key);

  try {
    if (key in dom && typeof dom[key] === "string") {
      dom[key] = "";
    }
  } catch {
    // Some DOM properties are read-only.
  }
}

function updateDom(dom, oldProps = {}, newProps = {}) {
  // Text nodes need nodeValue updates, not HTML attributes.
  if (dom.nodeType === 3) {
    const oldValue = oldProps.nodeValue ?? "";
    const newValue = newProps.nodeValue ?? "";

    if (!Object.is(oldValue, newValue)) {
      dom.nodeValue = String(newValue);
    }

    return;
  }

  for (const key of Object.keys(oldProps)) {
    if (key === "children" || key === "key") continue;

    if (!(key in newProps)) {
      removeDomProperty(dom, key);
    }
  }

  for (const [key, value] of Object.entries(newProps)) {
    if (key === "children" || key === "key") continue;

    const oldValue = oldProps[key];

    if (key.startsWith("on")) {
      if (oldValue !== value) {
        setDomProperty(dom, key, value);
      }

      continue;
    }

    if (key === "style") {
      const oldStyle = oldValue || {};
      const newStyle = value || {};

      for (const styleKey of Object.keys(oldStyle)) {
        if (!(styleKey in newStyle)) {
          dom.style[styleKey] = "";
        }
      }

      if (value && typeof value === "object") {
        Object.assign(dom.style, value);
      }

      continue;
    }

    if (!Object.is(oldValue, value)) {
      setDomProperty(dom, key, value);
    }
  }
}

/**
 * Recursively clean up a Fiber subtree.
 *
 * Function components own hook state and effects.
 * Their state must be disposed when they are permanently removed.
 */
function cleanupFiberTree(fiber) {
  if (!fiber) return;

  if (typeof fiber.type === "function" && fiber.instanceId != null) {
    cleanupComponent(fiber.instanceId);
  }

  let child = fiber.child;

  while (child) {
    cleanupFiberTree(child);
    child = child.sibling;
  }
}

/**
 * Remove a Fiber subtree from the DOM and clean up its hooks.
 */
function removeFiberDom(fiber) {
  if (!fiber) return;

  // Clean the entire subtree before removing its DOM.
  cleanupFiberTree(fiber);

  if (fiber.dom) {
    fiber.dom.parentNode?.removeChild(fiber.dom);
    return;
  }

  let child = fiber.child;

  while (child) {
    removeFiberDomWithoutCleanup(child);
    child = child.sibling;
  }
}

/**
 * Remove DOM recursively after cleanup has already happened.
 * This prevents executing effect cleanup twice.
 */
function removeFiberDomWithoutCleanup(fiber) {
  if (!fiber) return;

  if (fiber.dom) {
    fiber.dom.parentNode?.removeChild(fiber.dom);
    return;
  }

  let child = fiber.child;

  while (child) {
    removeFiberDomWithoutCleanup(child);
    child = child.sibling;
  }
}

function getFirstDomNode(fiber) {
  if (!fiber) return null;

  if (fiber.dom) {
    return fiber.dom;
  }

  let child = fiber.child;

  while (child) {
    const dom = getFirstDomNode(child);

    if (dom) return dom;

    child = child.sibling;
  }

  return null;
}

function commitFiber(fiber, parentDom, beforeNode = null) {
  if (!fiber || !parentDom || fiber.effectTag === DELETION) {
    return null;
  }

  if (fiber.dom) {
    if (fiber.effectTag === UPDATE && fiber.alternate) {
      updateDom(
        fiber.dom,
        fiber.alternate.props || {},
        fiber.props || {}
      );
    }

    if (fiber.dom.parentNode !== parentDom) {
      parentDom.insertBefore(fiber.dom, beforeNode);
    } else if (fiber.dom !== beforeNode) {
      const correctlyPositioned =
        beforeNode === null
          ? fiber.dom.nextSibling === null
          : fiber.dom.nextSibling === beforeNode;

      if (!correctlyPositioned) {
        parentDom.insertBefore(fiber.dom, beforeNode);
      }
    }

    if (fiber.dom.nodeType === 3) {
      return fiber.dom;
    }

    commitChildren(fiber, fiber.dom);

    return fiber.dom;
  }

  commitChildren(fiber, parentDom, beforeNode);

  return getFirstDomNode(fiber);
}

function commitChildren(fiber, parentDom, beforeNode = null) {
  if (!fiber || !parentDom) return;

  for (const deletion of fiber.deletions || []) {
    removeFiberDom(deletion);
  }

  const children = [];

  let child = fiber.child;

  while (child) {
    children.push(child);
    child = child.sibling;
  }

  let nextNode = beforeNode;

  for (let index = children.length - 1; index >= 0; index--) {
    const currentFiber = children[index];

    const firstDomNode = commitFiber(
      currentFiber,
      parentDom,
      nextNode
    );

    if (firstDomNode) {
      nextNode = firstDomNode;
    }
  }
}

/**
 * Commits a Fiber and its descendants.
 */
export function commitWork(fiber) {
  if (!fiber) return;

  if (fiber.dom) {
    if (fiber.dom.nodeType === 1) {
      commitChildren(fiber, fiber.dom);
    }

    return;
  }

  let parent = fiber.parent;

  while (parent && !parent.dom) {
    parent = parent.parent;
  }

  const parentDom = parent?.dom || null;

  if (parentDom) {
    commitChildren(fiber, parentDom);
  }
}

/**
 * Commits the root Fiber.
 */
export function commitRoot(rootFiber, container) {
  if (!rootFiber || !container) return;

  const previousRoot = container.__nexoRootFiber || null;

  if (
    previousRoot &&
    !rootFiber.alternate &&
    previousRoot !== rootFiber
  ) {
    removeFiberDom(previousRoot);
  }

  if (rootFiber.dom) {
    if (rootFiber.dom.parentNode !== container) {
      container.appendChild(rootFiber.dom);
    }

    if (rootFiber.dom.nodeType === 1) {
      commitChildren(rootFiber, rootFiber.dom);
    }
  } else {
    commitChildren(rootFiber, container);
  }

  container.__nexoRootFiber = rootFiber;
}
