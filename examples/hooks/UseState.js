
return function UseStateExample() {
  const [count, setCount] = useState(0);

  return createElement(
    "div",
    { className: "example-card" },

    createElement("h1", null, "Understanding useState"),

    createElement(
      "p",
      null,
      "useState allows a component to store and update state."
    ),

    createElement(
      "h2",
      null,
      `Count: ${count}`
    ),

    createElement(
      "div",
      { className: "example-actions" },

      createElement(
        "button",
        {
          className: "example-button",
          onClick: () => setCount((previous) => previous + 1)
        },
        "Increment"
      ),

      createElement(
        "button",
        {
          className: "example-button",
          onClick: () => setCount((previous) => previous - 1)
        },
        "Decrement"
      ),

      createElement(
        "button",
        {
          className: "example-button",
          onClick: () => setCount(0)
        },
        "Reset"
      )
    )
  );
};
