
/**
 * El Nexo - Fiber Performance Benchmark
 *
 * Measures:
 * - 10, 50 and 100 component trees
 * - Initial component executions
 * - Clean component bailout
 * - Single dirty component rendering
 * - Fiber tree construction time
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
} from "vitest";

// --------------------------------------------------
// Mock dirty-component tracking
// --------------------------------------------------

const { dirtyIds } = vi.hoisted(() => ({
  dirtyIds: new Set(),
}));

vi.mock("../src/core/state.js", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,

    isComponentDirty: vi.fn((componentId) => {
      return dirtyIds.has(componentId);
    }),
  };
});

// --------------------------------------------------
// Imports
// --------------------------------------------------

import { createElement } from "../src/vdom/createElement.js";

import {
  buildFiberTree,
} from "../src/fiber/fiber.js";

// --------------------------------------------------
// Benchmark state
// --------------------------------------------------

let benchmarkRenderCount = 0;

// IMPORTANT:
// Keep this component outside createBenchmarkTree().
// Its function identity must remain stable across renders.

function BenchComponent({ index }) {
  benchmarkRenderCount += 1;

  return createElement(
    "div",
    { "data-index": index },
    `Component ${index}`,
  );
}

// --------------------------------------------------
// Benchmark helpers
// --------------------------------------------------

function createBenchmarkTree(componentCount) {
  return createElement(
    "main",
    null,
    ...Array.from({ length: componentCount }, (_, index) =>
      createElement(
        BenchComponent,
        {
          key: `item-${index}`,
          index,
        },
      ),
    ),
  );
}

function buildTree(vnode, alternate = null) {
  return buildFiberTree(
    vnode,
    null,
    (component, props) => component(props),
    "root",
    alternate,
  );
}

function getComponentId(index) {
  return `root/BenchComponent:key:item-${index}`;
}

// --------------------------------------------------
// Benchmark suite
// --------------------------------------------------

describe("El Nexo Fiber Performance Benchmark", () => {
  beforeEach(() => {
    dirtyIds.clear();
    benchmarkRenderCount = 0;

    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  const componentSizes = [10, 50, 100];

  it.each(componentSizes)(
    "benchmarks a tree containing %i components",
    (componentCount) => {
      // --------------------------------------------
      // Initial render
      // --------------------------------------------

      const initialVNode = createBenchmarkTree(componentCount);

      const initialStart = performance.now();

      const firstTree = buildTree(initialVNode);

      const initialDuration = performance.now() - initialStart;

      const initialExecutions = benchmarkRenderCount;

      expect(initialExecutions).toBe(componentCount);

      // --------------------------------------------
      // Clean update
      // --------------------------------------------

      const cleanStart = performance.now();

      const secondTree = buildTree(
        createBenchmarkTree(componentCount),
        firstTree,
      );

      const cleanDuration = performance.now() - cleanStart;

      const executionsAfterCleanUpdate = benchmarkRenderCount;

      // All components should skip execution.
      expect(executionsAfterCleanUpdate).toBe(componentCount);

      // --------------------------------------------
      // Single dirty component update
      // --------------------------------------------

      dirtyIds.add(getComponentId(0));

      const dirtyStart = performance.now();

      const thirdTree = buildTree(
        createBenchmarkTree(componentCount),
        secondTree,
      );

      const dirtyDuration = performance.now() - dirtyStart;

      const executionsAfterDirtyUpdate = benchmarkRenderCount;

      // Only one component should execute.
      expect(executionsAfterDirtyUpdate).toBe(componentCount + 1);

      // --------------------------------------------
      // Benchmark report
      // --------------------------------------------

      const report = {
        components: componentCount,

        initialExecutions,

        cleanUpdateExecutions:
          executionsAfterCleanUpdate - initialExecutions,

        dirtyUpdateExecutions:
          executionsAfterDirtyUpdate - executionsAfterCleanUpdate,

        initialBuildMs: initialDuration.toFixed(3),

        cleanUpdateMs: cleanDuration.toFixed(3),

        dirtyUpdateMs: dirtyDuration.toFixed(3),

        skippedExecutions:
          componentCount -
          (executionsAfterCleanUpdate - initialExecutions),

        bailoutPercentage: "100%",
      };

      console.log(
        `\n[Fiber Benchmark] ${componentCount} components`,
        report,
      );

      // --------------------------------------------
      // Verify Fiber structure
      // --------------------------------------------

      expect(firstTree.child).not.toBeNull();
      expect(secondTree.child).not.toBeNull();
      expect(thirdTree.child).not.toBeNull();

      expect(secondTree.child.alternate).toBe(firstTree.child);
      expect(thirdTree.child.alternate).toBe(secondTree.child);
    },
  );
});
