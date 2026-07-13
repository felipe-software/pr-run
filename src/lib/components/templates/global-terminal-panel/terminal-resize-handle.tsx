import type {
    KeyboardEvent as ReactKeyboardEvent,
    PointerEvent as ReactPointerEvent,
} from "react";

const TERMINAL_PANEL_MIN_HEIGHT = 180;
const TERMINAL_SIDEBAR_MIN_WIDTH = 132;
const TERMINAL_SIDEBAR_MAX_WIDTH = 360;
const TERMINAL_RESIZE_STEP = 16;

type BeginResize = (
    event: ReactPointerEvent<HTMLDivElement>,
    startValueOverride?: number,
) => void;

export function TerminalPanelResizeHandle({
    height,
    maximumHeight,
    onBeginResize,
}: {
    height: number;
    maximumHeight: number;
    onBeginResize: BeginResize;
}) {
    return (
        <div
            aria-controls="global-terminal-content"
            aria-label="Resize terminal panel"
            aria-orientation="horizontal"
            aria-valuemax={maximumHeight}
            aria-valuemin={TERMINAL_PANEL_MIN_HEIGHT}
            aria-valuenow={Math.round(height)}
            className="hover:bg-sidebar-accent/70
                focus-visible:bg-sidebar-accent focus-visible:ring-ring absolute
                top-0 right-0 left-0 z-20 h-2 -translate-y-1/2 cursor-row-resize
                transition-colors outline-none focus-visible:ring-2"
            role="separator"
            tabIndex={0}
            onKeyDown={(event) => {
                const currentHeight =
                    event.currentTarget.parentElement?.getBoundingClientRect()
                        .height ?? height;
                const targetHeight = getKeyboardResizeValue({
                    currentValue: currentHeight,
                    endValue: maximumHeight,
                    event,
                    lowerKey: "ArrowDown",
                    minimumValue: TERMINAL_PANEL_MIN_HEIGHT,
                    raiseKey: "ArrowUp",
                });

                if (targetHeight === null) {
                    return;
                }

                event.preventDefault();
                onBeginResize(
                    createKeyboardPointerStart(event.currentTarget),
                    currentHeight,
                );
                completeKeyboardDrag({
                    clientY: currentHeight - targetHeight,
                });
            }}
            onPointerDown={onBeginResize}
        />
    );
}

export function TerminalSidebarResizeHandle({
    onBeginResize,
    width,
}: {
    onBeginResize: BeginResize;
    width: number;
}) {
    return (
        <div
            aria-controls="global-terminal-sidebar"
            aria-label="Resize terminal list"
            aria-orientation="vertical"
            aria-valuemax={TERMINAL_SIDEBAR_MAX_WIDTH}
            aria-valuemin={TERMINAL_SIDEBAR_MIN_WIDTH}
            aria-valuenow={Math.round(width)}
            className="hover:bg-sidebar-accent/70
                focus-visible:bg-sidebar-accent focus-visible:ring-ring absolute
                top-0 bottom-0 left-0 z-20 w-2 -translate-x-1/2
                cursor-col-resize transition-colors outline-none
                focus-visible:ring-2"
            role="separator"
            tabIndex={0}
            onKeyDown={(event) => {
                const targetWidth = getKeyboardResizeValue({
                    currentValue: width,
                    endValue: TERMINAL_SIDEBAR_MAX_WIDTH,
                    event,
                    lowerKey: "ArrowRight",
                    minimumValue: TERMINAL_SIDEBAR_MIN_WIDTH,
                    raiseKey: "ArrowLeft",
                });

                if (targetWidth === null) {
                    return;
                }

                event.preventDefault();
                onBeginResize(createKeyboardPointerStart(event.currentTarget));
                completeKeyboardDrag({ clientX: width - targetWidth });
            }}
            onPointerDown={onBeginResize}
        />
    );
}

function getKeyboardResizeValue({
    currentValue,
    endValue,
    event,
    lowerKey,
    minimumValue,
    raiseKey,
}: {
    currentValue: number;
    endValue: number;
    event: ReactKeyboardEvent<HTMLDivElement>;
    lowerKey: string;
    minimumValue: number;
    raiseKey: string;
}) {
    const step = event.shiftKey
        ? TERMINAL_RESIZE_STEP * 3
        : TERMINAL_RESIZE_STEP;

    if (event.key === "Home") {
        return minimumValue;
    }

    if (event.key === "End") {
        return endValue;
    }

    if (event.key === raiseKey) {
        return Math.min(currentValue + step, endValue);
    }

    if (event.key === lowerKey) {
        return Math.max(currentValue - step, minimumValue);
    }

    return null;
}

function createKeyboardPointerStart(currentTarget: HTMLDivElement) {
    return {
        clientX: 0,
        clientY: 0,
        currentTarget,
        preventDefault() {},
    } as ReactPointerEvent<HTMLDivElement>;
}

function completeKeyboardDrag({
    clientX = 0,
    clientY = 0,
}: {
    clientX?: number;
    clientY?: number;
}) {
    window.dispatchEvent(new PointerEvent("pointermove", { clientX, clientY }));
    window.dispatchEvent(new PointerEvent("pointerup"));
}
