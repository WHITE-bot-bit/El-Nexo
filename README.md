# ⚡ El Nexo — Developer Studio

### Explore the internals. Understand the rendering. Build your own framework.

**El Nexo** is an experimental lightweight frontend framework built from scratch, accompanied by an integrated browser-based Developer Studio.

It explores the internal concepts behind modern frontend frameworks, including Virtual DOM creation, reconciliation, Fiber architecture, component rendering, state management, and lifecycle handling.

The Developer Studio brings these concepts into an interactive workspace where developers can write components, execute examples, inspect runtime behavior, and explore framework internals.

---

## ✨ Project Highlights

| Area | Capabilities |
|---|---|
| Framework Runtime | Virtual DOM, reconciliation, Fiber structures and hooks |
| Developer Playground | Code editor, execution and live preview |
| Component Inspection | Component Explorer and hook information |
| Fiber Visualization | Fiber Inspector and Fiber Tree visualization |
| Runtime Monitoring | Rendering activity and performance observations |
| Visual Experience | Notebook and Studio themes |
| AI Integration | Local coding assistance using Ollama |
| Testing | Automated tests and Fiber benchmarks |

---

# 🚀 Explore El Nexo Features

<details>
<summary><strong>01. ⚙️ Framework Core — The Rendering Engine</strong></summary>

The framework core explores how a UI framework represents components, manages state, and updates the DOM.

**Virtual DOM**
- Creates lightweight representations of UI elements.
- Supports structured component output.
- Provides the foundation for reconciliation.

**Element Creation**
- Custom `createElement` implementation.
- Supports component and element descriptions.
- Converts component definitions into Virtual DOM structures.

**Reconciliation and Diffing**
- Compares previous and next component output.
- Identifies changes that need to be applied.
- Supports placement, update, deletion, and replacement operations.

**Fiber Architecture**
- Creates Fiber nodes.
- Represents parent, child, and sibling relationships.
- Supports Fiber tree construction and traversal.
- Separates work processing from commit operations in the simplified Fiber implementation.

**Hooks and State Management**
- `useState` — manages component state.
- `useEffect` — handles side effects and cleanup.
- `useMemo` — supports memoized values.
- Tracks state changes and component updates.

**Lifecycle Management**
- Handles effect cleanup.
- Supports cleanup when components are unmounted.
- Tracks component removal and associated state disposal.

</details>

<details>
<summary><strong>02. 🧪 Interactive Playground — Write, Run and Experiment</strong></summary>

The Playground is the primary coding workspace inside El Nexo Developer Studio.

**Code Editor**
- Write and modify component source code.
- Work with injected framework APIs.
- Experiment with framework functionality.

**Run and Execute**
- Execute the selected example.
- Test component behavior.
- Observe state changes and rendering updates.

**Live Preview**
- View component output.
- Interact with rendered components.
- Observe UI changes after state updates.

**Example Explorer**
- Discover examples through categorized folders.
- Load example source files dynamically.
- Explore basic, component, hook, interaction, and advanced examples.

**Interactive Development**
- Modify component code.
- Execute updated examples.
- Observe the result in the live preview.

</details>

<details>
<summary><strong>03. 🔍 Component Explorer — Understand Your Components</strong></summary>

The Component Explorer provides visibility into function components registered during runtime.

**Component Information**
- Inspect registered components.
- Explore component names and types.
- View available component information.

**Props Inspection**
- Explore component properties.
- Understand the data passed into components.

**Hooks Information**
- Inspect available hook information.
- Explore component state and hook-related details.

**Render Information**
- Observe component rendering information.
- Explore component metrics and runtime registration data.

</details>

<details>
<summary><strong>04. 🌳 Fiber Inspector and Fiber Tree — Explore the Internal Structure</strong></summary>

El Nexo includes visual tools for exploring Fiber-related structures and component relationships.

**Fiber Inspector**
- Explore Fiber node information.
- Inspect tree hierarchy.
- Examine parent, child, and sibling relationships.
- View node metadata.

**Fiber Tree Visualization**
- Compact Fiber Tree view inside the Live Preview workspace.
- Expanded visualization through a fullscreen modal.
- Visual representation of tree branches and nodes.
- Animated node activity.
- Replay controls.
- Select nodes to explore their associated information.
- Refresh the visualization as the component state changes.

**Important Architecture Note**

The Fiber Inspector visualizes a Fiber tree built from the current Virtual DOM snapshot. This is not yet the active rendering tree used by the Playground. It is an educational visualization of Fiber-related structures.

</details>

<details>
<summary><strong>05. 📊 Runtime Activity and Performance Monitoring</strong></summary>

Observe framework activity and explore how components behave during rendering.

**Runtime Activity**
- Monitor rendering activity.
- Observe component update events.
- Explore render bailout events.
- Follow runtime activity during interactions.

**Performance Monitoring**
- Explore approximate component rendering timings.
- Compare benchmark scenarios.
- Observe performance measurements for different component tree sizes.

**Fiber Performance Benchmarks**

The project includes benchmark tests for component trees containing:

| Component count | Recorded time |
|---:|---:|
| 10 | 10 ms |
| 50 | 2 ms |
| 100 | 3 ms |

These are results from one local benchmark run, not standardized performance comparisons.

</details>

<details>
<summary><strong>06. 🎨 Dual Visual Themes — Notebook and Studio</strong></summary>

El Nexo provides two visual experiences that can be switched inside the Developer Studio.

**📓 Notebook Theme**

A warm, notebook-inspired workspace.

- Cream-colored background.
- Graph-paper visual styling.
- Navy typography.
- Yellow accent details.
- A clean learning and experimentation atmosphere.

**💻 Studio Theme**

A technical developer workspace.

- Deep navy and blue interface.
- Bright yellow accents.
- High-contrast workspace styling.
- Developer-focused visual presentation.

**Theme Switching**
- Switch between Notebook and Studio.
- Update the visual theme across the workspace.
- Keep the Developer Studio experience consistent.

</details>

<details>
<summary><strong>07. 🤖 AI Assistant — Local AI Coding Support</strong></summary>

El Nexo integrates a locally powered AI coding assistant through Ollama.

**AI Capabilities**
- Explain selected source code.
- Provide debugging assistance.
- Answer questions about code.
- Offer context-aware development guidance.

**AI Technology**

| Component | Configuration |
|---|---|
| Provider | Ollama |
| Model | `qwen2.5-coder:3b` |
| API endpoint | `/api/ai/explain` |
| Execution | Local Ollama service |

The AI Assistant is optional and requires Ollama to be installed and running.

</details>

---

## 🏗️ Project Architecture

El Nexo combines a framework runtime with an integrated Developer Studio.

```text
                   EL NEXO
                       |
          +------------+------------+
          |                         |
     Framework Core           Developer Studio
          |                         |
     Virtual DOM              Interactive Playground
          |                         |
     Reconciliation             Live Preview
          |                         |
     Fiber Structures          Component Explorer
          |                         |
     Hooks & State             Fiber Inspector
          |                         |
     DOM Rendering             Runtime Activity
                                    |
                              Performance Tools
                                    |
                              AI Assistant
                                    |
                              Theme Switching
```

### Project Structure

```text
El-Nexo/
├── .vscode/
├── examples/
│   ├── basics/
│   ├── components/
│   ├── hooks/
│   ├── interaction/
│   └── advanced/
├── playground/
│   ├── index.html
│   ├── main.js
│   ├── devtools.css
│   └── performance.html
├── src/
│   ├── core/
│   ├── devtools/
│   ├── fiber/
│   ├── reconciler/
│   ├── renderer/
│   └── vdom/
├── tests/
├── server.cjs
├── package.json
├── package-lock.json
└── README.md
```

---

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| JavaScript (ES Modules) | Framework implementation |
| HTML5 | Developer Studio structure |
| CSS3 | Workspace styling and themes |
| Node.js | Local development server |
| Express | Server-side APIs |
| Vitest | Automated testing |
| Ollama | Local AI integration |

---

## 🚀 Getting Started

### Prerequisites

- Node.js
- npm
- Ollama (optional, for AI Assistant functionality)

### 1. Clone the repository

```bash
git clone https://github.com/WHITE-bot-bit/El-Nexo.git
cd El-Nexo
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure the AI Assistant (Optional)

Install Ollama and download the supported coding model:

```bash
ollama pull qwen2.5-coder:3b
```

Make sure Ollama is running before using the AI Assistant.

### 4. Start El Nexo

```bash
npm start
```

Alternatively:

```bash
node server.cjs
```

### 5. Open Developer Studio

Visit:

```text
http://localhost:5500/playground/
```

Use the Node.js server instead of opening the HTML file directly. The server provides example discovery, AI API functionality, and project file serving.

---

## 🧑‍💻 How to Use the Playground

1. Open the Developer Studio.
2. Explore the Example Explorer.
3. Select an example.
4. Edit the component source.
5. Press **Run**.
6. Interact with the Live Preview.
7. Explore component information through Component Explorer.
8. Inspect Fiber-related structures through Fiber Inspector.
9. Monitor rendering activity.
10. Switch between Notebook and Studio themes.
11. Use the AI Assistant when Ollama is configured.

The editor supports injected `createElement`, `useState`, `useEffect`, and `useMemo` APIs.

> **Security note:** Playground code executes in the browser page context. Only execute code you trust. The Playground is an educational development environment, not a security sandbox.

---

## 🧪 Testing and Validation

El Nexo includes automated tests covering core runtime behavior, Fiber functionality, reconciliation, state management, hooks, and related features.

### Run automated tests

```bash
npm test
```

### Run performance benchmarks

```bash
npm run bench
```

### Verified Results

| Validation | Result |
|---|---:|
| Automated test files | 9 passed |
| Automated tests | 111 passed |
| Benchmark test files | 1 passed |
| Benchmark tests | 3 passed |

**All recorded tests passed in the local validation run.**

---

## 🧠 Architecture and Implementation Notes

El Nexo is an experimental framework intended to explore frontend framework internals. It is not a production-ready replacement for React or other established frameworks.

- The Playground renders through the Virtual DOM renderer and reconciler.
- The Fiber Inspector displays a Fiber tree built from the current Virtual DOM snapshot; this is not yet the active rendering tree used by the Playground.
- The Component Explorer uses a separate runtime registry to track function components invoked during rendering.
- Performance timings are approximate and intended for experimentation.

These distinctions are important when interpreting the Developer Studio visualizations.

---

## 🔮 Future Scope

Potential directions for further development include:

- More complete Fiber-based rendering integration.
- Expanded hook and lifecycle capabilities.
- More detailed runtime debugging.
- Improved performance profiling.
- Additional framework inspection tools.
- Expanded AI-assisted development features.

---

## 📌 Project Status

**El Nexo is an experimental frontend framework and Developer Studio.**

The project focuses on understanding framework internals while building a practical development environment around those concepts.

It combines framework implementation, interactive experimentation, runtime inspection, and local AI assistance in one project.

---

## 👨‍💻 Author

**Moreshwar Gaidhane**

GitHub: [WHITE-bot-bit](https://github.com/WHITE-bot-bit)

Project Repository: [El Nexo](https://github.com/WHITE-bot-bit/El-Nexo)

---

<p align="center">

### ⚡ El Nexo

**Explore the internals. Understand the rendering. Build your own framework.**

</p>