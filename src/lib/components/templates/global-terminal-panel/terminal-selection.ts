import type {
    WorktreeTerminalOwnerKey,
    WorktreeTerminalOwnerState,
} from "@/lib/hooks/store/use-worktree-terminal-store";
import type { ProjectGroup } from "@/types/pr-run";

type TerminalOwners = Record<
    WorktreeTerminalOwnerKey,
    WorktreeTerminalOwnerState
>;

export type TerminalTreeGroup = {
    branchName: string;
    id: string;
    isBusy: boolean;
    ownerKey: string;
    projectId: string;
    title: string;
    terminals: TerminalTreeTab[];
};

export type TerminalTreeTab = {
    branchName: string;
    busyState: "idle" | "busy" | "unknown";
    id: string;
    isAlive: boolean;
    label: string;
    ownerKey: string;
    projectId: string;
    sessionId: string;
    terminalKey: string;
};

export function selectGlobalTerminal(
    terminals: TerminalTreeTab[],
    preferredOwnerKey: string | null,
    selectedTerminalKey: string | null,
) {
    if (preferredOwnerKey) {
        return (
            terminals.find(
                (terminal) =>
                    terminal.ownerKey === preferredOwnerKey &&
                    terminal.terminalKey === selectedTerminalKey,
            ) ??
            terminals.find(
                (terminal) => terminal.ownerKey === preferredOwnerKey,
            ) ??
            null
        );
    }

    return (
        terminals.find(
            (terminal) => terminal.terminalKey === selectedTerminalKey,
        ) ??
        terminals[0] ??
        null
    );
}

export function buildTerminalTree(
    groups: ProjectGroup[],
    owners: TerminalOwners,
) {
    const projects = groups.flatMap((group) => group.projects);
    const projectNameById = new Map(
        projects.map((project) => [project.id, project.name]),
    );
    const projectOrder = new Map(
        projects.map((project, index) => [project.id, index]),
    );
    const groupMap = new Map<string, TerminalTreeGroup>();

    for (const [ownerKey, owner] of Object.entries(owners)) {
        if (owner.tabs.length === 0) {
            continue;
        }

        const { branchName, projectId } = parseOwnerKey(ownerKey);
        const projectName = projectNameById.get(projectId) ?? projectId;
        const group = ensureTerminalGroup(
            groupMap,
            ownerKey,
            branchName,
            projectId,
            ownerKey === "global:home"
                ? "Home"
                : `${projectName} - ${branchName}`,
        );

        group.terminals.push(
            ...owner.tabs.map((tab) => ({
                branchName,
                busyState: tab.busyState,
                id: tab.id,
                isAlive: tab.status === "alive",
                label: tab.label,
                ownerKey,
                projectId,
                sessionId: tab.sessionId,
                terminalKey: getTerminalKey(ownerKey, tab.id),
            })),
        );
        group.isBusy = group.terminals.some(
            (terminal) => terminal.isAlive && terminal.busyState === "busy",
        );
    }

    return [...groupMap.values()].sort(
        (left, right) =>
            (projectOrder.get(left.projectId) ?? Number.MAX_SAFE_INTEGER) -
                (projectOrder.get(right.projectId) ??
                    Number.MAX_SAFE_INTEGER) ||
            left.branchName.localeCompare(right.branchName),
    );
}

export function flattenTerminalTree(tree: TerminalTreeGroup[]) {
    return tree.flatMap((group) => group.terminals);
}

export function getTerminalKey(ownerKey: string, tabId: string) {
    return `${ownerKey}::${tabId}`;
}

export function toggleTerminalGroup(set: Set<string>, value: string) {
    const next = new Set(set);

    if (next.has(value)) {
        next.delete(value);
    } else {
        next.add(value);
    }

    return next;
}

function ensureTerminalGroup(
    groupMap: Map<string, TerminalTreeGroup>,
    ownerKey: string,
    branchName: string,
    projectId: string,
    title: string,
) {
    const existing = groupMap.get(ownerKey);

    if (existing) {
        return existing;
    }

    const group: TerminalTreeGroup = {
        branchName,
        id: ownerKey,
        isBusy: false,
        ownerKey,
        projectId,
        title,
        terminals: [],
    };

    groupMap.set(ownerKey, group);
    return group;
}

function parseOwnerKey(ownerKey: string) {
    const separatorIndex = ownerKey.indexOf(":");

    if (separatorIndex === -1) {
        return {
            branchName: ownerKey,
            projectId: ownerKey,
        };
    }

    return {
        branchName: ownerKey.slice(separatorIndex + 1),
        projectId: ownerKey.slice(0, separatorIndex),
    };
}
