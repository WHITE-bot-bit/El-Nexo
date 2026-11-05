
return function PropsExample() {

  function UserCard(props) {
    return createElement(
      "div",
      { className: "user-card" },

      createElement("h2", null, props.name),

      createElement(
        "p",
        null,
        `Role: ${props.role}`
      ),

      createElement(
        "p",
        null,
        `Experience: ${props.experience} years`
      )
    );
  }

  return createElement(
    "div",
    { className: "example-card" },

    createElement("h1", null, "Understanding Props"),

    createElement(
      "p",
      null,
      "Props allow parent components to pass data to child components."
    ),

    createElement(
      "div",
      { className: "example-content" },

      createElement(UserCard, {
        name: "Alex Morgan",
        role: "Frontend Developer",
        experience: 2
      })
    )
  );
};
