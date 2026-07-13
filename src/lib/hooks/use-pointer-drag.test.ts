import { describe, expect, test, vi } from "vitest";

import { registerPointerDrag } from "@/lib/hooks/use-pointer-drag";

class FakePointerTarget {
    readonly listeners = new Map<string, Set<EventListener>>();

    addEventListener(type: string, listener: EventListener) {
        const listeners = this.listeners.get(type) ?? new Set<EventListener>();
        listeners.add(listener);
        this.listeners.set(type, listeners);
    }

    removeEventListener(type: string, listener: EventListener) {
        this.listeners.get(type)?.delete(listener);
    }

    dispatch(type: string) {
        for (const listener of this.listeners.get(type) ?? []) {
            listener({ type } as Event);
        }
    }

    listenerCount(type: string) {
        return this.listeners.get(type)?.size ?? 0;
    }
}

describe("registerPointerDrag", () => {
    test("restores body styles and removes every listener on cleanup", () => {
        const target = new FakePointerTarget();
        const style = { cursor: "wait", userSelect: "text" };
        const onEnd = vi.fn();
        const cleanup = registerPointerDrag({
            cursor: "col-resize",
            onEnd,
            onMove: vi.fn(),
            style,
            target,
        });

        expect(style).toEqual({ cursor: "col-resize", userSelect: "none" });
        expect(target.listenerCount("pointermove")).toBe(1);
        expect(target.listenerCount("pointerup")).toBe(1);
        expect(target.listenerCount("pointercancel")).toBe(1);

        cleanup();
        cleanup();

        expect(style).toEqual({ cursor: "wait", userSelect: "text" });
        expect(target.listenerCount("pointermove")).toBe(0);
        expect(target.listenerCount("pointerup")).toBe(0);
        expect(target.listenerCount("pointercancel")).toBe(0);
        expect(onEnd).toHaveBeenCalledTimes(1);
    });

    test("pointer completion performs the same idempotent cleanup", () => {
        const target = new FakePointerTarget();
        const style = { cursor: "", userSelect: "" };
        const onEnd = vi.fn();
        const cleanup = registerPointerDrag({
            cursor: "row-resize",
            onEnd,
            onMove: vi.fn(),
            style,
            target,
        });

        target.dispatch("pointerup");
        cleanup();

        expect(style).toEqual({ cursor: "", userSelect: "" });
        expect(target.listenerCount("pointermove")).toBe(0);
        expect(onEnd).toHaveBeenCalledTimes(1);
    });
});
