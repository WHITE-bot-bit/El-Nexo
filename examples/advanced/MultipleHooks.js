
return function MultipleHooksExample() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState("El Nexo");

  useEffect(() => {
    console.log("[Multiple Hooks] Count changed:", count);
  }, [count]);

  const doubledCount = useMemo(() => {
    console.log("[Multiple Hooks] Calculating doubled count");
    return count * 2;
  }, [count]);

  return createElement(
    "div",
    { className: "example-card" },

    createElement("h2", null, "Multiple Hooks"),

    createElement(
      "p",
      null,
      "Explore useState, useEffect and useMemo together."
    ),

    createElement("h3", null, `Count: ${count}`),

    createElement("h3", null, `Doubled: ${doubledCount}`),

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
          onClick: () => setCount(0)
        },
        "Reset"
      )
    ),

    createElement("hr", null),

    createElement("h3", null, `Welcome, ${name}`),

    createElement(
      "div",
      { className: "example-actions" },

      createElement(
        "button",
        {
          className: "example-button",
          onClick: () => setName("Developer")
        },
        "Change Name"
      )
    )
  );
};
