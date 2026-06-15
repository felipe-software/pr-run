type SidebarEmptyStateProps = {
    children: string;
};

export function SidebarEmptyState({ children }: SidebarEmptyStateProps) {
    return (
        <div className="px-2 py-2 text-center text-xs leading-5 text-muted-foreground/70">
            {children}
        </div>
    );
}
