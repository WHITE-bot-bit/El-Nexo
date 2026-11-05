
return function UseMemoExample() {
  const [number, setNumber] = useState(5);
  const [theme, setTheme] = useState("dark");

  const squaredValue = useMemo(() => {
    console.log("[El Nexo] Calculating square...");

    return number * number;
  }, [number]);

  return createElement(
    "div",
    { className: "example-card" },

    createElement("h1", null, "Understanding useMemo"),

    createElement(
      "p",
      null,
      "useMemo caches a calculated value until its dependencies change."
    ),

    createElement("h2", null, `Number: ${number}`),

    createElement(
      "h2",
      null,
      `Squared Value: ${squaredValue}`
    ),

    createElement(
      "div",
      { className: "example-actions" },

      createElement(
        "button",
        {
          className: "example-button",
          onClick: () => setNumber((previous) => previous + 1)
        },
        "Change Number"
      ),

      createElement(
        "button",
        {
          className: "example-button",
          onClick: () =>
            setTheme((previous) =>
              previous === "dark" ? "light" : "dark"
            )
        },
        `Change Theme: ${theme}`
      )
    ),

    createElement(
      "p",
      null,
      "Check the console to observe when the calculation runs."
    )
  );
};
