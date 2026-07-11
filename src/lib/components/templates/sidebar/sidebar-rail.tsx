import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useRef } from "react";

import { sidebarResize } from "@/lib/components/templates/sidebar/sidebar-resize";

type SidebarRailProps = {
    onResize: (width: number) => void;
};

type SidebarResizeState = {
    pendingWidth: number;
    pointerId: number;
    previousCursor: string;
    previousUserSelect: string;
    rafId: number | null;
    rail: HTMLButtonElement;
    resizeRoot: HTMLElement;
    startWidth: number;
    startX: number;
    transitionTargets: HTMLElement[];
    width: number;
};

function restoreResizeUi(resizeState: SidebarResizeState) {
    resizeState.transitionTargets.forEach((element) => {
        element.style.removeProperty("transition-duration");
    });
    document.body.style.cursor = resizeState.previousCursor;
    document.body.style.userSelect = resizeState.previousUserSelect;
}

export function SidebarRail({ onResize }: SidebarRailProps) {
    const resizeStateRef = useRef<SidebarResizeState | null>(null);

    const stopResize = useCallback(
        (pointerId: number) => {
            const resizeState = resizeStateRef.current;

            if (!resizeState || resizeState.pointerId !== pointerId) {
                return;
            }

            if (resizeState.rafId !== null) {
                window.cancelAnimationFrame(resizeState.rafId);
            }

            restoreResizeUi(resizeState);
            onResize(resizeState.width);
            resizeStateRef.current = null;

            if (resizeState.rail.hasPointerCapture(pointerId)) {
                resizeState.rail.releasePointerCapture(pointerId);
            }
        },
        [onResize],
    );

    const handlePointerDown = useCallback(
        (event: ReactPointerEvent<HTMLButtonElement>) => {
            if (event.button !== 0) {
                return;
            }

            const resizeRoot = event.currentTarget.closest<HTMLElement>(
                "[data-slot='sidebar-resize-root']",
            );
            const sidebarPanel = event.currentTarget.closest<HTMLElement>(
                "[data-slot='sidebar-panel']",
            );
            const sidebarGap = resizeRoot?.querySelector<HTMLElement>(
                "[data-slot='sidebar-gap']",
            );
            const titlebarGap = resizeRoot?.querySelector<HTMLElement>(
                "[data-slot='sidebar-titlebar-gap']",
            );

            if (!resizeRoot || !sidebarPanel || !sidebarGap || !titlebarGap) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            const startWidth = sidebarResize.clamp(
                sidebarPanel.getBoundingClientRect().width,
            );
            const transitionTargets = [sidebarGap, sidebarPanel, titlebarGap];

            transitionTargets.forEach((element) => {
                element.style.setProperty("transition-duration", "0ms");
            });

            resizeStateRef.current = {
                pendingWidth: startWidth,
                pointerId: event.pointerId,
                previousCursor: document.body.style.cursor,
                previousUserSelect: document.body.style.userSelect,
                rafId: null,
                rail: event.currentTarget,
                resizeRoot,
                startWidth,
                startX: event.clientX,
                transitionTargets,
                width: startWidth,
            };

            resizeRoot.style.setProperty("--sidebar-width", `${startWidth}px`);
            event.currentTarget.setPointerCapture(event.pointerId);
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
        },
        [],
    );

    const handlePointerMove = useCallback(
        (event: ReactPointerEvent<HTMLButtonElement>) => {
            const resizeState = resizeStateRef.current;

            if (!resizeState || resizeState.pointerId !== event.pointerId) {
                return;
            }

            event.preventDefault();
            resizeState.pendingWidth = sidebarResize.clamp(
                resizeState.startWidth + event.clientX - resizeState.startX,
            );

            if (resizeState.rafId !== null) {
                return;
            }

            resizeState.rafId = window.requestAnimationFrame(() => {
                const activeResizeState = resizeStateRef.current;

                if (!activeResizeState) {
                    return;
                }

                activeResizeState.rafId = null;
                const nextWidth = activeResizeState.pendingWidth;

                if (
                    !sidebarResize.canAccept(
                        nextWidth,
                        activeResizeState.resizeRoot.clientWidth,
                    )
                ) {
                    return;
                }

                activeResizeState.resizeRoot.style.setProperty(
                    "--sidebar-width",
                    `${nextWidth}px`,
                );
                activeResizeState.width = nextWidth;
            });
        },
        [],
    );

    const endResize = useCallback(
        (event: ReactPointerEvent<HTMLButtonElement>) => {
            const resizeState = resizeStateRef.current;

            if (!resizeState || resizeState.pointerId !== event.pointerId) {
                return;
            }

            event.preventDefault();
            stopResize(event.pointerId);
        },
        [stopResize],
    );

    useEffect(() => {
        return () => {
            const resizeState = resizeStateRef.current;

            if (!resizeState) {
                return;
            }

            if (resizeState.rafId !== null) {
                window.cancelAnimationFrame(resizeState.rafId);
            }

            restoreResizeUi(resizeState);
            resizeStateRef.current = null;
        };
    }, []);

    return (
        <button
            aria-label="Resize sidebar"
            className="hover:after:bg-sidebar-border focus-visible:ring-ring
                absolute inset-y-0 right-[-7px] z-20 hidden w-3
                cursor-col-resize touch-none transition-colors after:absolute
                after:inset-y-2 after:left-1/2 after:w-px after:-translate-x-1/2
                after:rounded-full after:bg-transparent after:transition-colors
                focus-visible:ring-2 focus-visible:outline-none lg:flex"
            title="Drag to resize sidebar"
            type="button"
            onPointerCancel={endResize}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endResize}
        />
    );
}
