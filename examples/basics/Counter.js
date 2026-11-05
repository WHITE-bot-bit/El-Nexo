
return function Counter() {
  const [count, setCount] = useState(0);

  function handleIncrement() {
    console.log("Counter button clicked");
    setCount((previousCount) => previousCount + 1);
  }

  function handleReset() {
    console.log("Reset button clicked");
    setCount(0);
  }

  return createElement(
    "div",
    { className: "example-card" },

    createElement("h2", null, "Counter Example"),

    createElement("p", null, `Count: ${count}`),

    createElement(
      "div",
      { className: "example-actions" },

      createElement(
        "button",
        {
          className: "example-button",
          onClick: handleIncrement,
        },
        "Increment",
      ),

      createElement(
        "button",
        {
          className: "example-button",
          onClick: handleReset,
        },
        "Reset",
      ),
    ),
  );
};
