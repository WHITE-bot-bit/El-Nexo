
return function TodoListExample() {
  const [todos, setTodos] = useState([
    { id: 1, text: "Learn Virtual DOM", completed: true },
    { id: 2, text: "Understand Fiber", completed: false },
    { id: 3, text: "Explore El Nexo Hooks", completed: false }
  ]);

  const [input, setInput] = useState("");

  const completedCount = useMemo(
    () => todos.filter((todo) => todo.completed).length,
    [todos]
  );

  function addTodo() {
    const text = input.trim();

    if (!text) return;

    setTodos((previous) => [
      ...previous,
      {
        id: Date.now(),
        text,
        completed: false
      }
    ]);

    setInput("");
  }

  function toggleTodo(id) {
    setTodos((previous) =>
      previous.map((todo) =>
        todo.id === id
          ? { ...todo, completed: !todo.completed }
          : todo
      )
    );
  }

  function deleteTodo(id) {
    setTodos((previous) =>
      previous.filter((todo) => todo.id !== id)
    );
  }

  return createElement(
    "div",
    { className: "example-card" },

    createElement("h1", null, "El Nexo Todo List"),

    createElement(
      "p",
      null,
      `${completedCount} of ${todos.length} tasks completed`
    ),

    createElement(
      "div",
      { className: "todo-input-group" },

      createElement("input", {
        type: "text",
        className: "example-input",
        placeholder: "Enter a new task...",
        value: input,
        onChange: (event) => setInput(event.target.value)
      }),

      createElement(
        "button",
        {
          className: "example-button",
          onClick: addTodo
        },
        "Add Task"
      )
    ),

    createElement(
      "p",
      { className: "todo-current-input" },
      `Current input: ${input || "Empty"}`
    ),

    createElement(
      "div",
      { className: "todo-list" },

      ...todos.map((todo) =>
        createElement(
          "div",
          {
            className: "todo-item",
            key: todo.id
          },

          createElement("input", {
            type: "checkbox",
            checked: todo.completed,
            onChange: () => toggleTodo(todo.id)
          }),

          createElement(
            "span",
            {
              className: todo.completed
                ? "todo-text completed"
                : "todo-text"
            },
            todo.text
          ),

          createElement(
            "button",
            {
              className: "example-button todo-delete",
              onClick: () => deleteTodo(todo.id)
            },
            "Delete"
          )
        )
      )
    )
  );
};
