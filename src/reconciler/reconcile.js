
import { createDom } from "../renderer/render.js";

function isMissingVNode(vnode) {
  return vnode === null || vnode === undefined || typeof vnode === "boolean";
}

function isTextVNode(vnode) {
  return typeof vnode === "string" || typeof vnode === "number";
}

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

  if (key === "className") {
    dom.className = value ?? "";
    return;
  }

  if (key === "style" && value && typeof value === "object") {
    Object.assign(dom.style, value);
    return;
  }

  if (key in dom && key !== "form") {
    try {
      dom[key] = value ?? "";
      return;
    } catch {
      // Fall back to attributes below.
    }
  }

  if (value === false || value === null || value === undefined) {
    dom.removeAttribute(key);
  } else {
    dom.setAttribute(key, String(value));
  }
}

function removeDomProperty(dom, key, oldValue) {
  if (key === "children" || key === "key") return;

  if (key.startsWith("on") && typeof oldValue === "function") {
    const eventName = key.slice(2).toLowerCase();
    const registered = dom.__nexoEvents?.[eventName] || oldValue;

    dom.removeEventListener(eventName, registered);

    if (dom.__nexoEvents) {
      delete dom.__nexoEvents[eventName];
    }

    return;
  }

  if (key === "className") {
    dom.className = "";
    dom.removeAttribute("class");
    return;
  }

  if (key === "value" || key === "checked" || key === "selected") {
    dom[key] = key === "value" ? "" : false;
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

function updateProps(dom, oldProps = {}, newProps = {}) {
  for (const [key, oldValue] of Object.entries(oldProps)) {
    if (key === "children" || key === "key") continue;

    if (!(key in newProps)) {
      removeDomProperty(dom, key, oldValue);
    }
  }

  for (const [key, value] of Object.entries(newProps)) {
    if (key === "children" || key === "key") continue;

    // Event handlers must be replaced even when their key is unchanged.
    if (key.startsWith("on") && typeof value === "function") {
      setDomProperty(dom, key, value);
      continue;
    }

    if (oldProps[key] !== value) {
      setDomProperty(dom, key, value);
    }
  }
}

export function reconcile(dom, oldVNode, newVNode) {
  const oldMissing = isMissingVNode(oldVNode);
  const newMissing = isMissingVNode(newVNode);

  if (oldMissing && newMissing) return null;

  if (oldMissing) {
    const newDom = createDom(newVNode);
    if (dom?.parentNode) {
      dom.parentNode.insertBefore(newDom, dom);
    }
    return newDom;
  }

  if (newMissing) {
    dom?.remove();
    return null;
  }

  if (isTextVNode(oldVNode) && isTextVNode(newVNode)) {
    const nextText = String(newVNode);

    if (dom.nodeValue !== nextText) {
      dom.nodeValue = nextText;
    }

    return dom;
  }

  if (
    isTextVNode(oldVNode) !== isTextVNode(newVNode) ||
    oldVNode.type !== newVNode.type
  ) {
    const newDom = createDom(newVNode);

    if (dom?.parentNode) {
      dom.parentNode.replaceChild(newDom, dom);
    }

    return newDom;
  }

  updateProps(
    dom,
    oldVNode.props || {},
    newVNode.props || {}
  );

  const oldChildren = (oldVNode.props?.children || []).flat(Infinity);
  const newChildren = (newVNode.props?.children || []).flat(Infinity);

  // Keep the original child references so removals don't shift the
  // DOM indexes used by later reconciliation operations.
  const maxLength = Math.max(oldChildren.length, newChildren.length);

  for (let index = 0; index < maxLength; index += 1) {
    const oldChild = oldChildren[index];
    const newChild = newChildren[index];
    const childDom = dom.childNodes[index] || null;

    const oldChildMissing = isMissingVNode(oldChild);
    const newChildMissing = isMissingVNode(newChild);

    if (oldChildMissing && newChildMissing) continue;

    if (oldChildMissing && !newChildMissing) {
      const newChildDom = createDom(newChild);
      const referenceNode = dom.childNodes[index] || null;
      dom.insertBefore(newChildDom, referenceNode);
      continue;
    }

    if (!oldChildMissing && newChildMissing) {
      childDom?.remove();
      continue;
    }

    if (childDom) {
      reconcile(childDom, oldChild, newChild);
    }
  }

  return dom;
}
