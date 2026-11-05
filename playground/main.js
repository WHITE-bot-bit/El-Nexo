import { createElement } from "../src/vdom/createElement.js";
import {
  beginComponent,
  endComponent,
  getComponentHookSnapshot,
  setUpdateCallback,
  getDirtyComponents,
  clearDirtyComponents,
  useState,
  useEffect,
  useMemo,
} from "../src/core/state.js";
import {
  buildFiberTree,
  getSkippedComponentRenderCount,
  setFiberActivityCallback,
} from "../src/fiber/fiber.js";
import { workLoop } from "../src/fiber/workLoop.js";
import { commitRoot } from "../src/fiber/commitWork.js";
import { renderFiberInspector } from "../src/devtools/fiberInspector.js";
import {
  beginComponentRender,
  endComponentRender,
  getRegisteredComponents,
} from "../src/devtools/componentRegistry.js";

const $ = (id) => document.getElementById(id);

const root = $("root");
const treeContainer = $("fiber-inspector");
const detailsContainer = $("fiber-details");
const statsContainer = $("fiber-stats");
const searchInput = $("fiber-search");

const activityLog = $("activity-log");
const activityCount = $("activity-count");
const renderCountOutput = $("render-count");
const nodeCountOutput = $("activity-node-count");
const lastRenderOutput = $("last-render-time");
const clearActivityButton = $("clear-activity");

const componentList = $("component-list");
const componentDetails = $("component-details");
const componentSearch = $("component-search");
const componentCountOutput = $("component-count");

const sidebar = $("project-sidebar");
const performanceFrame = $("performance-frame");

const MAX_ACTIVITY_ITEMS = 30;

let renderCount = 0;
let componentRenderCount = 0;
let totalComponentRenderDuration = 0;
let currentVNode = null;
let currentFiberSnapshot = null;
let activityItems = [];
let activeActivityFilter = "all";
let selectedComponentId = null;
let isUpdating = false;
let pendingUpdateReason = null;
let ActiveApp = App;
// The preview Fiber visualizer is opt-in after the user runs editor code.
let showPreviewFiberTree = false;
let previewFiberAnimationVersion = 0;

// --------------------------------------------------
// Example components
// --------------------------------------------------

function CounterA() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState("El Nexo A");

  return createElement(
    "section",
    { className: "counter-card", "data-component": "CounterA" },
    createElement("h2", null, name),
    createElement("p", null, `Count: ${count}`),
    createElement(
      "button",
      { onClick: () => setCount((value) => value + 1) },
      "Increment A",
    ),
    createElement(
      "button",
      { onClick: () => setName("Counter A Updated") },
      "Change Name A",
    ),
  );
}

function CounterB() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState("El Nexo B");

  return createElement(
    "section",
    { className: "counter-card", "data-component": "CounterB" },
    createElement("h2", null, name),
    createElement("p", null, `Count: ${count}`),
    createElement(
      "button",
      { onClick: () => setCount((value) => value + 1) },
      "Increment B",
    ),
    createElement(
      "button",
      { onClick: () => setName("Counter B Updated") },
      "Change Name B",
    ),
  );
}

function App() {
  return createElement(
    "div",
    { className: "demo-app" },
    createElement("h1", null, "El Nexo · Multiple Hooks"),
    createElement(
      "p",
      null,
      "Change state and inspect the updated runtime snapshot.",
    ),
    createElement(CounterA, {}),
    createElement(CounterB, {}),
  );
}

// --------------------------------------------------
// Fiber component rendering
// --------------------------------------------------

function renderFiberComponent(component, props = {}, metadata = {}) {
  const startedAt = performance.now();
  const componentId = metadata.instanceId || component;
  const componentName = component.name || "Anonymous";

  beginComponentRender(component, props, {
    kind: "Function component",
    instanceId: componentId,
    path: metadata.path || null,
  });

  beginComponent(componentId);

  try {
    return component(props);
  } finally {
    endComponent();

    const duration = performance.now() - startedAt;

    componentRenderCount += 1;
    totalComponentRenderDuration += duration;

    endComponentRender(
      component,
      getComponentHookSnapshot(componentId),
      componentId,
    );

    recordActivity(
      "RENDER",
      `RENDER: ${componentName}`,
      `${duration.toFixed(3)} ms · ${componentId}`,
    );
  }
}

// --------------------------------------------------
// General UI helpers
// --------------------------------------------------

function formatValue(value) {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "function") return "[Function]";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "bigint") return `${value}n`;

  try {
    const result = JSON.stringify(value);
    return result === undefined ? String(value) : result;
  } catch {
    return "[Object]";
  }
}

function makeElement(tag, className = "", text = "") {
  const element = document.createElement(tag);

  if (className) element.className = className;
  element.textContent = text;

  return element;
}

function appendDefinitionList(container, entries, emptyMessage = "None") {
  if (!entries.length) {
    container.appendChild(makeElement("p", "inspector-empty", emptyMessage));
    return;
  }

  const list = makeElement("dl", "component-metadata");

  for (const [label, value] of entries) {
    list.append(makeElement("dt", "", label), makeElement("dd", "", value));
  }

  container.appendChild(list);
}

function renderHookDetails(container, hooks = []) {
  container.appendChild(makeElement("h4", "", "Hooks and state"));

  if (!hooks.length) {
    container.appendChild(
      makeElement(
        "p",
        "inspector-empty",
        "This component did not call any hooks.",
      ),
    );
    return;
  }

  const list = makeElement("div", "hook-inspection-list");

  hooks.forEach((hook, index) => {
    const card = makeElement("article", "hook-inspection-card");
    const hookName = hook.name || hook.type || "Hook";

    card.appendChild(
      makeElement(
        "div",
        "hook-inspection-title",
        `Hook ${hook.index ?? index + 1} · ${hookName}`,
      ),
    );

    if (Object.prototype.hasOwnProperty.call(hook, "value")) {
      card.appendChild(
        makeElement("div", "hook-inspection-value", formatValue(hook.value)),
      );
    }

    if (Object.prototype.hasOwnProperty.call(hook, "dependencies")) {
      card.appendChild(
        makeElement(
          "div",
          "hook-inspection-meta",
          `Dependencies: ${formatValue(hook.dependencies)}`,
        ),
      );
    }

    list.appendChild(card);
  });

  container.appendChild(list);
}

// --------------------------------------------------
// Component Explorer
// --------------------------------------------------

function renderComponentsExplorer() {
  if (!componentList || !componentDetails) return;

  const allComponents = getRegisteredComponents() || [];
  const query = componentSearch?.value.trim().toLowerCase() || "";

  // The component with the latest timestamp is the most recently rendered.
  const latestComponent = allComponents.reduce((latest, component) => {
    if (!latest) return component;

    const latestTime = Date.parse(latest.lastRenderedAt || "") || 0;
    const currentTime = Date.parse(component.lastRenderedAt || "") || 0;

    return currentTime > latestTime ? component : latest;
  }, null);

  const filteredComponents = allComponents.filter((component) => {
    const propsText = Object.entries(component.props || {})
      .map(([key, value]) => `${key} ${formatValue(value)}`)
      .join(" ");

    const hooksText = (component.hooks || [])
      .map((hook) => `${hook.name || hook.type} ${formatValue(hook.value)}`)
      .join(" ");

    const changesText = (component.changes || [])
      .map(
        (change) =>
          `${change.description || ""} ${change.name || ""} ${formatValue(change.previousValue)} ${formatValue(change.currentValue)}`,
      )
      .join(" ");

    return [
      component.name,
      component.kind,
      component.parent,
      component.renderReason,
      ...(component.children || []),
      propsText,
      hooksText,
      changesText,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  if (!filteredComponents.some((item) => item.id === selectedComponentId)) {
    selectedComponentId = filteredComponents[0]?.id ?? null;
  }

  // Display the total registry count, not the filtered search count.
  if (componentCountOutput) {
    componentCountOutput.textContent = `${allComponents.length} COMPONENT${allComponents.length === 1 ? "" : "S"}`;
  }

  updateStudioMetrics();

  componentList.replaceChildren();

  if (!filteredComponents.length) {
    componentList.appendChild(
      makeElement(
        "p",
        "inspector-empty",
        allComponents.length
          ? "No components match this search."
          : "Render the preview to populate the component registry.",
      ),
    );
  }

  filteredComponents.forEach((component) => {
    const card = makeElement("button", "component-card");
    card.type = "button";

    card.setAttribute(
      "aria-pressed",
      String(component.id === selectedComponentId),
    );

    if (component.id === selectedComponentId) {
      card.classList.add("is-selected");
    }

    if (latestComponent && component.id === latestComponent.id) {
      card.classList.add("is-latest-render");
    }

    const heading = makeElement("div", "component-card-heading");

    heading.append(
      makeElement("strong", "", component.name || "Anonymous component"),
      makeElement("span", "", "↗"),
    );

    const parent = component.parent
      ? `Child of ${component.parent}`
      : "Root component";

    card.append(
      heading,
      makeElement(
        "span",
        "component-type",
        component.kind || "Function component",
      ),
      makeElement("p", "component-card-parent", parent),
    );

    const metrics = makeElement("div", "component-metrics");

    metrics.append(
      makeElement("span", "", `${(component.hooks || []).length} hooks`),
      makeElement("span", "", `${component.renderCount ?? 0} renders`),
      makeElement(
        "span",
        "",
        `${Number(component.lastRenderDurationMs || 0).toFixed(2)} ms`,
      ),
    );

    card.appendChild(metrics);

    card.appendChild(
      makeElement(
        "p",
        "component-render-reason",
        component.renderReason || "Render reason not recorded",
      ),
    );

    if (component.changes?.length) {
      const changeSummary = makeElement("div", "component-change-summary");

      changeSummary.textContent = component.changes
        .map((change) => change.description || change.name)
        .filter(Boolean)
        .join(" · ");

      card.appendChild(changeSummary);
    }

    card.addEventListener("click", () => {
      selectedComponentId = component.id;
      renderComponentsExplorer();
    });

    componentList.appendChild(card);
  });

  componentDetails.replaceChildren();

  const selected = allComponents.find(
    (component) => component.id === selectedComponentId,
  );

  if (!selected) {
    componentDetails.appendChild(
      makeElement(
        "p",
        "inspector-empty",
        "Select a registered component to inspect its metadata.",
      ),
    );
    return;
  }

  componentDetails.appendChild(makeElement("h3", "", selected.name));

  componentDetails.appendChild(
    makeElement(
      "span",
      "kind-pill kind-component",
      selected.kind || "Function component",
    ),
  );

  componentDetails.appendChild(
    makeElement(
      "p",
      "component-description",
      "Details from the latest component registry snapshot.",
    ),
  );

  componentDetails.appendChild(makeElement("h4", "", "Runtime metadata"));

  appendDefinitionList(componentDetails, [
    ["Registry ID", selected.id],
    ["Parent", selected.parent || "Root"],
    ["Children", (selected.children || []).join(", ") || "None"],
    ["Render count", String(selected.renderCount ?? 0)],
    ["Render reason", selected.renderReason || "Not recorded"],
    [
      "Last render",
      selected.lastRenderedAt
        ? new Date(selected.lastRenderedAt).toLocaleTimeString()
        : "—",
    ],
    [
      "Last duration",
      `${Number(selected.lastRenderDurationMs || 0).toFixed(2)} ms`,
    ],
  ]);

  // Show exact previous and current values for recorded changes.
  componentDetails.appendChild(makeElement("h4", "", "Why Did This Render?"));

  if (selected.changes?.length) {
    const changeList = makeElement("div", "component-change-list");

    selected.changes.forEach((change) => {
      const item = makeElement("div", "component-change-item");

      item.appendChild(
        makeElement(
          "strong",
          "component-change-title",
          change.description || change.name || "Value changed",
        ),
      );

      item.appendChild(
        makeElement(
          "p",
          "component-change-values",
          `${formatValue(change.previousValue)} → ${formatValue(change.currentValue)}`,
        ),
      );

      changeList.appendChild(item);
    });

    componentDetails.appendChild(changeList);
  } else {
    componentDetails.appendChild(
      makeElement(
        "p",
        "inspector-empty",
        selected.renderCount <= 1
          ? "This component has not rendered again yet."
          : "No prop or state changes were detected by the registry.",
      ),
    );
  }

  componentDetails.appendChild(makeElement("h4", "", "Props"));

  appendDefinitionList(
    componentDetails,
    Object.entries(selected.props || {}).map(([key, value]) => [
      key,
      formatValue(value),
    ]),
    "No props passed to this component.",
  );

  renderHookDetails(componentDetails, selected.hooks || []);
}

// --------------------------------------------------
// NEXUS Performance Command Center bridge
// --------------------------------------------------

function getPerformanceSnapshot() {
  const components = (getRegisteredComponents() || []).map((component) => ({
    id: component.id,
    name: component.name || "Anonymous",
    kind: component.kind || "Function component",
    parent: component.parent || null,
    children: Array.isArray(component.children) ? [...component.children] : [],
    renderCount: Number(component.renderCount) || 0,
    lastRenderDurationMs:
      component.lastRenderDurationMs != null &&
      Number.isFinite(Number(component.lastRenderDurationMs))
        ? Number(component.lastRenderDurationMs)
        : null,
    renderReason: component.renderReason || "Not recorded",
  }));

  const skippedRenders = getSkippedComponentRenderCount();

  return {
    renderCount,
    fiberNodeCount: countFiberNodes(currentFiberSnapshot),
    registryCount: components.length,
    componentRenderCount,
    averageComponentRenderMs: componentRenderCount
      ? totalComponentRenderDuration / componentRenderCount
      : null,
    skippedRenders,
    components,
    updatedAt: new Date().toISOString(),
  };
}

function publishPerformanceSnapshot() {
  const snapshot = getPerformanceSnapshot();

  // The performance page reads this initial snapshot when its iframe loads.
  window.__EL_NEXO_PERFORMANCE__ = snapshot;

  // The performance page listens for this event on the parent document.
  document.dispatchEvent(
    new CustomEvent("elnexo:runtime-snapshot", { detail: snapshot }),
  );
}

function publishPerformanceEvent(item) {
  const event = {
    kind: item.kind,
    type: item.kind,
    title: item.title,
    description: item.description,
    time: item.time,
  };

  document.dispatchEvent(
    new CustomEvent("elnexo:runtime-event", { detail: event }),
  );
}

performanceFrame?.addEventListener("load", () => {
  publishPerformanceSnapshot();

  // Replay the current session's recent events if the iframe was opened late.
  [...activityItems].reverse().forEach(publishPerformanceEvent);
});

// --------------------------------------------------
// Live Fiber inspection
// --------------------------------------------------

function countFiberNodes(fiber) {
  if (!fiber) return 0;

  let total = 0;
  const stack = [fiber];
  const visited = new Set();

  while (stack.length > 0) {
    const node = stack.pop();

    if (!node || visited.has(node)) continue;

    visited.add(node);
    total++;

    let child = node.child;

    while (child) {
      stack.push(child);
      child = child.sibling;
    }
  }

  return total;
}

function ensurePreviewFiberModal() {
  let modal = $("preview-fiber-modal");
  if (modal) return modal;

  const section = $("preview-fiber-visualizer");
  if (!section || !section.parentElement) return null;

  const placeholder = document.createComment("Fiber tree compact position");
  section.parentElement.insertBefore(placeholder, section);
  section.dataset.compactPlaceholder = "ready";

  modal = document.createElement("div");
  modal.id = "preview-fiber-modal";
  modal.className = "preview-fiber-modal";
  modal.hidden = true;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "preview-fiber-modal-title");
  modal.innerHTML = `
    <div class="preview-fiber-modal-shell">
      <div class="preview-fiber-modal-topbar">
        <div><span class="panel-eyebrow">RUNTIME STRUCTURE</span><h2 id="preview-fiber-modal-title">Fiber Tree Explorer</h2><p>Explore the live Fiber structure generated by your running code.</p></div>
        <button type="button" class="preview-fiber-close" id="preview-fiber-close" aria-label="Close Fiber Tree">×</button>
      </div>
      <div class="preview-fiber-modal-content" id="preview-fiber-modal-content"></div>
    </div>`;
  document.body.appendChild(modal);

  const openButton = $("preview-fiber-expand");
  const closeButton = $("preview-fiber-close");
  const content = $("preview-fiber-modal-content");

  function openModal() {
    if (!content || !modal) return;
    content.appendChild(section);
    section.classList.add("is-expanded");
    modal.hidden = false;
    document.body.classList.add("fiber-modal-open");
    closeButton?.focus();
    renderPreviewFiberTree();
  }

  function closeModal() {
    if (!modal || modal.hidden) return;
    placeholder.parentNode?.insertBefore(section, placeholder.nextSibling);
    section.classList.remove("is-expanded");
    modal.hidden = true;
    document.body.classList.remove("fiber-modal-open");
    openButton?.focus();
  }

  openButton?.addEventListener("click", openModal);
  closeButton?.addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeModal();
  });
  return modal;
}

function renderPreviewFiberTree() {
  const section = $("preview-fiber-visualizer");
  const canvas = $("preview-fiber-canvas");
  const countOutput = $("preview-fiber-count");
  const renderOutput = $("preview-fiber-renders");
  const selectionOutput = $("preview-fiber-selection");

  if (!section || !canvas || !showPreviewFiberTree || !currentFiberSnapshot) {
    return;
  }

  section.hidden = false;
  const svgNS = "http://www.w3.org/2000/svg";
  const nodes = [];
  let leafIndex = 0;

  // Convert the real linked Fiber structure into a drawable tree layout.
  function visit(fiber, depth = 0, parent = null) {
    if (!fiber) return null;

    const entry = {
      fiber,
      parent,
      depth,
      children: [],
      x: 0,
      y: 42 + depth * 94,
      order: nodes.length,
    };
    nodes.push(entry);

    let child = fiber.child;
    const visitedSiblings = new Set();
    while (child && !visitedSiblings.has(child)) {
      visitedSiblings.add(child);
      const childEntry = visit(child, depth + 1, entry);
      if (childEntry) entry.children.push(childEntry);
      child = child.sibling;
    }

    if (entry.children.length) {
      entry.x = entry.children.reduce((sum, item) => sum + item.x, 0) / entry.children.length;
    } else {
      entry.x = 58 + leafIndex * 112;
      leafIndex += 1;
    }

    return entry;
  }

  const treeRoot = visit(currentFiberSnapshot);
  if (!treeRoot) return;

  const width = Math.max(320, leafIndex * 112 + 32);
  const maxDepth = Math.max(...nodes.map((node) => node.depth));
  const height = 92 + maxDepth * 94;
  const version = ++previewFiberAnimationVersion;

  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("class", "preview-fiber-svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `Fiber tree with ${nodes.length} nodes`);

  const lineLayer = document.createElementNS(svgNS, "g");
  lineLayer.setAttribute("class", "preview-fiber-lines");
  const nodeLayer = document.createElementNS(svgNS, "g");
  nodeLayer.setAttribute("class", "preview-fiber-nodes");

  for (const node of nodes) {
    for (const child of node.children) {
      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", String(node.x));
      line.setAttribute("y1", String(node.y + 56));
      line.setAttribute("x2", String(child.x));
      line.setAttribute("y2", String(child.y - 18));
      line.setAttribute("class", "preview-fiber-link");
      line.style.animationDelay = `${child.order * 85}ms`;
      lineLayer.appendChild(line);
    }
  }

  function getFiberLabel(fiber) {
    if (typeof fiber.type === "function") {
      return fiber.type.displayName || fiber.type.name || "Anonymous";
    }
    if (fiber.type === "TEXT_ELEMENT") return "text";
    if (fiber.type === "FRAGMENT") return "Fragment";
    return String(fiber.type || "Unknown");
  }

  nodes.forEach((node) => {
    const group = document.createElementNS(svgNS, "g");
    group.setAttribute("class", "preview-fiber-node");
    group.setAttribute("tabindex", "0");
    group.setAttribute("role", "button");
    group.setAttribute("aria-label", `Inspect ${getFiberLabel(node.fiber)} Fiber`);
    group.style.animationDelay = `${node.order * 85}ms`;

    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("cx", String(node.x));
    circle.setAttribute("cy", String(node.y));
    circle.setAttribute("r", "17");
    circle.setAttribute("class", "preview-fiber-node-circle");

    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", String(node.x));
    label.setAttribute("y", String(node.y + 38));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("class", "preview-fiber-node-label");
    label.textContent = getFiberLabel(node.fiber);

    group.append(circle, label);

    const selectNode = () => {
      nodeLayer.querySelectorAll(".preview-fiber-node").forEach((item) => {
        item.classList.remove("is-selected");
      });
      group.classList.add("is-selected");
      const parentName = node.fiber.parent ? getFiberLabel(node.fiber.parent) : "None (root)";
      const childCount = node.children.length;
      const siblingName = node.fiber.sibling ? getFiberLabel(node.fiber.sibling) : "None";
      selectionOutput.textContent = `${getFiberLabel(node.fiber)} · Parent: ${parentName} · Children: ${childCount} · Sibling: ${siblingName} · Effect: ${node.fiber.effectTag || "None"}`;
    };

    group.addEventListener("click", selectNode);
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectNode();
      }
    });

    nodeLayer.appendChild(group);
  });

  svg.append(lineLayer, nodeLayer);
  canvas.replaceChildren(svg);
  canvas.dataset.animationVersion = String(version);

  if (countOutput) countOutput.textContent = `${nodes.length} Fibers in this snapshot`;
  if (renderOutput) renderOutput.textContent = `${renderCount} ${renderCount === 1 ? "render" : "renders"} so far`;
  if (selectionOutput) selectionOutput.textContent = "Select a node to inspect its parent, children, sibling and effect tag.";
}

function replayPreviewFiberTree() {
  if (!showPreviewFiberTree || !currentFiberSnapshot) return;
  renderPreviewFiberTree();
}

function countSnapshotTypes(fiber) {
  const result = {
    nodes: 0,
    elements: 0,
    text: 0,
    components: 0,
  };

  if (!fiber) return result;

  const stack = [fiber];
  const visited = new Set();

  while (stack.length > 0) {
    const node = stack.pop();

    if (!node || visited.has(node)) continue;

    visited.add(node);
    result.nodes++;

    if (node.type === "TEXT_ELEMENT") {
      result.text++;
    } else if (typeof node.type === "function") {
      result.components++;
    } else {
      result.elements++;
    }

    let child = node.child;

    while (child) {
      stack.push(child);
      child = child.sibling;
    }
  }

  return result;
}

function refreshInspector() {
  updateStudioMetrics();

  if (!currentFiberSnapshot || !treeContainer || !detailsContainer) return;

  renderFiberInspector(
    currentFiberSnapshot,
    treeContainer,
    detailsContainer,
    searchInput?.value || "",
    statsContainer,
  );

  const counts = countSnapshotTypes(currentFiberSnapshot);

  document.querySelectorAll('[data-stat="nodes"]').forEach((el) => {
    el.textContent = String(counts.nodes);
  });

  document.querySelectorAll('[data-stat="elements"]').forEach((el) => {
    el.textContent = String(counts.elements);
  });

  document.querySelectorAll('[data-stat="text"]').forEach((el) => {
    el.textContent = String(counts.text);
  });

  document.querySelectorAll('[data-stat="components"]').forEach((el) => {
    el.textContent = String(counts.components);
  });

  const registeredCount = getRegisteredComponents().length;

  if ($("inspect-component-count")) {
    $("inspect-component-count").textContent = String(registeredCount);
  }

  if ($("inspect-render-count")) {
    $("inspect-render-count").textContent = String(renderCount);
  }

  if ($("inspect-last-render")) {
    $("inspect-last-render").textContent = lastRenderOutput?.textContent || "—";
  }

  if ($("performance-render-count")) {
    $("performance-render-count").textContent = String(componentRenderCount);
  }

  if ($("performance-node-count")) {
    $("performance-node-count").textContent = String(counts.nodes);
  }

  if ($("performance-component-count")) {
    $("performance-component-count").textContent = String(registeredCount);
  }

  const skippedRenders = getSkippedComponentRenderCount();

  if ($("performance-skipped-count")) {
    $("performance-skipped-count").textContent = String(skippedRenders);
  }

  const totalComponentAttempts = componentRenderCount + skippedRenders;

  const bailoutRate = totalComponentAttempts
    ? (skippedRenders / totalComponentAttempts) * 100
    : 0;

  if ($("performance-bailout-rate")) {
    $("performance-bailout-rate").textContent = `${bailoutRate.toFixed(1)}%`;
  }

  const averageRenderTime = componentRenderCount
    ? totalComponentRenderDuration / componentRenderCount
    : 0;

  if ($("performance-avg-render")) {
    $("performance-avg-render").textContent =
      `${averageRenderTime.toFixed(3)} ms`;
  }
}

// --------------------------------------------------
// Runtime activity
// --------------------------------------------------

function getTimeLabel(date = new Date()) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function renderActivityItems() {
  if (!activityLog) return;

  activityLog.replaceChildren();

  const filteredItems = activityItems.filter((item) => {
    if (activeActivityFilter === "all") return true;
    return item.kind === activeActivityFilter;
  });

  if (!filteredItems.length) {
    activityLog.appendChild(
      makeElement(
        "p",
        "inspector-empty",
        "New runtime events will appear here.",
      ),
    );
  } else {
    filteredItems.forEach((item) => {
      const row = makeElement("article", "activity-entry");

      const icon = makeElement(
        "span",
        `activity-entry-icon ${item.kind === "MOUNT" ? "mount" : "update"}`,
        item.kind === "MOUNT" ? "＋" : "↻",
      );

      const content = makeElement("div", "activity-entry-content");

      content.append(
        makeElement("strong", "", item.title),
        makeElement("p", "", item.description),
      );

      const time = makeElement("time", "activity-entry-time", item.time);

      row.append(icon, content, time);
      activityLog.appendChild(row);
    });
  }

  if (activityCount) {
    activityCount.textContent = `${filteredItems.length} EVENTS`;
  }

  if ($("deep-log-mirror")) {
    $("deep-log-mirror").textContent = activityItems
      .map((item) => `${item.time}  ${item.title} — ${item.description}`)
      .join("\n");
  }
}

function recordActivity(kind, title, description) {
  activityItems.unshift({
    id: `${Date.now()}-${Math.random()}`,
    kind,
    title,
    description,
    time: getTimeLabel(),
  });

  activityItems = activityItems.slice(0, MAX_ACTIVITY_ITEMS);

  const latestItem = activityItems[0];
  renderActivityItems();
  publishPerformanceEvent(latestItem);
}

setFiberActivityCallback((event) => {
  if (event.type === "BAILOUT") {
    recordActivity(
      event.type,
      `${event.type}: ${event.component}`,
      `${event.reason} · ${event.componentId}`,
    );
  }
});

function clearActivity() {
  activityItems = [];
  renderActivityItems();
}

document.addEventListener("elnexo:clear-runtime-events", () => {
  activityItems = [];
  renderActivityItems();
});

document.querySelectorAll(".activity-filter").forEach((button) => {
  button.addEventListener("click", () => {
    activeActivityFilter = button.dataset.filter;

    document.querySelectorAll(".activity-filter").forEach((filter) => {
      filter.classList.toggle("active", filter === button);
    });

    renderActivityItems();
  });
});

// --------------------------------------------------
// Render statistics
// --------------------------------------------------

function updateRenderStatistics(duration) {
  if (renderCountOutput) {
    renderCountOutput.textContent = String(renderCount);
  }

  if (nodeCountOutput) {
    nodeCountOutput.textContent = String(countFiberNodes(currentFiberSnapshot));
  }

  if (lastRenderOutput) {
    lastRenderOutput.textContent = `${Number(duration).toFixed(2)} ms`;
  }
}

// Keep the three top-level Studio KPI cards connected to live runtime data.
function updateStudioMetrics() {
  const componentMetric = $("studio-component-count");
  const renderMetric = $("studio-render-count");
  const nodeMetric = $("studio-node-count");

  const registeredComponents = getRegisteredComponents() || [];
  const fiberNodeCount = currentFiberSnapshot
    ? countFiberNodes(currentFiberSnapshot)
    : 0;

  if (componentMetric) {
    componentMetric.textContent = String(registeredComponents.length);
  }

  if (renderMetric) {
    renderMetric.textContent = String(renderCount);
  }

  if (nodeMetric) {
    nodeMetric.textContent = String(fiberNodeCount);
  }
}

// --------------------------------------------------
// Fiber runtime update
// --------------------------------------------------

function updateApp(reason = "State update") {
  if (!root) {
    throw new Error('El Nexo requires an element with id="root".');
  }

  if (isUpdating) {
    pendingUpdateReason = reason;
    return;
  }

  isUpdating = true;

  const startedAt = performance.now();

  try {
    const isInitialRender = currentVNode === null;

    updateRenderCycle("trigger");
    updateRenderCycle("schedule");
    updateRenderCycle("reconcile");

    const nextVNode = createElement(ActiveApp, {});

    // Get the components whose state has changed.
    const dirtyComponentIds = getDirtyComponents();

    console.log(
      "[El Nexo] Components with pending updates:",
      dirtyComponentIds,
    );

    currentFiberSnapshot = buildFiberTree(
      nextVNode,
      null,
      renderFiberComponent,
      "root",
      currentFiberSnapshot,
    );

    workLoop(currentFiberSnapshot);

    updateRenderCycle("commit");

    // Commit only the required DOM changes.
    // Do not clear the root container on every update.
    commitRoot(currentFiberSnapshot, root);

    // Clear pending state updates only after a successful commit.
    clearDirtyComponents();

    currentVNode = nextVNode;
    renderCount += 1;

    const duration = performance.now() - startedAt;

    updateRenderStatistics(duration);
    updateStudioMetrics();
    refreshInspector();
    renderComponentsExplorer();
    if (showPreviewFiberTree) renderPreviewFiberTree();
    publishPerformanceSnapshot();

    const nodeCount = countFiberNodes(currentFiberSnapshot);
    const registeredComponents = getRegisteredComponents();

    recordActivity(
      isInitialRender ? "MOUNT" : "UPDATE",
      isInitialRender ? "Application mounted" : "Fiber tree committed",
      `${reason} · ${nodeCount} Fiber nodes · ${registeredComponents.length} components`,
    );
  } catch (error) {
    console.error("El Nexo render failed:", error);

    recordActivity(
      "UPDATE",
      "Render failed",
      error?.message || "An unknown rendering error occurred.",
    );

    throw error;
  } finally {
    isUpdating = false;
  }

  if (pendingUpdateReason) {
    const nextReason = pendingUpdateReason;
    pendingUpdateReason = null;
    updateApp(nextReason);
  }
}

// --------------------------------------------------
// Render-cycle visualization
// --------------------------------------------------

function updateRenderCycle(activePhase) {
  const phases = ["trigger", "schedule", "reconcile", "commit"];
  const activeIndex = phases.indexOf(activePhase);

  phases.forEach((phase, index) => {
    const element = $(`phase-${phase}`);

    if (element) {
      element.classList.toggle("is-active", phase === activePhase);
      element.classList.toggle("is-complete", index < activeIndex);
    }
  });

  document.querySelectorAll(".cycle-node[data-stage]").forEach((node) => {
    const index = phases.indexOf(node.dataset.stage);

    node.classList.toggle("done", index !== -1 && index < activeIndex);
    node.classList.toggle("active", node.dataset.stage === activePhase);
  });
}

// --------------------------------------------------
// Application state
// --------------------------------------------------

setUpdateCallback((componentId) => {
  updateApp(componentId ? `State update: ${componentId}` : "State update");
});

// --------------------------------------------------
// Playground controls
// --------------------------------------------------

function setupPlaygroundControls() {
  // Controls are wired once in the event-listener section below.
}

// --------------------------------------------------
// Sidebar navigation
// --------------------------------------------------

function setupSidebar() {
  if (!sidebar) return;

  const navigationItems = sidebar.querySelectorAll("[data-view]");

  navigationItems.forEach((item) => {
    item.addEventListener("click", () => {
      const targetView = item.dataset.view;

      navigationItems.forEach((navigationItem) => {
        navigationItem.classList.toggle("is-active", navigationItem === item);
      });

      document.querySelectorAll("[data-panel]").forEach((panel) => {
        panel.classList.toggle("is-active", panel.dataset.panel === targetView);
      });
    });
  });
}

// --------------------------------------------------
// Editable playground source
// --------------------------------------------------

const sourceEditor = $("source-editor");
const editorStatus = $("editor-status");

function setEditorStatus(message, state = "ready") {
  if (!editorStatus) return;

  editorStatus.textContent = message;
  editorStatus.dataset.state = state;
}

function runEditorSource(reason = "Manual run") {
  if (!sourceEditor) {
    updateApp(reason);
    return;
  }

  const previousApp = ActiveApp;

  try {
    // The playground intentionally executes locally authored source in this page.
    // This is a learning environment, not a security sandbox for untrusted code.
    const createComponent = new Function(
      "createElement",
      "useState",
      "useEffect",
      "useMemo",
      sourceEditor.value,
    );

    const component = createComponent(
      createElement,
      useState,
      useEffect,
      useMemo,
    );

    if (typeof component !== "function") {
      throw new TypeError(
        "Your source must return a component function, for example: return function Counter() { ... };",
      );
    }

    ActiveApp = component;
    updateApp(reason);
    showPreviewFiberTree = true;
    ensurePreviewFiberModal();
    renderPreviewFiberTree();

    setEditorStatus(
      `Ran ${component.name || "AnonymousComponent"} successfully · ${new Date().toLocaleTimeString()}`,
      "success",
    );
  } catch (error) {
    ActiveApp = previousApp;

    const message = error instanceof Error ? error.message : String(error);

    setEditorStatus(`Run failed: ${message}`, "error");

    recordActivity("ERROR", "Editor execution failed", message);
  }
}

sourceEditor?.addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    event.preventDefault();

    const start = sourceEditor.selectionStart;
    const end = sourceEditor.selectionEnd;

    sourceEditor.setRangeText("  ", start, end, "end");
  }

  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    runEditorSource("Keyboard editor run");
  }
});

// --------------------------------------------------
// Event listeners
// --------------------------------------------------

$("preview-fiber-replay")?.addEventListener("click", replayPreviewFiberTree);

searchInput?.addEventListener("input", refreshInspector);
componentSearch?.addEventListener("input", renderComponentsExplorer);
clearActivityButton?.addEventListener("click", clearActivity);

// index.html dispatches this event from the top refresh and Run controls.
// Execute the current editor contents exactly once.
document.addEventListener("elnexo:refresh-preview", () => {
  runEditorSource("Preview refreshed");
});

// --------------------------------------------------
// Dynamic Project Explorer
// --------------------------------------------------

const fileTree = document.querySelector("#example-file-tree");

// Build folder and file elements from API data.
function createExplorerNode(item) {
  if (item.type === "folder") {
    const wrapper = document.createElement("div");

    const folderButton = document.createElement("button");
    folderButton.type = "button";
    folderButton.className = "tree-row folder-row";
    folderButton.dataset.folderToggle = item.path || item.name;
    folderButton.setAttribute("aria-expanded", "false");

    const arrow = document.createElement("span");
    arrow.className = "folder-arrow";
    arrow.textContent = "›";

    const icon = document.createElement("span");
    icon.className = "folder-symbol";
    icon.textContent = "▰";

    const name = document.createElement("span");
    name.textContent = item.name;

    folderButton.append(arrow, icon, name);

    const children = document.createElement("div");
    children.className = "tree-indent";
    children.hidden = true;
    children.dataset.folderContent = item.path || item.name;

    (item.children || []).forEach((child) => {
      children.appendChild(createExplorerNode(child));
    });

    wrapper.append(folderButton, children);

    return wrapper;
  }

  const fileButton = document.createElement("button");
  fileButton.type = "button";
  fileButton.className = "tree-row file-row";
  fileButton.dataset.file = item.path;

  const icon = document.createElement("span");
  icon.className = "file-icon";
  icon.textContent = "▤";

  const name = document.createElement("span");
  name.textContent = item.name;

  fileButton.append(icon, name);

  return fileButton;
}

// Fetch the real example directory structure.
async function loadExampleExplorer() {
  if (!fileTree) return;

  try {
    fileTree.replaceChildren();

    const response = await fetch("/api/examples");

    if (!response.ok) {
      throw new Error("Could not retrieve the examples directory.");
    }

    const examples = await response.json();

    if (!Array.isArray(examples)) {
      throw new Error("Invalid examples API response.");
    }

    // Examples root folder.
    const rootButton = document.createElement("button");
    rootButton.type = "button";
    rootButton.className = "tree-row folder-row";
    rootButton.dataset.folderToggle = "examples";
    rootButton.setAttribute("aria-expanded", "true");

    const rootArrow = document.createElement("span");
    rootArrow.className = "folder-arrow";
    rootArrow.textContent = "⌄";

    const rootIcon = document.createElement("span");
    rootIcon.className = "folder-symbol";
    rootIcon.textContent = "▰";

    const rootName = document.createElement("span");
    rootName.textContent = "examples";

    rootButton.append(rootArrow, rootIcon, rootName);

    const rootContent = document.createElement("div");
    rootContent.className = "tree-indent";
    rootContent.dataset.folderContent = "examples";

    examples.forEach((item) => {
      rootContent.appendChild(createExplorerNode(item));
    });

    fileTree.append(rootButton, rootContent);
  } catch (error) {
    console.error("[El Nexo] Explorer loading failed:", error);

    const message = document.createElement("div");
    message.className = "tree-loading";
    message.textContent = "Could not load examples. Check the server.";

    fileTree.replaceChildren(message);
  }
}

// --------------------------------------------------
// Folder and file click handling
// --------------------------------------------------

fileTree?.addEventListener("click", async (event) => {
  // Folder expand / collapse.
  const folder = event.target.closest("[data-folder-toggle]");

  if (folder) {
    const folderName = folder.dataset.folderToggle;

    const content = fileTree.querySelector(
      `[data-folder-content="${CSS.escape(folderName)}"]`,
    );

    if (!content) return;

    const expanded = folder.getAttribute("aria-expanded") === "true";
    const nextExpanded = !expanded;

    folder.setAttribute("aria-expanded", String(nextExpanded));
    content.hidden = !nextExpanded;

    const arrow = folder.querySelector(".folder-arrow");

    if (arrow) {
      arrow.textContent = nextExpanded ? "⌄" : "›";
    }

    return;
  }

  // File selection and loading.
  const file = event.target.closest(".file-row[data-file]");

  if (!file) return;

  const filePath = file.dataset.file;

  try {
    setEditorStatus(`Opening ${filePath}...`, "ready");

    const response = await fetch(`/${filePath}`);

    if (!response.ok) {
      throw new Error(`Could not load ${filePath}`);
    }

    const source = await response.text();

    if (!sourceEditor) {
      throw new Error("Code editor was not found.");
    }

    sourceEditor.value = source;

    // Update selected file.
    fileTree.querySelectorAll(".file-row").forEach((row) => {
      row.classList.remove("selected-file");
    });

    file.classList.add("selected-file");

    // Update editor tab.
    const fileName = filePath.split("/").pop();
    const tabLabel = document.querySelector(".tab-label");

    if (tabLabel) {
      tabLabel.replaceChildren();

      const fileIcon = document.createElement("span");
      fileIcon.className = "file-icon";
      fileIcon.textContent = fileName.endsWith(".css") ? "CSS" : "JS";

      const closeIcon = document.createElement("span");
      closeIcon.className = "tab-close";
      closeIcon.textContent = "×";

      tabLabel.append(
        fileIcon,
        document.createTextNode(fileName),
        closeIcon,
      );
    }

    setEditorStatus(`Loaded ${fileName} successfully`, "success");
  } catch (error) {
    console.error("[El Nexo] File loading failed:", error);
    setEditorStatus(error.message, "error");
  }
});

// --------------------------------------------------
// Initialize Dynamic Explorer
// --------------------------------------------------

loadExampleExplorer();
updateStudioMetrics();
publishPerformanceSnapshot();

// --------------------------------------------------
// Sidebar navigation
// --------------------------------------------------

setupSidebar();

// Initial mount executes the source currently shown in the editor.
// Subsequent refreshes are handled by the single listener above.
runEditorSource("Initial editor mount");