# El Nexo Dual Theme Update

## Visual modes
- Notebook: warm cream graph-paper workspace, navy text, handwritten Caveat headings, muted terracotta details, yellow highlights, and soft blush AI response panel.
- Studio: deep navy/blue graph-paper workspace, bright yellow controls, cool blue panels, and technical Inter/DM Mono typography.

## Theme toggle
- Added Notebook / Studio toggle to the top bar.
- Selection is saved in browser localStorage and restored on reload.
- Theme changes are independent of the existing Studio / Inspect navigation mode.
- Runtime Performance iframe receives the same theme change and updates its own colors.

## Preserved functionality
The update is styling and theme-state only. It does not replace or rewrite the framework runtime, editor execution, preview, component registry, Fiber inspector, runtime event stream, Performance metrics, or Ollama API integration.

## Validation performed
- `playground/index.html` and `playground/performance.html` parsed successfully.
- `playground/main.js` and `server.cjs` passed Node syntax checks.
- Inline scripts in both HTML files passed Node syntax checks.
- `playground/devtools.css` parsed with zero CSS syntax errors.
- The bundled Vitest runner could not execute in this Linux build environment because the uploaded `node_modules` contains platform-specific optional dependencies for Windows and lacks `@rollup/rollup-linux-x64-gnu`. The project previously passed 111 tests on the user's Windows environment; rerun `npm test` there after extracting this update.
