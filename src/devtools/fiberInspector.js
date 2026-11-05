
const TAG_LABELS = {
  Component: "Function component",
  Text: "Text node",
  Element: "DOM element",
  Unknown: "Unknown",
};

let selectedPath = "0";
const collapsedPaths = new Set();

function makeElement(tag, className = "", text = "") {
  const element = document.createElement(tag);

  if (className) element.className = className;

  if (text !== undefined && text !== null) {
    element.textContent = String(text);
  }

  return element;
}

function getTypeName(fiber) {
  if (!fiber) return "Unknown node";

  const type = fiber.type;

  if (typeof type === "function") {
    return type.displayName || type.name || "Anonymous component";
  }

  if (type === "TEXT_ELEMENT") return "Text node";

  if (typeof type === "string") return `<${type}>`;

  return "Unknown node";
}

function getKind(fiber) {
  if (!fiber) return "Unknown";
  if (typeof fiber.type === "function") return "Component";
  if (fiber.type === "TEXT_ELEMENT") return "Text";
  if (typeof fiber.type === "string") return "Element";
  return "Unknown";
}

function printable(value) {
  if (value === undefined) return "undefined";
  if (value === null) return "null";

  if (typeof value === "function") {
    return `[Function ${value.name || "anonymous"}]`;
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (typeof value !== "object") {
    return String(value);
  }

  try {
    return JSON.stringify(
      value,
      (_key, item) =>
        typeof item === "function"
          ? `[Function ${item.name || "anonymous"}]`
          : item,
      2
    );
  } catch {
    return "[Object]";
  }
}

function getProps(fiber) {
  const props = { ...(fiber?.props || {}) };
  delete props.children;
  return props;
}

function getChildren(fiber) {
  const children = [];
  let child = fiber?.child || null;
  const visited = new Set();

  while (child && !visited.has(child)) {
    visited.add(child);
    children.push(child);
    child = child.sibling || null;
  }

  return children;
}

function collectStats(rootFiber) {
  const stats = {
    nodes: 0,
    elements: 0,
    text: 0,
    components: 0,
  };

  if (!rootFiber) return stats;

  const stack = [rootFiber];
  const visited = new Set();

  while (stack.length) {
    const fiber = stack.pop();

    if (!fiber || visited.has(fiber)) continue;

    visited.add(fiber);
    stats.nodes += 1;

    if (typeof fiber.type === "function") {
      stats.components += 1;
    } else if (fiber.type === "TEXT_ELEMENT") {
      stats.text += 1;
    } else {
      stats.elements += 1;
    }

    const children = getChildren(fiber);

    for (let i = children.length - 1; i >= 0; i--) {
      stack.push(children[i]);
    }
  }

  return stats;
}

function createDetailRow(label, value) {
  const row = makeElement("div", "fiber-detail-row");
  const labelElement = makeElement("span", "fiber-detail-label", label);
  const valueElement = makeElement(
    "span",
    "fiber-detail-value",
    value
  );

  Object.assign(row.style, {
    display: "grid",
    gridTemplateColumns: "minmax(90px, 1fr) minmax(0, 1.15fr)",
    alignItems: "start",
    gap: "12px",
    width: "100%",
    minWidth: "0",
    boxSizing: "border-box",
    padding: "7px 0",
    lineHeight: "1.5",
  });

  Object.assign(labelElement.style, {
    display: "block",
    minWidth: "0",
    color: "var(--text-muted, #8fa8ba)",
    overflowWrap: "anywhere",
  });

  Object.assign(valueElement.style, {
    display: "block",
    minWidth: "0",
    color: "var(--text-primary, #e4edf5)",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
  });

  row.append(labelElement, valueElement);
  return row;
}

function renderDetails(fiber, path, detailsContainer, depth = 0) {
  if (!detailsContainer) return;

  detailsContainer.replaceChildren();

  Object.assign(detailsContainer.style, {
    display: "block",
    minWidth: "0",
    boxSizing: "border-box",
  });

  if (!fiber) {
    detailsContainer.appendChild(
      makeElement(
        "p",
        "fiber-empty",
        "Select a node to inspect metadata."
      )
    );
    return;
  }

  const children = getChildren(fiber);
  const props = getProps(fiber);
  const kind = getKind(fiber);

  const title = makeElement("div", "fiber-details-heading");

  Object.assign(title.style, {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "8px",
    minWidth: "0",
    marginBottom: "16px",
  });

  title.append(
    makeElement("div", "fiber-node-index", `NODE ${path}`),
    makeElement("h3", "fiber-node-title", getTypeName(fiber))
  );

  const kindBadge = makeElement(
    "span",
    "fiber-kind-badge",
    TAG_LABELS[kind] || kind
  );

  const metadata = makeElement("div", "fiber-details-metadata");

  Object.assign(metadata.style, {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    width: "100%",
    minWidth: "0",
    boxSizing: "border-box",
  });

  metadata.append(
    createDetailRow("Fiber type", getTypeName(fiber)),
    createDetailRow("Depth", depth),
    createDetailRow("Effect tag", fiber.effectTag ?? "None"),
    createDetailRow(
      "Parent",
      fiber.parent ? getTypeName(fiber.parent) : "Root"
    ),
    createDetailRow("Children", children.length),
    createDetailRow(
      "Sibling",
      fiber.sibling ? getTypeName(fiber.sibling) : "None"
    ),
    createDetailRow(
      "Alternate",
      fiber.alternate ? getTypeName(fiber.alternate) : "None"
    )
  );

  const propsSection = makeElement(
    "section",
    "fiber-details-section"
  );

  Object.assign(propsSection.style, {
    display: "block",
    width: "100%",
    minWidth: "0",
    boxSizing: "border-box",
    marginTop: "18px",
  });

  propsSection.appendChild(makeElement("h4", "", "PROPS"));

  const propEntries = Object.entries(props);

  if (propEntries.length === 0) {
    propsSection.appendChild(
      makeElement("p", "fiber-empty", "No element props.")
    );
  } else {
    const propsList = makeElement("div", "fiber-props-list");

    Object.assign(propsList.style, {
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      width: "100%",
      minWidth: "0",
    });

    for (const [key, value] of propEntries) {
      propsList.appendChild(
        createDetailRow(key, printable(value))
      );
    }

    propsSection.appendChild(propsList);
  }

  const nodeValue =
    fiber.type === "TEXT_ELEMENT"
      ? fiber.props?.nodeValue ?? ""
      : null;

  let textSection = null;

  if (nodeValue !== null) {
    textSection = makeElement("section", "fiber-details-section");

    Object.assign(textSection.style, {
      display: "block",
      width: "100%",
      minWidth: "0",
      boxSizing: "border-box",
      marginTop: "18px",
    });

    textSection.appendChild(
      makeElement("h4", "", "TEXT CONTENT")
    );

    const textContent = makeElement(
      "pre",
      "fiber-text-content",
      String(nodeValue)
    );

    Object.assign(textContent.style, {
      maxWidth: "100%",
      minWidth: "0",
      boxSizing: "border-box",
      whiteSpace: "pre-wrap",
      overflowWrap: "anywhere",
      wordBreak: "break-word",
      overflowX: "auto",
    });

    textSection.appendChild(textContent);
  }

  detailsContainer.append(title, kindBadge, metadata, propsSection);

  if (textSection) {
    detailsContainer.appendChild(textSection);
  }
}

export function renderFiberInspector(
  rootFiber,
  treeContainer,
  detailsContainer,
  searchQuery = "",
  statsContainer = null
) {
  if (!treeContainer || !detailsContainer) return;

  treeContainer.replaceChildren();

  // Make tree rows render as a vertical list regardless of conflicting CSS.
  Object.assign(treeContainer.style, {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    minWidth: "0",
    boxSizing: "border-box",
  });

  const query = String(searchQuery || "").trim().toLowerCase();
  const stats = collectStats(rootFiber);

  if (statsContainer) {
    statsContainer.replaceChildren();

    for (const [key, value] of Object.entries(stats)) {
      const stat = makeElement("div", "fiber-stat");
      stat.dataset.stat = key;

      stat.append(
        makeElement("span", "fiber-stat-label", key),
        makeElement("strong", "fiber-stat-value", value)
      );

      statsContainer.appendChild(stat);
    }
  }

  if (!rootFiber) {
    treeContainer.appendChild(
      makeElement("p", "fiber-empty", "No Fiber tree available.")
    );

    renderDetails(null, selectedPath, detailsContainer);
    return;
  }

  const nodeMap = new Map();

  function indexTree(fiber, path = "0", depth = 0, ancestors = []) {
    if (!fiber) return;

    nodeMap.set(path, { fiber, depth, ancestors });

    const children = getChildren(fiber);

    children.forEach((child, index) => {
      indexTree(child, `${path}.${index}`, depth + 1, [
        ...ancestors,
        path,
      ]);
    });
  }

  indexTree(rootFiber);

  if (!nodeMap.has(selectedPath)) {
    selectedPath = "0";
  }

  const matchingPaths = new Set();

  if (query) {
    for (const [path, entry] of nodeMap) {
      const name = getTypeName(entry.fiber).toLowerCase();
      const props = printable(getProps(entry.fiber)).toLowerCase();

      const text =
        entry.fiber.type === "TEXT_ELEMENT"
          ? String(entry.fiber.props?.nodeValue ?? "").toLowerCase()
          : "";

      if (
        name.includes(query) ||
        props.includes(query) ||
        text.includes(query)
      ) {
        matchingPaths.add(path);

        for (const ancestorPath of entry.ancestors) {
          matchingPaths.add(ancestorPath);
        }
      }
    }

    if (matchingPaths.size === 0) {
      treeContainer.appendChild(
        makeElement(
          "p",
          "fiber-empty",
          "No matching Fiber nodes found."
        )
      );

      renderDetails(null, selectedPath, detailsContainer);
      return;
    }
  }

  function renderBranch(fiber, path, depth) {
    if (!fiber) return;
    if (query && !matchingPaths.has(path)) return;

    const children = getChildren(fiber);
    const hasChildren = children.length > 0;
    const isCollapsed = collapsedPaths.has(path) && !query;

    const row = makeElement("div", "fiber-row");
    row.dataset.path = path;

    Object.assign(row.style, {
      display: "flex",
      alignItems: "center",
      gap: "5px",
      width: "100%",
      minWidth: "0",
      minHeight: "42px",
      paddingLeft: `${depth * 18}px`,
      boxSizing: "border-box",
      flexShrink: "0",
    });

    if (hasChildren) {
      const toggleButton = makeElement(
        "button",
        "tree-chevron",
        isCollapsed ? "▸" : "▾"
      );

      toggleButton.type = "button";

      toggleButton.setAttribute(
        "aria-label",
        isCollapsed ? "Expand node" : "Collapse node"
      );

      toggleButton.setAttribute(
        "aria-expanded",
        String(!isCollapsed)
      );

      Object.assign(toggleButton.style, {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 22px",
        width: "22px",
        minWidth: "22px",
        height: "32px",
        padding: "0",
        color: "#b8c7d1",
        background: "transparent",
        border: "0",
        cursor: "pointer",
        visibility: "visible",
        opacity: "1",
      });

      toggleButton.addEventListener("click", (event) => {
        event.stopPropagation();

        if (collapsedPaths.has(path)) {
          collapsedPaths.delete(path);
        } else {
          collapsedPaths.add(path);
        }

        renderFiberInspector(
          rootFiber,
          treeContainer,
          detailsContainer,
          searchQuery,
          statsContainer
        );
      });

      row.appendChild(toggleButton);
    } else {
      const emptyToggle = makeElement(
        "span",
        "tree-chevron tree-chevron-empty",
        "·"
      );

      Object.assign(emptyToggle.style, {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 22px",
        width: "22px",
        minWidth: "22px",
        color: "#718899",
      });

      row.appendChild(emptyToggle);
    }

    const selectButton = makeElement("button", "fiber-node");

    selectButton.type = "button";
    selectButton.dataset.path = path;

    selectButton.setAttribute(
      "aria-pressed",
      String(path === selectedPath)
    );

    if (path === selectedPath) {
      selectButton.classList.add("selected");
    }

    Object.assign(selectButton.style, {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      flex: "1 1 auto",
      width: "0",
      minWidth: "0",
      minHeight: "38px",
      padding: "8px 10px",
      boxSizing: "border-box",
      textAlign: "left",
      color: "#e2e8f0",
      background:
        path === selectedPath ? "#173d49" : "transparent",
      border:
        path === selectedPath
          ? "1px solid #2e7184"
          : "1px solid transparent",
      borderRadius: "7px",
      cursor: "pointer",
      visibility: "visible",
      opacity: "1",
    });

    const iconLabel =
      typeof fiber.type === "function"
        ? "ƒ"
        : fiber.type === "TEXT_ELEMENT"
          ? "T"
          : "◇";

    const icon = makeElement(
      "span",
      `node-icon node-${getKind(fiber).toLowerCase()}`,
      iconLabel
    );

    Object.assign(icon.style, {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "0 0 18px",
      width: "18px",
      minWidth: "18px",
      color: "#67d7ee",
      visibility: "visible",
      opacity: "1",
    });

    const label = makeElement(
      "span",
      "node-label",
      getTypeName(fiber)
    );

    Object.assign(label.style, {
      display: "block",
      flex: "1 1 auto",
      minWidth: "0",
      overflow: "hidden",
      color: "#e2e8f0",
      fontSize: "14px",
      fontWeight: "600",
      lineHeight: "1.5",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      visibility: "visible",
      opacity: "1",
    });

    selectButton.append(icon, label);

    selectButton.addEventListener("click", () => {
      selectedPath = path;

      treeContainer.querySelectorAll(".fiber-node").forEach((button) => {
        const selected = button.dataset.path === selectedPath;

        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", String(selected));

        button.style.background = selected
          ? "#173d49"
          : "transparent";

        button.style.border = selected
          ? "1px solid #2e7184"
          : "1px solid transparent";
      });

      const selectedEntry = nodeMap.get(selectedPath);

      renderDetails(
        selectedEntry?.fiber || fiber,
        selectedPath,
        detailsContainer,
        selectedEntry?.depth ?? depth
      );
    });

    row.appendChild(selectButton);
    treeContainer.appendChild(row);

    if (hasChildren && !isCollapsed) {
      children.forEach((child, index) => {
        renderBranch(child, `${path}.${index}`, depth + 1);
      });
    }
  }

  renderBranch(rootFiber, "0", 0);

  const selectedEntry = nodeMap.get(selectedPath);

  renderDetails(
    selectedEntry?.fiber || rootFiber,
    selectedPath,
    detailsContainer,
    selectedEntry?.depth ?? 0
  );
}
