
return function FormHandlingExample() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    if (!name.trim() || !email.trim()) {
      setError("Please fill in both fields.");
      setSubmitted(false);
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address.");
      setSubmitted(false);
      return;
    }

    setError("");
    setSubmitted(true);
  }

  return createElement(
    "div",
    { className: "example-card" },

    createElement("h1", null, "Form Handling"),

    createElement(
      "p",
      null,
      "Manage form inputs, validate data and handle submission."
    ),

    createElement(
      "form",
      {
        className: "example-form",
        onSubmit: handleSubmit
      },

      createElement("input", {
        type: "text",
        className: "example-input",
        placeholder: "Enter your name",
        value: name,
        onChange: (event) => {
          setName(event.target.value);
          setSubmitted(false);
          setError("");
        }
      }),

      createElement("input", {
        type: "email",
        className: "example-input",
        placeholder: "Enter your email",
        value: email,
        onChange: (event) => {
          setEmail(event.target.value);
          setSubmitted(false);
          setError("");
        }
      }),

      createElement(
        "div",
        { className: "example-actions" },

        createElement(
          "button",
          {
            type: "submit",
            className: "example-button"
          },
          "Submit Form"
        )
      )
    ),

    error
      ? createElement(
          "p",
          { className: "form-error" },
          error
        )
      : null,

    submitted
      ? createElement(
          "div",
          { className: "form-success" },

          createElement("h3", null, "Form Submitted Successfully!"),

          createElement("p", null, `Name: ${name}`),

          createElement("p", null, `Email: ${email}`)
        )
      : null
  );
};
