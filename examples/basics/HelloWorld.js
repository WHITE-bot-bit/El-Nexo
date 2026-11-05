
return function HelloWorld() {
  return createElement(
    "div",
    { className: "example-card" },

    createElement(
      "h1",
      null,
      "Hello, El Nexo!"
    ),

    createElement(
      "p",
      null,
      "Welcome to your first El Nexo example."
    ),

    createElement(
      "p",
      null,
      "This component is rendered using the El Nexo Virtual DOM."
    )
  );
};
