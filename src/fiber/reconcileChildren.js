import { createFiber } from "./fiber.js";

import {
  PLACEMENT,
  UPDATE,
  DELETION,
} from "./effectTags.js";

function normalizeElement(element) {
  if (typeof element === "string" || typeof element === "number") {
    return {
      type: "TEXT_ELEMENT",
      props: {
        nodeValue: String(element),
        children: [],
      },
    };
  }

  return element;
}

function normalizeElements(elements) {
  if (!Array.isArray(elements)) {
    elements = [elements];
  }

  return elements
    .flat(Infinity)
    .filter(
      (element) =>
        element !== null &&
        element !== undefined &&
        typeof element !== "boolean",
    )
    .map(normalizeElement);
}

function isSameType(oldFiber, element) {
  return oldFiber.type === element.type;
}

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

function getElementKey(element) {
  return element?.props?.key ?? null;
}

function getTypeName(type) {
  if (typeof type === "function") {
    return type.displayName || type.name || "Anonymous";
  }

  return String(type);
}

function createFiberPath(parentFiber, element, index) {
  const parentPath = parentFiber.path || "root";
  const key = getElementKey(element);

  const identity =
    key !== null ? `key:${String(key)}` : `index:${index}`;

  return `${parentPath}/${getTypeName(element.type)}:${identity}`;
}

function createFiberMetadata(element, parentFiber, index) {
  const path = createFiberPath(parentFiber, element, index);

  return {
    path,
    instanceId:
      typeof element.type === "function" ? path : null,
  };
}

function createUpdatedFiber(element, parentFiber, oldFiber, index) {
  const metadata = createFiberMetadata(
    element,
    parentFiber,
    index,
  );

  const newFiber = createFiber(element, parentFiber, {
    path: oldFiber.path || metadata.path,
    instanceId: oldFiber.instanceId ?? metadata.instanceId,
  });

  newFiber.dom = oldFiber.dom;
  newFiber.alternate = oldFiber;

  newFiber.effectTag = haveSameProps(
    oldFiber.props,
    newFiber.props,
  )
    ? null
    : UPDATE;

  return newFiber;
}

function createPlacementFiber(element, parentFiber, index) {
  const metadata = createFiberMetadata(
    element,
    parentFiber,
    index,
  );

  const newFiber = createFiber(element, parentFiber, metadata);

  newFiber.effectTag = PLACEMENT;

  return newFiber;
}

function markForDeletion(parentFiber, oldFiber) {
  oldFiber.effectTag = DELETION;
  parentFiber.deletions.push(oldFiber);
}

/**
 * Reconciles new children against the previous Fiber children.
 *
 * Matching Fibers reuse their DOM nodes and component identities.
 * New Fibers receive PLACEMENT.
 * Removed Fibers receive DELETION.
 */
export function reconcileChildren(parentFiber, elements = []) {
  if (!parentFiber) {
    return null;
  }

  const newElements = normalizeElements(elements);
  const oldFibers = [];

  let oldFiber = parentFiber.alternate?.child ?? null;

  while (oldFiber) {
    oldFibers.push(oldFiber);
    oldFiber = oldFiber.sibling;
  }

  parentFiber.child = null;
  parentFiber.deletions = [];

  const usedOldFibers = new Set();
  let previousSibling = null;

  for (let index = 0; index < newElements.length; index++) {
    const element = newElements[index];
    const elementKey = getElementKey(element);

    let matchingOldFiber = null;

    if (elementKey !== null) {
      matchingOldFiber =
        oldFibers.find(
          (candidate) =>
            !usedOldFibers.has(candidate) &&
            getElementKey(candidate) === elementKey &&
            isSameType(candidate, element),
        ) || null;
    } else {
      const candidate = oldFibers[index];

      if (
        candidate &&
        !usedOldFibers.has(candidate) &&
        getElementKey(candidate) === null &&
        isSameType(candidate, element)
      ) {
        matchingOldFiber = candidate;
      }
    }

    let newFiber;

    if (matchingOldFiber) {
      usedOldFibers.add(matchingOldFiber);

      newFiber = createUpdatedFiber(
        element,
        parentFiber,
        matchingOldFiber,
        index,
      );
    } else {
      newFiber = createPlacementFiber(
        element,
        parentFiber,
        index,
      );
    }

    if (previousSibling === null) {
      parentFiber.child = newFiber;
    } else {
      previousSibling.sibling = newFiber;
    }

    previousSibling = newFiber;
  }

  for (const oldChild of oldFibers) {
    if (!usedOldFibers.has(oldChild)) {
      markForDeletion(parentFiber, oldChild);
    }
  }

  return parentFiber.child;
}