/**
 * El Nexo - Fiber Tree
 *
 * Creates and reconciles a linked Fiber tree from VDOM nodes.
 *
 * Supports:
 * - Host elements
 * - Function components
 * - Text nodes
 * - Fragments and arrays
 * - Parent / child / sibling relationships
 * - Stable component instance IDs
 * - Alternate Fiber trees
 * - DOM node reuse
 * - Hook-aware component rendering
 * - Dirty-component tracking
 * - Safe component render bailout
 * - Skipped component render tracking
 */

import { reconcileChildren } from "./reconcileChildren.js";

import { PLACEMENT, UPDATE } from "./effectTags.js";

import { isComponentDirty } from "../core/state.js";

// --------------------------------------------------
// Performance metrics
// --------------------------------------------------

let skippedComponentRenderCount = 0;
let fiberActivityCallback = null;
let replacementInstanceSequence = 0;
export function setFiberActivityCallback(callback) {
  fiberActivityCallback = typeof callback === "function" ? callback : null;
}

export function getSkippedComponentRenderCount() {
  return skippedComponentRenderCount;
}

export function resetSkippedComponentRenderCount() {
  skippedComponentRenderCount = 0;
}

// --------------------------------------------------
// Fiber creation
// --------------------------------------------------

export function createFiber(vnode, parent = null, metadata = {}) {
  if (Array.isArray(vnode)) {
    vnode = {
      type: "FRAGMENT",
      props: { children: vnode },
    };
  }

  if (typeof vnode === "string" || typeof vnode === "number") {
    vnode = {
      type: "TEXT_ELEMENT",
      props: {
        nodeValue: String(vnode),
        children: [],
      },
    };
  }

  if (!vnode || typeof vnode !== "object") {
    throw new TypeError("Invalid VNode passed to createFiber().");
  }

  return {
    type: vnode.type,
    props: vnode.props || {},
    dom: null,

    instanceId: metadata.instanceId ?? null,
    path: metadata.path ?? null,

    parent,
    child: null,
    sibling: null,

    alternate: null,
    effectTag: null,
    deletions: [],
  };
}

// --------------------------------------------------
// Child normalization
// --------------------------------------------------

function normalizeChildren(children) {
  if (children === null || children === undefined) {
    return [];
  }

  return (
    Array.isArray(children) ? children.flat(Infinity) : [children]
  ).filter(
    (child) =>
      child !== null && child !== undefined && typeof child !== "boolean",
  );
}

// --------------------------------------------------
// Component identity
// --------------------------------------------------

function getTypeName(type) {
  if (typeof type === "function") {
    return type.displayName || type.name || "Anonymous";
  }

  return String(type);
}

function getChildPath(parentPath, child, index) {
  const key = child?.props?.key;

  const identity =
    key !== null && key !== undefined ? `key:${String(key)}` : `index:${index}`;

  return `${parentPath}/${getTypeName(child?.type ?? "TEXT_ELEMENT")}:${identity}`;
}

// --------------------------------------------------
// Props comparison
// --------------------------------------------------

function haveSameProps(oldProps = {}, newProps = {}) {
  const oldKeys = Object.keys(oldProps).filter(
    (key) => key !== "children" && key !== "key",
  );

  const newKeys = Object.keys(newProps).filter(
    (key) => key !== "children" && key !== "key",
  );

  if (oldKeys.length !== newKeys.length) {
    return false;
  }

  return newKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(oldProps, key) &&
      Object.is(oldProps[key], newProps[key]),
  );
}

// --------------------------------------------------
// Fiber cloning for bailout
// --------------------------------------------------

/**
 * Creates a new Fiber based on a previous Fiber.
 *
 * The old Fiber becomes its alternate.
 * Existing DOM nodes and component identities are preserved.
 */
function cloneFiber(oldFiber, parentFiber) {
  if (!oldFiber) return null;

  const clonedFiber = createFiber(
    {
      type: oldFiber.type,
      props: oldFiber.props,
    },
    parentFiber,
    {
      instanceId: oldFiber.instanceId,
      path: oldFiber.path,
    },
  );

  clonedFiber.dom = oldFiber.dom;
  clonedFiber.alternate = oldFiber;

  clonedFiber.effectTag = haveSameProps(oldFiber.props, clonedFiber.props)
    ? null
    : UPDATE;

  return clonedFiber;
}

/**
 * Clones the previous children of a Fiber.
 *
 * This allows a component to skip its own execution
 * without losing its existing child structure.
 *
 * Descendants are still processed afterward, so a dirty
 * child component can render independently.
 */
function clonePreviousChildren(parentFiber, oldChild, renderComponent) {
  parentFiber.child = null;
  parentFiber.deletions = [];

  let previousSibling = null;
  let currentOldChild = oldChild;

  while (currentOldChild) {
    const clonedChild = cloneFiber(currentOldChild, parentFiber);

    if (previousSibling === null) {
      parentFiber.child = clonedChild;
    } else {
      previousSibling.sibling = clonedChild;
    }

    previousSibling = clonedChild;

    // Process the cloned subtree.
    // Clean components can bail out again.
    // Dirty descendants will render normally.
    populateFiber(clonedChild, renderComponent);

    currentOldChild = currentOldChild.sibling;
  }
}

// --------------------------------------------------
// Component rendering and reconciliation
// --------------------------------------------------

/**
 * Resolves a Fiber's children and recursively reconciles them.
 *
 * Safe bailout behavior:
 *
 * 1. A dirty component must render.
 * 2. A component with changed props must render.
 * 3. A clean component with unchanged props skips execution.
 * 4. Its previous child Fibers are cloned and traversed.
 * 5. Dirty descendants can still render independently.
 */
function populateFiber(fiber, renderComponent) {
  if (!fiber) return;

  const isComponent = typeof fiber.type === "function";

  // ------------------------------------------------
  // Function component
  // ------------------------------------------------

  if (isComponent) {
    const hasAlternate = Boolean(fiber.alternate);

    const dirty = isComponentDirty(fiber.instanceId);

    const propsUnchanged =
      hasAlternate && haveSameProps(fiber.alternate.props, fiber.props);

    // ----------------------------------------------
    // Safe render bailout
    // ----------------------------------------------

    if (hasAlternate && !dirty && propsUnchanged) {
      // Skip executing this component.
      skippedComponentRenderCount += 1;
      fiberActivityCallback?.({
        type: "BAILOUT",
        component: getTypeName(fiber.type),
        componentId: fiber.instanceId,
        reason: "Props unchanged and component not dirty",
      });

      // Preserve and clone its previous child structure.
      clonePreviousChildren(fiber, fiber.alternate.child, renderComponent);

      return;
    }

    // ----------------------------------------------
    // Normal component render
    // ----------------------------------------------

    const metadata = {
      instanceId: fiber.instanceId,
      path: fiber.path,
      parent: fiber.parent,
    };

    fiberActivityCallback?.({
      type: "RENDER",
      component: getTypeName(fiber.type),
      componentId: fiber.instanceId,
      reason: !hasAlternate
        ? "Initial mount"
        : dirty
          ? "State changed"
          : "Props changed",
    });
    const rendered =
      typeof renderComponent === "function"
        ? renderComponent(fiber.type, fiber.props || {}, metadata)
        : fiber.type(fiber.props || {});

    const children = normalizeChildren(rendered);

    reconcileChildren(fiber, children);
  } else {
    // ------------------------------------------------
    // Host element / text node / fragment
    // ------------------------------------------------

    const children = normalizeChildren(fiber.props?.children);

    reconcileChildren(fiber, children);
  }

  // ------------------------------------------------
  // Process descendants
  // ------------------------------------------------

  let child = fiber.child;

  while (child) {
    populateFiber(child, renderComponent);
    child = child.sibling;
  }
}

// --------------------------------------------------
// Fiber tree construction
// --------------------------------------------------

/**
 * Builds a Fiber tree from a VDOM tree.
 *
 * The fifth argument is optional:
 * alternate = previous Fiber tree.
 *
 * Existing matching Fibers reuse their DOM nodes
 * and component instance IDs.
 */
export function buildFiberTree(
  vnode,
  parent = null,
  renderComponent = null,
  parentPath = "root",
  alternate = null,
) {
  if (vnode === null || vnode === undefined || typeof vnode === "boolean") {
    return null;
  }

  if (Array.isArray(vnode)) {
    vnode = {
      type: "FRAGMENT",
      props: {
        children: vnode,
      },
    };
  }

  if (typeof vnode === "string" || typeof vnode === "number") {
    vnode = {
      type: "TEXT_ELEMENT",
      props: {
        nodeValue: String(vnode),
        children: [],
      },
    };
  }

  if (typeof vnode !== "object" || !("type" in vnode)) {
    throw new TypeError("Invalid VNode passed to buildFiberTree().");
  }

  const isComponent = typeof vnode.type === "function";

  const path = isComponent
    ? `${parentPath}/${getTypeName(vnode.type)}:${vnode.props?.key ?? "instance"}`
    : parentPath;

  const fiber = createFiber(vnode, parent, {
    path,
    instanceId: isComponent ? path : null,
  });

  // ------------------------------------------------
  // Match the previous Fiber
  // ------------------------------------------------

  if (alternate && alternate.type === fiber.type) {
    fiber.alternate = alternate;
    fiber.dom = alternate.dom;

    fiber.instanceId = alternate.instanceId ?? fiber.instanceId;

    fiber.path = alternate.path ?? fiber.path;

    fiber.effectTag = haveSameProps(alternate.props, fiber.props)
      ? null
      : UPDATE;
  } else if (alternate) {
    // Different component type: create a fresh identity.
    // Never reuse the old component's Hook state ID.
    if (isComponent) {
      fiber.instanceId = `${path}:replacement:${++replacementInstanceSequence}`;
    }

    fiber.effectTag = PLACEMENT;
  } else {
    // Initial mount.
    fiber.effectTag = PLACEMENT;
  }

  // ------------------------------------------------
  // Populate the Fiber tree
  // ------------------------------------------------

  populateFiber(fiber, renderComponent);

  return fiber;
}
