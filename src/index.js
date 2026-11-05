/**
 * El Nexo public API.
 *
 * The implementation remains intentionally small and educational. Consumers
 * can import the VDOM renderer, state hooks, Fiber primitives, and DevTools
 * utilities from this single entry point.
 */

export { createElement } from "./vdom/createElement.js";
export { render, createDom } from "./renderer/render.js";
export { reconcile } from "./reconciler/reconcile.js";

export {
  beginComponent,
  endComponent,
  setUpdateCallback,
  useState,
  useEffect,
  useMemo,
  getComponentHookSnapshot
} from "./core/state.js";

export { createFiber, buildFiberTree } from "./fiber/fiber.js";
export { createDomForFiber, performWork } from "./fiber/performWork.js";
export { performUnitOfWork, workLoop } from "./fiber/workLoop.js";
export { commitWork, commitRoot } from "./fiber/commitWork.js";
export { reconcileChildren } from "./fiber/reconcileChildren.js";
export { PLACEMENT, UPDATE, DELETION } from "./fiber/effectTags.js";

export {
  beginComponentRender,
  endComponentRender,
  getRegisteredComponents,
  clearComponentRegistry
} from "./devtools/componentRegistry.js";

export { renderFiberInspector } from "./devtools/fiberInspector.js";
