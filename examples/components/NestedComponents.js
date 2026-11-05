
return function NestedComponents() {

  function Header() {
    return createElement(
      "header",
      { className: "nested-header" },

      createElement("h2", null, "El Nexo Dashboard"),

      createElement("p", null, "Welcome to your workspace")
    );
  }

  function Profile() {
    return createElement(
      "section",
      { className: "nested-profile" },

      createElement("h3", null, "User Profile"),

      createElement("p", null, "Name: Alex Morgan"),

      createElement("p", null, "Role: Frontend Developer")
    );
  }

  function Footer() {
    return createElement(
      "footer",
      { className: "nested-footer" },
      "Built with El Nexo"
    );
  }

  function Dashboard() {
    return createElement(
      "div",
      { className: "nested-dashboard" },

      createElement(Header, null),

      createElement(Profile, null),

      createElement(Footer, null)
    );
  }

  return createElement(
    "div",
    { className: "example-card" },

    createElement("h1", null, "Nested Components"),

    createElement(
      "p",
      null,
      "Components can be combined to build larger interfaces."
    ),

    createElement(Dashboard, null)
  );
};
