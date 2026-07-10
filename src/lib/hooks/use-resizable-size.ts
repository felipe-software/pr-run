import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

export type UseResizableSizeOptions = {
    axis: "horizontal" | "vertical";
    defaultSize: number;
    edge?: "left" | "right" | "top" | "bottom";
    maxSize: number | (() => number);
    minSize: number;
    storageKey?: string;
};

export type UseResizableSizeResult = {
    beginResize: (event: ReactPointerEvent<HTMLElement>) => void;
    setSize: (size: number) => void;
    size: number;
};

export function useResizableSize({
    axis,
    defaultSize,
    edge,
    maxSize,
    minSize,
    storageKey,
}: UseResizableSizeOptions): UseResizableSizeResult {
    const getMax = useCallback(
        () => (typeof maxSize === "function" ? maxSize() : maxSize),
        [maxSize],
    );
    const clamp = useCallback(
        (value: number) => Math.min(Math.max(value, minSize), getMax()),
        [getMax, minSize],
    );
    const [size, setLocalSize] = useState(() => {
        const persisted = storageKey
            ? Number(localStorage.getItem(storageKey))
            : Number.NaN;
        return clamp(Number.isFinite(persisted) ? persisted : defaultSize);
    });
    const sizeRef = useRef(size);

    useEffect(() => {
        sizeRef.current = size;
    }, [size]);

    const setSize = useCallback(
        (value: number) => {
            const next = clamp(value);
            setLocalSize(next);
            if (storageKey) {
                localStorage.setItem(storageKey, String(next));
            }
        },
        [clamp, storageKey],
    );

    const beginResize = useCallback(
        (event: ReactPointerEvent<HTMLElement>) => {
            event.preventDefault();
            const origin =
                axis === "horizontal" ? event.clientX : event.clientY;
            const initial = sizeRef.current;
            const previousCursor = document.body.style.cursor;
            const previousUserSelect = document.body.style.userSelect;
            document.body.style.cursor =
                axis === "horizontal" ? "col-resize" : "row-resize";
            document.body.style.userSelect = "none";

            function onPointerMove(moveEvent: PointerEvent) {
                const point =
                    axis === "horizontal"
                        ? moveEvent.clientX
                        : moveEvent.clientY;
                const positiveEdge = edge === "right" || edge === "bottom";
                const delta = positiveEdge ? point - origin : origin - point;
                const next = clamp(initial + delta);
                sizeRef.current = next;
                setLocalSize(next);
                if (storageKey) {
                    localStorage.setItem(storageKey, String(next));
                }
            }

            function stop() {
                document.body.style.cursor = previousCursor;
                document.body.style.userSelect = previousUserSelect;
                window.removeEventListener("pointermove", onPointerMove);
                window.removeEventListener("pointerup", stop);
                window.removeEventListener("pointercancel", stop);
            }

            window.addEventListener("pointermove", onPointerMove);
            window.addEventListener("pointerup", stop);
            window.addEventListener("pointercancel", stop);
        },
        [axis, clamp, edge, storageKey],
    );

    return { beginResize, setSize, size };
}
