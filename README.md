# El Nexo — Developer Studio

**A lightweight frontend framework built from scratch, with a browser-based development environment.**

El Nexo is an experimental frontend framework inspired by modern UI rendering architectures. It explores Virtual DOM creation, reconciliation, Fiber architecture, state management, and component rendering through a dedicated Developer Studio.

## Features

### Framework Runtime
- **Virtual DOM:** Lightweight representation of UI elements.
- **Reconciliation:** Compares component output and applies updates.
- **Fiber Architecture:** Implements Fiber nodes and tree traversal.
- **Hooks:** Custom implementations of `useState`, `useEffect`, and `useMemo`.
- **State Tracking:** Tracks component updates and supports render bailouts.
- **Lifecycle Management:** Handles component cleanup.

### El Nexo Developer Studio
- **Interactive Playground:** Write, edit, and execute component code.
- **Live Preview:** View component output and state changes.
- **Dynamic Example Explorer:** Discover and load examples from categorized folders.
- **Component Explorer:** Inspect registered components, props, hooks, and render information.
- **Fiber Inspector:** Explore Fiber tree structure and node metadata.
- **Runtime Activity:** Monitor rendering and bailout events.
- **Performance Monitoring:** Explore approximate component rendering timings.
- **AI Assistant:** Get code explanations and debugging assistance using a local Ollama model.

## Project Structure

```text
El-Nexo/
├── examples/
│   ├── basics/
│   ├── components/
│   ├── hooks/
│   ├── interaction/
│   └── advanced/
├── playground/
│   ├── index.html
│   ├── main.js
│   └── devtools.css
├── src/
│   ├── core/
│   └── fiber/
├── tests/
├── server.cjs
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js
- npm
- Ollama (for AI Assistant functionality)

### 1. Install dependencies

```bash
npm install
```

### 2. Install the AI model

```bash
ollama pull qwen2.5-coder:3b
```

Make sure Ollama is running.

### 3. Start the Developer Studio server

```bash
node server.cjs
```

### 4. Open the Playground

Visit:

```text
http://localhost:5500/playground/
```

The Node server provides the example discovery API, AI API, and project file serving. Use this server rather than opening the HTML file directly.

## Using the Playground

1. Expand the Example Explorer folders.
2. Select an example file.
3. Edit the component source.
4. Press **Run** to execute it.
5. Interact with the live preview.
6. Explore component information, Fiber structure, and runtime activity.
7. Use El Nexo AI to ask questions about the selected source code.

The editor supports injected `createElement`, `useState`, `useEffect`, and `useMemo` APIs.

> **Execution note:** Playground code executes in the browser page context. Only run code you trust. The playground is an educational environment, not a security sandbox.

## AI Assistant

El Nexo includes a locally powered coding assistant.

- Provider: Ollama
- Model: `qwen2.5-coder:3b`
- Context-aware code explanations
- Source-code-based debugging assistance
- Concise responses

AI requests are handled through the local `/api/ai/explain` endpoint.

## Testing

Run the complete test suite:

```bash
npm test
```

The tests cover core runtime behavior, state management, Fiber functionality, reconciliation, and related features.

## Architecture Notes

El Nexo is an experimental framework, not a production-ready replacement for React or other established frameworks.

- The Playground renders through the Virtual DOM renderer and reconciler.
- The Fiber Inspector displays a Fiber tree built from the current Virtual DOM snapshot; this is not yet the active rendering tree used by the Playground.
- The Components Explorer uses a separate runtime registry to track function components invoked during rendering.
- Render durations