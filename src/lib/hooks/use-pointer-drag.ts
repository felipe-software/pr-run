import { useCallback, useEffect, useRef } from "react";

type PointerDragTarget = {
    addEventListener: (type: string, listener: EventListener) => void;
    removeEventListener: (type: string, listener: EventListener) => void;
};

type PointerDragStyle = Pick<CSSStyleDeclaration, "cursor" | "userSelect">;

type RegisterPointerDragOptions = {
    cursor: string;
    onEnd?: () => void;
    onMove: (event: PointerEvent) => void;
    style?: PointerDragStyle;
    target?: PointerDragTarget;
};

export type PointerDragCleanup = () => void;

export function registerPointerDrag({
    cursor,
    onEnd,
    onMove,
    style = document.body.style,
    target = window,
}: RegisterPointerDragOptions): PointerDragCleanup {
    const previousCursor = style.cursor;
    const previousUserSelect = style.userSelect;
    const pointerMoveListener = onMove as EventListener;
    let isCleanedUp = false;

    function cleanup() {
        if (isCleanedUp) {
            return;
        }

        isCleanedUp = true;
        style.cursor = previousCursor;
        style.userSelect = previousUserSelect;
        target.removeEventListener("pointermove", pointerMoveListener);
        target.removeEventListener("pointerup", stopListener);
        target.removeEventListener("pointercancel", stopListener);
        onEnd?.();
    }

    const stopListener = cleanup as EventListener;

    style.cursor = cursor;
    style.userSelect = "none";
    target.addEventListener("pointermove", pointerMoveListener);
    target.addEventListener("pointerup", stopListener);
    target.addEventListener("pointercancel", stopListener);

    return cleanup;
}

export function usePointerDrag() {
    const cleanupRef = useRef<PointerDragCleanup | null>(null);

    useEffect(() => {
        return () => cleanupRef.current?.();
    }, []);

    return useCallback((options: RegisterPointerDragOptions) => {
        cleanupRef.current?.();
        const cleanup = registerPointerDrag(options);
        cleanupRef.current = cleanup;
        return cleanup;
    }, []);
}
