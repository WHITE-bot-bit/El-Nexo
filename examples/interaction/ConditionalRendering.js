
return function ConditionalRenderingExample() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return createElement(
    "div",
    { className: "example-card" },

    createElement("h1", null, "Conditional Rendering"),

    createElement(
      "p",
      null,
      "Display different UI based on component state."
    ),

    createElement(
      "h2",
      null,
      isLoggedIn ? "Welcome back!" : "You are not logged in."
    ),

    createElement(
      "p",
      null,
      isLoggedIn
        ? "You can now access your dashboard."
        : "Please log in to continue."
    ),

    createElement(
      "div",
      { className: "example-actions" },

      createElement(
        "button",
        {
          className: "example-button",
          onClick: () => setIsLoggedIn((previous) => !previous)
        },
        isLoggedIn ? "Logout" : "Login"
      )
    ),

    isLoggedIn
      ? createElement(
          "div",
          { className: "login-success" },

          createElement("h3", null, "Dashboard"),

          createElement(
            "p",
            null,
            "You are viewing protected content."
          )
        )
      : null
  );
};
