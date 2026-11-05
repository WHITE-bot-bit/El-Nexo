import { performWork } from "./performWork.js";

export function performUnitOfWork(fiber) {
  if (!fiber) return null;

  if (fiber.child) {
    return fiber.child;
  }

  let nextFiber = fiber;

  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }

    nextFiber = nextFiber.parent;
  }

  return null;
}

export function workLoop(rootFiber) {
  if (!rootFiber) return null;

  let nextFiber = rootFiber;

  while (nextFiber) {
    performWork(nextFiber);
    nextFiber = performUnitOfWork(nextFiber);
  }

  console.log("WORK LOOP COMPLETED");

  return rootFiber;
}