
import { reconcileChildren } from "./reconcileChildren.js";

/**
 * Maps framework event props to native DOM events.
 */
function getNativeEventName(key, dom) {
  const eventName = key.slice(2).toLowerCase();

  // React-like onChange behaviour for text inputs.
  if (
    eventName === "change" &&
    dom.tagName === "INPUT" &&
    !["checkbox", "radio", "file"].includes(dom.type)
  ) {
    return "input";
  }

  return eventName;
}

/**
 * Creates a DOM node for a Fiber.
 */
export function createDomForFiber(fiber) {
  if (!fiber || typeof fiber.type === "function") {
    return null;
  }

  if (fiber.type === "TEXT_ELEMENT") {
    return document.createTextNode(
      String(fiber.props?.nodeValue ?? "")
    );
  }

  const dom = document.createElement(fiber.type);

  for (const [key, value] of Object.entries(fiber.props || {})) {
    if (key === "children" || key === "key") {
      continue;
    }

    if (key.startsWith("on") && typeof value === "function") {
      const eventName = getNativeEventName(key, dom);

      if (!dom.__nexoEvents) {
        dom.__nexoEvents = {};
      }

      dom.addEventListener(eventName, value);
      dom.__nexoEvents[eventName] = value;
      continue;
    }

    if (key === "className") {
      dom.className = value ?? "";
      continue;
    }

    if (key === "style" && value && typeof value === "object") {
      Object.assign(dom.style, value);
      continue;
    }

    if (key === "style" && typeof value === "string") {
      dom.style.cssText = value;
      continue;
    }

    try {
      if (key in dom) {
        dom[key] = value ?? "";
        continue;
      }
    } catch {
      // Fall back to attribute handling.
    }

    if (value === false || value === null || value === undefined) {
      dom.removeAttribute(key);
    } else {
      dom.setAttribute(key, String(value));
    }
  }

  return dom;
}

/**
 * Converts primitive children into text VNodes.
 */
function normalizeChildren(children = []) {
  return children
    .flat(Infinity)
    .filter(
      (child) =>
        child !== null &&
        child !== undefined &&
        typeof child !== "boolean"
    )
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") {
        return {
          type: "TEXT_ELEMENT",
          props: {
            nodeValue: String(child),
            children: []
          }
        };
      }

      return child;
    });
}

/**
 * Performs work for an individual Fiber.
 */
export function performWork(fiber) {
  if (!fiber) {
    return null;
  }

  if (typeof fiber.type === "function") {
    return fiber;
  }

  if (fiber.dom === null || fiber.dom === undefined) {
    fiber.dom = createDomForFiber(fiber);
  }

  if (!fiber.child) {
    const children = normalizeChildren(
      fiber.props?.children || []
    );

    if (children.length > 0) {
      reconcileChildren(fiber, children);
    }
  }

  return fiber;
}
