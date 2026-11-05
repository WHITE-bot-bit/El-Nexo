
return function FiberTreeUpdatesExample() {
  const [showChild, setShowChild] = useState(true);
  const [version, setVersion] = useState(1);

  function ChildComponent() {
    return createElement(
      "div",
      { className: "nested-component" },

      createElement("h3", null, "Child Fiber"),

      createElement(
        "p",
        null,
        `Current version: ${version}`
      )
    );
  }

  return createElement(
    "div",
    { className: "example-card" },

    createElement("h2", null, "Fiber Tree Updates"),

    createElement(
      "p",
      null,
      "Explore how state changes update the Fiber tree."
    ),

    createElement(
      "div",
      { className: "example-actions" },

      createElement(
        "button",
        {
          className: "example-button",
          onClick: () => setVersion((previousVersion) => previousVersion + 1)
        },
        "Update Child"
      ),

      createElement(
        "button",
        {
          className: "example-button",
          onClick: () => setShowChild((previous) => !previous)
        },
        showChild ? "Remove Child" : "Restore Child"
      )
    ),

    createElement(
      "p",
      null,
      `Parent version: ${version}`
    ),

    showChild
      ? createElement(ChildComponent, null)
      : null
  );
};
