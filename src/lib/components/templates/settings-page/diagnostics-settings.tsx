import { SettingsSection } from "@/lib/components/templates/settings-page/appearance-settings";
import type { AppStatusSummary } from "@/lib/components/templates/pr-run-app/use-app-status-summary";

export function DiagnosticsSettings({
    projectCount,
    summary,
}: {
    projectCount: number;
    summary: AppStatusSummary;
}) {
    const values = [
        ["Projects", projectCount],
        ["Branches", summary.branchCount],
        ["Open PRs", summary.openPullRequestCount],
        ["Worktrees", summary.worktreeCount],
        ["Stale worktrees", summary.staleWorktreeCount],
        ["Busy terminals", summary.busyTerminalCount],
    ];
    return (
        <SettingsSection
            description="A local summary of the currently loaded workspace."
            title="Diagnostics"
        >
            <dl
                className="bg-border grid gap-px overflow-hidden rounded-lg
                    border sm:grid-cols-2"
            >
                {values.map(([label, value]) => (
                    <div className="bg-card px-3 py-2.5" key={String(label)}>
                        <dt className="text-muted-foreground text-xs">
                            {label}
                        </dt>
                        <dd className="mt-1 font-mono text-lg tabular-nums">
                            {value}
                        </dd>
                    </div>
                ))}
            </dl>
        </SettingsSection>
    );
}
