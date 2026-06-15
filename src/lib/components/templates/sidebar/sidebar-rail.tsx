type SidebarRailProps = {
    onBeginResize: () => void;
};

export function SidebarRail({ onBeginResize }: SidebarRailProps) {
    return (
        <button
            aria-label="Resize sidebar"
            className="absolute inset-y-0 right-[-8px] z-20 hidden w-4 cursor-col-resize transition-colors after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] after:-translate-x-1/2 after:bg-transparent after:transition-colors hover:after:bg-sidebar-border sm:flex"
            title="Drag to resize sidebar"
            type="button"
            onMouseDown={(event) => {
                event.preventDefault();
                onBeginResize();
            }}
        />
    );
}
