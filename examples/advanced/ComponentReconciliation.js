
return function ComponentReconciliationExample() {
  const [showDetails, setShowDetails] = useState(true);
  const [count, setCount] = useState(0);

  return createElement(
    "div",
    { className: "example-card" },

    createElement("h2", null, "Component Reconciliation"),

    createElement(
      "p",
      null,
      "Observe how El Nexo updates the component tree when state changes."
    ),

    createElement("h3", null, `Counter: ${count}`),

    createElement(
      "div",
      { className: "example-actions" },

      createElement(
        "button",
        {
          className: "example-button",
          onClick: () => setCount((previousCount) => previousCount + 1)
        },
        "Increment"
      ),

      createElement(
        "button",
        {
          className: "example-button",
          onClick: () => setShowDetails((previous) => !previous)
        },
        showDetails ? "Remove Details" : "Show Details"
      )
    ),

    showDetails
      ? createElement(
          "div",
          { className: "nested-component" },

          createElement("h3", null, "Details Component"),

          createElement(
            "p",
            null,
            "This content can be added or removed."
          )
        )
      : null
  );
};
