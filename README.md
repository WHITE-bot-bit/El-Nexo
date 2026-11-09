# ⚡ El Nexo — Developer Studio

### Explore the internals. Understand the rendering. Build your own framework.

**El Nexo** is an experimental lightweight frontend framework built from scratch, accompanied by an integrated browser-based Developer Studio.

It explores the internal concepts behind modern frontend frameworks, including Virtual DOM creation, reconciliation, Fiber architecture, component rendering, state management, and lifecycle handling.

The Developer Studio brings these concepts into an interactive workspace where developers can write components, execute examples, inspect runtime behavior, and explore framework internals.

## 🌐 Live Demo

**Developer Studio:** https://el-nexo-developer-studio.vercel.app/playground/

**GitHub Repository:** https://github.com/WHITE-bot-bit/El-Nexo

**Latest Release:** v1.0.0

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
| AI Integration | Cloudflare Workers AI coding assistant |
| Testing | Automated tests and Fiber benchmarks |
| Deployment | Vercel and Cloudflare Workers |

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

</details>

<details>
<summary><strong>03. 🔍 Component Explorer — Understand Your Components</strong></summary>

The Component Explorer provides visibility into function components registered during runtime.

- Inspect registered components.
- Explore component names and types.
- Explore component properties.
- Inspect available hook information.
- View component rendering and runtime registration data.

</details>

<details>
<summary><strong>04. 🌳 Fiber Inspector and Fiber Tree</strong></summary>

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
- Cream-colored background.
- Graph-paper visual styling.
- Navy typography.
- Yellow accent details.
- Learning and experimentation atmosphere.

**💻 Studio Theme**
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
<summary><strong>07. 🤖 AI Assistant — Cloudflare Workers AI</strong></summary>

El Nexo integrates an AI coding assistant powered by Cloudflare Workers AI.

The assistant connects to a separately deployed Cloudflare Worker, allowing the public Developer Studio to make AI requests without requiring the visitor to run Ollama or host a local Node.js backend.

**AI Capabilities**
- Explain selected source code.
- Provide debugging assistance.
- Answer questions about code.
- Provide context-aware development guidance.

**AI Technology**

| Component | Configuration |
|---|---|
| Provider | Cloudflare Workers AI |
| Model | `@cf/google/gemma-4-26b-a4b-it` |
| Backend | Cloudflare Worker |
| Health endpoint | `/api/ai/health` |
| Explanation endpoint | `/api/ai/explain` |
| Frontend hosting | Vercel |

**Request Flow**

1. A developer submits a question in the Playground.
2. The frontend sends the request to the Cloudflare Worker.
3. The Worker validates the request and applies rate limiting.
4. Cloudflare Workers AI processes the prompt.
5. The Worker returns the generated explanation.
6. The Developer Studio displays the response.

**Cloudflare Worker Bindings**

The Worker uses the following bindings:

- `AI` — Cloudflare Workers AI binding.
- `AI_RATE_LIMITER` — rate-limiting binding.

The deployed Worker also validates the allowed frontend origin and limits request and input sizes.

**Important:** Cloudflare Workers AI has usage limits and applicable pricing or quotas. Availability and usage depend on the Cloudflare account and plan.

</details>

---

## 🏗️ Project Architecture

El Nexo combines a framework runtime with an integrated Developer Studio.

```text
                         EL NEXO
                            |
              +-------------+-------------+
              |                           |
        Framework Core              Developer Studio
              |                           |
         Virtual DOM              Interactive Playground
              |                           |
        Reconciliation                 Live Preview
              |                           |
        Fiber Structures           Component Explorer
              |                           |
         Hooks & State               Fiber Inspector
              |                           |
         DOM Rendering               Runtime Activity
                                          |
                                    Performance Tools
                                          |
                                      AI Assistant
                                          |
                                    Theme Switching
```

### Production Architecture

```text
                 Developer / Browser
                         |
                         v
              Vercel — Frontend Hosting
                         |
               El Nexo Developer Studio
                         |
              AI request from frontend
                         |
                         v
             Cloudflare Worker — API
                         |
                Request Validation
                         |
                  Rate Limiting
                         |
                         v
              Cloudflare Workers AI
                         |
                 Gemma 4 Model
                         |
                         v
                AI Explanation
                         |
                         v
              Developer Studio UI
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
├── scripts/
│   └── build.mjs
├── src/
│   ├── core/
│   ├── devtools/
│   ├── fiber/
│   ├── reconciler/
│   ├── renderer/
│   └── vdom/
├── tests/
├── server.cjs
├── vercel.json
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
| Node.js | Local development server and build tooling |
| Express | Local server-side APIs |
| Vitest | Automated testing |
| Vercel | Public frontend hosting |
| Cloudflare Workers | AI API backend |
| Cloudflare Workers AI | AI inference |
| Gemma 4 | Configured AI model |

---

## 🚀 Getting Started

### Prerequisites

- Node.js
- npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/WHITE-bot-bit/El-Nexo.git
cd El-Nexo
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the local development server

```bash
npm start
```

Alternatively:

```bash
node server.cjs
```

### 4. Open Developer Studio

Visit:

```text
http://localhost:5500/playground/
```

Use the Node.js server instead of opening the HTML file directly. The local server provides example discovery, project file serving, and the configured local development APIs.

**Note:** The public deployment uses Cloudflare Workers AI. The local server and its AI configuration are separate from the production Worker.

---

## 🌍 Production Deployment

### Frontend — Vercel

The public Developer Studio is hosted on Vercel.

**Live URL:**

https://el-nexo-developer-studio.vercel.app/playground/

The project is connected to the GitHub repository:

https://github.com/WHITE-bot-bit/El-Nexo

**Production build**

Run:

```bash
npm run build
```

The build script generates the `dist` directory containing:
- Playground files.
- Framework runtime files from `src`.
- Example files.
- Generated `examples/index.json`.

**Vercel configuration**

| Setting | Value |
|---|---|
| Framework Preset | Other |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Production Branch | `main` |

The Vercel configuration also redirects the root URL to `/playground/` and serves the generated examples index through the `/api/examples` rewrite.

### AI Backend — Cloudflare Workers

The AI assistant is hosted separately using Cloudflare Workers.

**Worker endpoint:**

```text
https://el-nexo-ai.moreshwar771.workers.dev
```

**Available API routes:**

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/ai/health` | Check AI service connection |
| POST | `/api/ai/explain` | Generate code explanations |

The explanation endpoint accepts:

```json
{
  "prompt": "Explain how Fiber nodes work",
  "context": "Source code goes here",
  "fileName": "Counter.js"
}
```

The Worker uses Cloudflare Workers AI to generate the response.

**Cloudflare configuration requirements**
- Enable the Workers AI binding named `AI`.
- Configure the rate-limiting binding named `AI_RATE_LIMITER`.
- Allow the production frontend origin:
  `https://el-nexo-developer-studio.vercel.app`

Do not expose private credentials or account secrets in frontend code or this repository.

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
11. Use the AI Assistant to ask questions about code.

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
| Latest npm audit | 0 vulnerabilities |

These results reflect the local validation run.

---

## 🧠 Architecture and Implementation Notes

El Nexo is an experimental framework intended to explore frontend framework internals. It is not a production-ready replacement for React or other established frameworks.

- The Playground renders through the Virtual DOM renderer and reconciler.
- The Fiber Inspector displays a Fiber tree built from the current Virtual DOM snapshot; this is not yet the active rendering tree used by the Playground.
- The Component Explorer uses a separate runtime registry to track function components invoked during rendering.
- Performance timings are approximate and intended for experimentation.
- The Render Timeline is a conceptual visualization and should not be interpreted as precise per-component profiling.

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
- More comprehensive framework documentation.
- Additional runtime and reconciliation tests.

---

## 📌 Project Status

**El Nexo v1.0.0 — Initial Public Release**

El Nexo is an experimental frontend framework and Developer Studio.

The project focuses on understanding framework internals while building a practical development environment around those concepts.

It combines framework implementation, interactive experimentation, runtime inspection, and AI-assisted development in one project.

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