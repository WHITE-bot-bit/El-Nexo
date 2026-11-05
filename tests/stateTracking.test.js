
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  beginComponent,
  endComponent,
  useState,
  setUpdateCallback,
  resetHooks,
  getDirtyComponents,
  isComponentDirty,
  clearDirtyComponents,
  cleanupComponent
} from "../src/core/state.js";

describe("Component-specific state tracking", () => {
  beforeEach(() => {
    resetHooks();
  });

  function renderState(componentId) {
    beginComponent(componentId);

    try {
      return useState(0);
    } finally {
      endComponent();
    }
  }

  it("marks only the component whose state changes as dirty", () => {
    const [, setCountA] = renderState("CounterA");
    renderState("CounterB");

    setCountA(5);

    expect(isComponentDirty("CounterA")).toBe(true);
    expect(isComponentDirty("CounterB")).toBe(false);
    expect(getDirtyComponents()).toEqual(["CounterA"]);
  });

  it("tracks multiple components with pending state updates", () => {
    const [, setCountA] = renderState("CounterA");
    const [, setCountB] = renderState("CounterB");

    setCountA(3);
    setCountB(7);

    expect(getDirtyComponents()).toHaveLength(2);
    expect(isComponentDirty("CounterA")).toBe(true);
    expect(isComponentDirty("CounterB")).toBe(true);
  });

  it("does not mark a component dirty when its state is unchanged", () => {
    const [, setCount] = renderState("CounterA");

    const updateCallback = vi.fn();
    setUpdateCallback(updateCallback);

    setCount(0);

    expect(isComponentDirty("CounterA")).toBe(false);
    expect(getDirtyComponents()).toEqual([]);
    expect(updateCallback).not.toHaveBeenCalled();
  });

  it("passes the correct component ID to the update callback", () => {
    const [, setCount] = renderState("CounterA");

    const updateCallback = vi.fn();
    setUpdateCallback(updateCallback);

    setCount(10);

    expect(updateCallback).toHaveBeenCalledTimes(1);
    expect(updateCallback).toHaveBeenCalledWith("CounterA");
  });

  it("clears one dirty component without affecting others", () => {
    const [, setCountA] = renderState("CounterA");
    const [, setCountB] = renderState("CounterB");

    setCountA(2);
    setCountB(4);

    clearDirtyComponents("CounterA");

    expect(isComponentDirty("CounterA")).toBe(false);
    expect(isComponentDirty("CounterB")).toBe(true);
    expect(getDirtyComponents()).toEqual(["CounterB"]);
  });

  it("clears all dirty components when called without an ID", () => {
    const [, setCountA] = renderState("CounterA");
    const [, setCountB] = renderState("CounterB");

    setCountA(2);
    setCountB(4);

    clearDirtyComponents();

    expect(getDirtyComponents()).toEqual([]);
  });

  it("removes dirty tracking when a component is unmounted", () => {
    const [, setCount] = renderState("CounterA");

    setCount(5);

    expect(isComponentDirty("CounterA")).toBe(true);

    cleanupComponent("CounterA");

    expect(isComponentDirty("CounterA")).toBe(false);
    expect(getDirtyComponents()).toEqual([]);
  });

  it("ignores state updates from an unmounted component", () => {
    const [, setCount] = renderState("CounterA");

    cleanupComponent("CounterA");

    const updateCallback = vi.fn();
    setUpdateCallback(updateCallback);

    setCount(5);

    expect(getDirtyComponents()).toEqual([]);
    expect(updateCallback).not.toHaveBeenCalled();
  });
});
