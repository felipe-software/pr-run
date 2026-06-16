type SidebarRailProps = {
    onBeginResize: () => void;
};

export function SidebarRail({ onBeginResize }: SidebarRailProps) {
    return (
        <button
            aria-label="Resize sidebar"
            className="absolute inset-y-0 right-[-7px] z-20 hidden w-3 cursor-col-resize touch-none transition-colors after:absolute after:inset-y-2 after:left-1/2 after:w-px after:-translate-x-1/2 after:rounded-full after:bg-transparent after:transition-colors hover:after:bg-sidebar-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex"
            title="Drag to resize sidebar"
            type="button"
            onPointerDown={(event) => {
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                onBeginResize();
            }}
        />
    );
}
