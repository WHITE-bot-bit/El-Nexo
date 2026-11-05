
return function ButtonExample() {

  function CustomButton(props) {
    return createElement(
      "button",
      {
        className: `custom-button ${props.variant}`,
        disabled: props.disabled,
        onClick: props.onClick
      },
      props.label
    );
  }

  return createElement(
    "div",
    { className: "example-card" },

    createElement("h1", null, "Reusable Components"),

    createElement(
      "p",
      null,
      "Build one component and reuse it with different props."
    ),

    createElement(
      "div",
      { className: "example-actions" },

      createElement(CustomButton, {
        label: "Primary Button",
        variant: "primary",
        onClick: () => alert("Primary button clicked!")
      }),

      createElement(CustomButton, {
        label: "Secondary Button",
        variant: "secondary",
        onClick: () => alert("Secondary button clicked!")
      }),

      createElement(CustomButton, {
        label: "Disabled Button",
        variant: "disabled",
        disabled: true
      })
    )
  );
};
