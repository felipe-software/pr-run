interface WindowControlsOverlayLike {
    readonly visible: boolean;
    addEventListener(type: "geometrychange", listener: EventListener): void;
    removeEventListener(type: "geometrychange", listener: EventListener): void;
}

interface WindowControlsOverlayNavigator extends Navigator {
    readonly windowControlsOverlay?: WindowControlsOverlayLike;
}

export function syncWindowControlsOverlayClass() {
    const overlay = (navigator as WindowControlsOverlayNavigator)
        .windowControlsOverlay;
    const update = () => {
        document.documentElement.classList.toggle(
            "wco",
            Boolean(overlay?.visible),
        );
    };

    update();

    if (!overlay) {
        return () => {};
    }

    overlay.addEventListener("geometrychange", update);

    return () => overlay.removeEventListener("geometrychange", update);
}
