const recordsByComponent = new Map();
const renderStack = [];

/**
 * Returns a readable component name.
 */
function getComponentName(component) {
  if (typeof component === "function") {
    return component.displayName || component.name || "Anonymous";
  }

  return String(component || "Unknown");
}

/**
 * Creates a safe copy of props.
 */
function cloneProps(props = {}) {
  if (!props || typeof props !== "object") {
    return {};
  }

  return { ...props };
}

/**
 * Creates a safe copy of hook snapshots.
 */
function cloneHooks(hooks = []) {
  if (!Array.isArray(hooks)) {
    return [];
  }

  return hooks.map((hook) => ({
    ...hook,
    dependencies: Array.isArray(hook.dependencies)
      ? [...hook.dependencies]
      : hook.dependencies
  }));
}

/**
 * Compares objects using shallow equality.
 */
function areObjectsEqual(previous = {}, next = {}) {
  const previousKeys = Object.keys(previous);
  const nextKeys = Object.keys(next);

  if (previousKeys.length !== nextKeys.length) {
    return false;
  }

  return nextKeys.every((key) =>
    Object.is(previous[key], next[key])
  );
}

/**
 * Compares hook snapshots.
 */
function areHooksEqual(previous = [], next = []) {
  if (previous.length !== next.length) {
    return false;
  }

  return previous.every((previousHook, index) => {
    const nextHook = next[index];

    if (!nextHook) return false;

    return (
      previousHook.type === nextHook.type &&
      Object.is(previousHook.value, nextHook.value) &&
      areArraysEqual(
        previousHook.dependencies,
        nextHook.dependencies
      )
    );
  });
}

function areArraysEqual(previous, next) {
  if (previous === next) return true;

  if (!Array.isArray(previous) || !Array.isArray(next)) {
    return Object.is(previous, next);
  }

  if (previous.length !== next.length) return false;

  return previous.every((value, index) =>
    Object.is(value, next[index])
  );
}

/**
 * Describes changes between previous and current props.
 */
function describeChanges(previousProps = {}, nextProps = {}) {
  const changes = [];

  const allKeys = new Set([
    ...Object.keys(previousProps),
    ...Object.keys(nextProps)
  ]);

  allKeys.delete("children");
  allKeys.delete("key");

  for (const key of allKeys) {
    if (!Object.is(previousProps[key], nextProps[key])) {
      changes.push({
        property: key,
        previousValue: previousProps[key],
        nextValue: nextProps[key]
      });
    }
  }

  return changes;
}

/**
 * Resolves a unique component instance identity.
 */
function getComponentIdentity(component, metadata = {}) {
  if (metadata.instanceId != null) {
    return metadata.instanceId;
  }

  if (metadata.fiberId != null) {
    return metadata.fiberId;
  }

  return component;
}

/**
 * Starts tracking a component render.
 */
export function beginComponentRender(
  component,
  props = {},
  metadata = {}
) {
  const identity = getComponentIdentity(component, metadata);

  let record = recordsByComponent.get(identity);

  if (!record) {
    record = {
      id: identity,
      component,
      name: getComponentName(component),
      kind: metadata.kind || "component",

      props: {},
      previousProps: {},

      hooks: [],
      previousHooks: [],

      parentId: null,
      childIds: [],

      renderCount: 0,

      lastRenderTime: 0,
      lastRenderDurationMs: 0,
      totalRenderTime: 0,

      renderReason: "initial render",
      changes: [],

      isRendering: false
    };

    recordsByComponent.set(identity, record);
  }

  const parentFrame = renderStack[renderStack.length - 1];

  record.previousProps = cloneProps(record.props);
  record.previousHooks = cloneHooks(record.hooks);

  record.props = cloneProps(props);
  record.component = component;
  record.name = getComponentName(component);
  record.kind = metadata.kind || record.kind;

  record.parentId = parentFrame
    ? parentFrame.identity
    : null;

  if (parentFrame) {
    const parentRecord = recordsByComponent.get(
      parentFrame.identity
    );

    if (
      parentRecord &&
      !parentRecord.childIds.includes(identity)
    ) {
      parentRecord.childIds.push(identity);
    }
  }

  record.renderCount += 1;
  record.isRendering = true;

  record.startedAt = getCurrentTime();

  if (record.renderCount === 1) {
    record.renderReason = "initial render";
    record.changes = [];
  } else {
    record.changes = describeChanges(
      record.previousProps,
      record.props
    );

    if (
      !areObjectsEqual(
        record.previousProps,
        record.props
      )
    ) {
      record.renderReason = "props changed";
    } else if (
      !areHooksEqual(
        record.previousHooks,
        record.hooks
      )
    ) {
      record.renderReason = "state or hooks changed";
    } else {
      record.renderReason = "parent or scheduled render";
    }
  }

  renderStack.push({
    identity,
    component,
    record
  });

  return record;
}

/**
 * Returns the current high-resolution time.
 */
function getCurrentTime() {
  if (
    typeof performance !== "undefined" &&
    typeof performance.now === "function"
  ) {
    return performance.now();
  }

  return Date.now();
}

/**
 * Ends tracking a component render.
 */
export function endComponentRender(
  component,
  hookSnapshot = [],
  instanceId
) {
  if (renderStack.length === 0) {
    return null;
  }

  let frameIndex;

  if (instanceId != null) {
    frameIndex = renderStack.findLastIndex(
      (frame) => frame.identity === instanceId
    );
  } else {
    frameIndex = renderStack.findLastIndex(
      (frame) => frame.component === component
    );
  }

  if (frameIndex === -1) {
    return null;
  }

  const [frame] = renderStack.splice(frameIndex, 1);

  const record = recordsByComponent.get(frame.identity);

  if (!record) {
    return null;
  }

  const finishedAt = getCurrentTime();

  const duration = Math.max(
    0,
    finishedAt - record.startedAt
  );

  record.lastRenderTime = duration;
  record.lastRenderDurationMs = duration;
  record.totalRenderTime += duration;

  record.hooks = cloneHooks(hookSnapshot);
  record.isRendering = false;

  delete record.startedAt;

  return record;
}

/**
 * Creates a public component record.
 */
function createPublicRecord(record) {
  const parentRecord = record.parentId != null
    ? recordsByComponent.get(record.parentId)
    : null;

  const children = record.childIds
    .map((childId) => recordsByComponent.get(childId))
    .filter(Boolean);

  return {
    id: record.id,
    component: record.component,
    name: record.name,
    kind: record.kind,

    props: cloneProps(record.props),
    previousProps: cloneProps(record.previousProps),

    hooks: cloneHooks(record.hooks),
    previousHooks: cloneHooks(record.previousHooks),

    parent: parentRecord ? parentRecord.name : null,
    children: children.map((child) => child.name),

    parentId: record.parentId,
    childIds: [...record.childIds],

    renderCount: record.renderCount,

    lastRenderTime: record.lastRenderTime,
    lastRenderDurationMs: record.lastRenderDurationMs,
    totalRenderTime: record.totalRenderTime,

    renderReason: record.renderReason,
    changes: record.changes.map((change) => ({
      ...change
    })),

    isRendering: record.isRendering
  };
}

/**
 * Returns all registered component records.
 */
export function getRegisteredComponents() {
  return Array.from(recordsByComponent.values()).map(
    createPublicRecord
  );
}

/**
 * Returns a specific component instance.
 */
export function getComponentRecord(instanceId) {
  const record = recordsByComponent.get(instanceId);

  return record
    ? createPublicRecord(record)
    : null;
}

/**
 * Removes a component instance from the registry.
 */
export function unregisterComponent(instanceId) {
  const record = recordsByComponent.get(instanceId);

  if (!record) return;

  if (record.parentId != null) {
    const parentRecord = recordsByComponent.get(
      record.parentId
    );

    if (parentRecord) {
      parentRecord.childIds = parentRecord.childIds.filter(
        (childId) => childId !== instanceId
      );
    }
  }

  for (const childId of record.childIds) {
    const childRecord = recordsByComponent.get(childId);

    if (childRecord) {
      childRecord.parentId = null;
    }
  }

  recordsByComponent.delete(instanceId);

  for (let index = renderStack.length - 1; index >= 0; index--) {
    if (renderStack[index].identity === instanceId) {
      renderStack.splice(index, 1);
    }
  }
}

/**
 * Clears the component registry.
 */
export function clearComponentRegistry() {
  recordsByComponent.clear();
  renderStack.length = 0;
}