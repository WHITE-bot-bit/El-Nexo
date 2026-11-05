
const componentHooks = new Map();
const componentContextStack = [];
const dirtyComponents = new Set();

let currentComponent = null;
let hookIndex = 0;
let updateCallback = null;

function getCurrentHooks(hookName = "useState") {
  if (currentComponent === null) {
    throw new Error(
      `${hookName} must be called while rendering a component.`
    );
  }

  return componentHooks.get(currentComponent);
}

function areDependenciesEqual(previous, next) {
  if (
    !Array.isArray(previous) ||
    !Array.isArray(next) ||
    previous.length !== next.length
  ) {
    return false;
  }

  return next.every((value, index) =>
    Object.is(value, previous[index])
  );
}

/**
 * Begin rendering a component instance.
 */
export function beginComponent(componentId) {
  if (
    componentId === null ||
    componentId === undefined
  ) {
    throw new Error("beginComponent requires a component ID.");
  }

  componentContextStack.push({
    component: currentComponent,
    hookIndex
  });

  currentComponent = componentId;
  hookIndex = 0;

  if (!componentHooks.has(componentId)) {
    componentHooks.set(componentId, []);
  }
}

/**
 * Finish rendering and execute pending effects.
 */
export function endComponent() {
  if (currentComponent === null) return;

  const finishedComponent = currentComponent;
  const hooks = componentHooks.get(finishedComponent) || [];

  const previousContext = componentContextStack.pop();

  currentComponent = previousContext?.component ?? null;
  hookIndex = previousContext?.hookIndex ?? 0;

  for (const hook of hooks) {
    if (hook?.type !== "effect" || !hook.pending) {
      continue;
    }

    hook.pending = false;

    if (typeof hook.cleanup === "function") {
      hook.cleanup();
    }

    const cleanup = hook.effect();

    hook.cleanup =
      typeof cleanup === "function"
        ? cleanup
        : undefined;
  }
}

/**
 * Register the callback responsible for scheduling updates.
 */
export function setUpdateCallback(callback) {
  updateCallback = callback;
}

/**
 * Return all component IDs with pending state updates.
 */
export function getDirtyComponents() {
  return [...dirtyComponents];
}

/**
 * Check whether a component has a pending state update.
 */
export function isComponentDirty(componentId) {
  return dirtyComponents.has(componentId);
}

/**
 * Clear dirty tracking.
 */
export function clearDirtyComponents(componentId) {
  if (arguments.length > 0) {
    dirtyComponents.delete(componentId);
    return;
  }

  dirtyComponents.clear();
}

/**
 * useState hook.
 */
export function useState(initialValue) {
  const hooks = getCurrentHooks("useState");
  const componentId = currentComponent;
  const index = hookIndex++;

  if (!hooks[index] || hooks[index].type !== "state") {
    hooks[index] = {
      type: "state",
      value:
        typeof initialValue === "function"
          ? initialValue()
          : initialValue
    };
  }

  const hook = hooks[index];

  function setState(newValue) {
    if (!componentHooks.has(componentId)) {
      console.warn(
        "[El Nexo] Ignored update from unmounted component:",
        componentId
      );
      return;
    }

    const previousValue = hook.value;

    const nextValue =
      typeof newValue === "function"
        ? newValue(previousValue)
        : newValue;

    console.log("[El Nexo] State update:", {
      componentId,
      previousValue,
      nextValue
    });

    if (Object.is(previousValue, nextValue)) {
      console.log("[El Nexo] State unchanged. Skipping update.");
      return;
    }

    hook.value = nextValue;

    dirtyComponents.add(componentId);

    console.log("[El Nexo] Marked dirty:", componentId);
    console.log(
      "[El Nexo] Dirty components:",
      [...dirtyComponents]
    );

    if (typeof updateCallback === "function") {
      updateCallback(componentId);
    } else {
      console.warn("[El Nexo] No update callback registered.");
    }
  }

  return [hook.value, setState];
}

/**
 * useEffect hook.
 */
export function useEffect(effect, dependencies) {
  if (typeof effect !== "function") {
    throw new TypeError("useEffect expects a function.");
  }

  const hooks = getCurrentHooks("useEffect");
  const index = hookIndex++;

  let hook = hooks[index];

  if (!hook || hook.type !== "effect") {
    hook = {
      type: "effect",
      effect,
      dependencies,
      cleanup: undefined,
      pending: true
    };

    hooks[index] = hook;
    return;
  }

  const changed =
    dependencies === undefined ||
    !areDependenciesEqual(
      hook.dependencies,
      dependencies
    );

  hook.effect = effect;

  if (changed) {
    hook.dependencies = dependencies;
    hook.pending = true;
  }
}

/**
 * useMemo hook.
 */
export function useMemo(factory, dependencies) {
  if (typeof factory !== "function") {
    throw new TypeError("useMemo expects a function.");
  }

  const hooks = getCurrentHooks("useMemo");
  const index = hookIndex++;

  let hook = hooks[index];

  if (
    !hook ||
    hook.type !== "memo" ||
    !areDependenciesEqual(
      hook.dependencies,
      dependencies
    )
  ) {
    hook = {
      type: "memo",
      value: factory(),
      dependencies
    };

    hooks[index] = hook;
  }

  return hook.value;
}

/**
 * Return a read-only snapshot of component hooks.
 */
export function getComponentHookSnapshot(componentId) {
  const hooks = componentHooks.get(componentId) || [];

  return hooks.map((hook, index) => {
    if (!hook) {
      return {
        index: index + 1,
        type: "uninitialized"
      };
    }

    const hookNames = {
      state: "useState",
      effect: "useEffect",
      memo: "useMemo"
    };

    const snapshot = {
      index: index + 1,
      type: hook.type,
      name: hookNames[hook.type] || hook.type
    };

    if (
      hook.type === "state" ||
      hook.type === "memo"
    ) {
      snapshot.value = hook.value;
    }

    if (
      hook.type === "effect" ||
      hook.type === "memo"
    ) {
      snapshot.dependencies = hook.dependencies;
    }

    if (hook.type === "effect") {
      snapshot.hasCleanup =
        typeof hook.cleanup === "function";

      snapshot.pending = Boolean(hook.pending);
    }

    return snapshot;
  });
}

/**
 * Remove a component instance's hook state.
 */
export function cleanupComponent(componentId) {
  const hooks = componentHooks.get(componentId);

  if (!hooks) return;

  for (const hook of hooks) {
    if (
      hook?.type === "effect" &&
      typeof hook.cleanup === "function"
    ) {
      hook.cleanup();
      hook.cleanup = undefined;
    }
  }

  componentHooks.delete(componentId);
  dirtyComponents.delete(componentId);
}

/**
 * Clear all component hook state.
 */
export function resetHooks() {
  for (const componentId of componentHooks.keys()) {
    cleanupComponent(componentId);
  }

  componentHooks.clear();
  dirtyComponents.clear();
  componentContextStack.length = 0;

  currentComponent = null;
  hookIndex = 0;
  updateCallback = null;
}
