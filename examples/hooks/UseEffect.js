
return function UseEffectExample() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState("Waiting for an update...");

  useEffect(() => {
    setMessage(`Count changed to ${count}`);

    console.log("[El Nexo useEffect] Count:", count);
  }, [count]);

  return createElement(
    "div",
    { className: "example-card" },

    createElement("h1", null, "Understanding useEffect"),

    createElement(
      "p",
      null,
      "useEffect runs after rendering when its dependencies change."
    ),

    createElement("h2", null, `Count: ${count}`),

    createElement(
      "p",
      { className: "effect-message" },
      message
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
          onClick: () => setCount(0)
        },
        "Reset"
      )
    )
  );
};
