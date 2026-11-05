
function isTextVNode(vnode) {
  return typeof vnode === "string" || typeof vnode === "number";
}

function setProperty(dom, key, value) {
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

  try {
    if (key in dom) {
      dom[key] = value ?? "";
      return;
    }
  } catch {
    // Fall through to attribute handling.
  }

  if (value === false || value === null || value === undefined) {
    dom.removeAttribute(key);
  } else {
    dom.setAttribute(key, String(value));
  }
}

export function createDom(vnode) {
  if (vnode === null || vnode === undefined || typeof vnode === "boolean") {
    return document.createComment("empty");
  }

  if (isTextVNode(vnode)) {
    return document.createTextNode(String(vnode));
  }

  // Components should already have been resolved by main.js.
  if (typeof vnode.type === "function") {
    throw new Error(
      `Unresolved component "${vnode.type.name || "Anonymous"}". ` +
      "Resolve component VNodes before calling createDom()."
    );
  }

  if (vnode.type === "TEXT_ELEMENT") {
    return document.createTextNode(
      String(vnode.props?.nodeValue ?? "")
    );
  }

  const dom = document.createElement(vnode.type);

  for (const [key, value] of Object.entries(vnode.props || {})) {
    setProperty(dom, key, value);
  }

  for (const child of (vnode.props?.children || []).flat(Infinity)) {
    if (child === null || child === undefined || typeof child === "boolean") {
      continue;
    }

    dom.appendChild(createDom(child));
  }

  return dom;
}

export function render(vnode, container) {
  const dom = createDom(vnode);
  container.appendChild(dom);
  return dom;
}
