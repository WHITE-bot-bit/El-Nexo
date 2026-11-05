# El Nexo update notes

## Implemented in this update

- Replaced the static, non-editable code display with an editable `Counter.js` source editor.
- Connected **Run** to compile and execute the current editor source as a component function.
- The editor receives `createElement`, `useState`, `useEffect`, and `useMemo` as its El Nexo APIs.
- The initial preview is rendered from the code shown in the editor.
- Added visible success/error feedback for editor runs.
- Added `Ctrl+Enter` / `Cmd+Enter` to run code and Tab indentation in the editor.
- Updated README instructions and documented the local-code execution safety limitation.
- Preserved the existing Developer Studio layout and inspector panels.

## Current editor format

The editor currently accepts a JavaScript function body that returns a component function. For example:

```js
return function Counter() {
  const [count, setCount] = useState(0);
  return createElement(
    "button",
    { onClick: () => setCount(value => value + 1) },
    `Count: ${count}`
  );
}
```

This is JavaScript using `createElement`, not JSX syntax yet. JSX transpilation, a secure sandbox, and wiring the Fiber work loop into the production preview renderer remain future work.

## Verification

- `node --check playground/main.js` passed.
- `node --check src/fiber/fiber.js` passed.
- A jsdom smoke test passed for initial editor render, button state update, and visible syntax-error reporting.
- The full Vitest suite could not be run in this environment because the bundled `node_modules` has a broken/missing Rollup native optional dependency. Reinstall dependencies on your machine with `npm install` before running `npm test`.
