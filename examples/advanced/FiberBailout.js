
function StableChild() {
  console.log("[Fiber Bailout] Child component rendered");

  return createElement(
    "div",
    { className: "nested-component" },

    createElement("h3", null, "Stable Child Component"),

    createElement(
      "p",
      null,
      "This component does not need to update when only parent state changes."
    )
  );
}

return function FiberBailoutExample() {
  const [count, setCount] = useState(0);

  console.log("[Fiber Bailout] Parent component rendered");

  return createElement(
    "div",
    { className: "example-card" },

    createElement("h2", null, "Fiber Bailout"),

    createElement(
      "p",
      null,
      "Observe how El Nexo avoids unnecessary child renders."
    ),

    createElement("h3", null, `Parent Count: ${count}`),

    createElement(
      "div",
      { className: "example-actions" },

      createElement(
        "button",
        {
          className: "example-button",
          onClick: () => setCount((previousCount) => previousCount + 1)
        },
        "Update Parent"
      )
    ),

    createElement(StableChild, null)
  );
};
