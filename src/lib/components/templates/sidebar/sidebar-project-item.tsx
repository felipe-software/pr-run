import { autoAnimate } from "@formkit/auto-animate";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { isHandledSshPromptError } from "@/lib/api";
import { SidebarProjectBranches } from "@/lib/components/templates/sidebar/sidebar-project-branches";
import { SidebarProjectHeader } from "@/lib/components/templates/sidebar/sidebar-project-header";
import {
    getDisplayedSidebarBranches,
    getVisibleSidebarBranches,
    sortBranchesByLastCommit,
} from "@/lib/components/templates/sidebar/sidebar-sort";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { useProjectBranchesQuery } from "@/lib/hooks/query/use-project-branches-query";
import { useSshPassphraseStore } from "@/lib/hooks/store/use-ssh-passphrase-store";
import type { BranchInfo, ProjectConfig } from "@/types/pr-run";

type SidebarProjectItemProps = {
    busyOwnerKeys: Set<string>;
    isExpanded: boolean;
    isBusy: boolean;
    isSelected: boolean;
    isUpdatingProject: boolean;
    pendingWorktreeCheckoutKey?: string;
    pendingWorktreeRemovalKey?: string;
    project: ProjectConfig;
    projectAvatarUri?: string;
    selectedBranchName?: string;
    onCheckoutBranch: (projectId: string, branchName: string) => Promise<void>;
    onRemoveWorktree: (projectId: string, branchName: string) => Promise<void>;
    onOpenProject: (projectId: string) => void;
    onSelectBranch: (project: ProjectConfig, branch: BranchInfo) => void;
    onToggleProject: (projectId: string) => void;
    onUpdateProject: (project: ProjectConfig) => Promise<boolean>;
};

const INITIAL_VISIBLE_BRANCH_COUNT = 5;

export function SidebarProjectItem({
    busyOwnerKeys,
    isExpanded,
    isBusy,
    isSelected,
    isUpdatingProject,
    pendingWorktreeCheckoutKey,
    pendingWorktreeRemovalKey,
    project,
    projectAvatarUri,
    selectedBranchName,
    onCheckoutBranch,
    onRemoveWorktree,
    onOpenProject,
    onSelectBranch,
    onToggleProject,
    onUpdateProject,
}: SidebarProjectItemProps) {
    const animatedItems = useRef(new WeakSet<HTMLElement>());
    const attachItemAnimation = useCallback((node: HTMLDivElement | null) => {
        if (!node || animatedItems.current.has(node)) {
            return;
        }

        autoAnimate(node, { duration: 180, easing: "ease-out" });
        animatedItems.current.add(node);
    }, []);
    const [areAllRecentBranchesVisible, setAreAllRecentBranchesVisible] =
        useState(false);
    const [areStaleBranchesVisible, setAreStaleBranchesVisible] =
        useState(false);
    const branchesQuery = useProjectBranchesQuery(
        project.id,
        isExpanded || isBusy || isSelected,
    );
    const isAwaitingSshPassphrase = isHandledSshPromptError(
        branchesQuery.error,
    );
    const branchError = branchesQuery.error
        ? getErrorMessage(branchesQuery.error)
        : undefined;
    const sortedBranches = useMemo(
        () => sortBranchesByLastCommit(branchesQuery.data ?? []),
        [branchesQuery.data],
    );
    const { hiddenRecentBranchCount, staleBranches, visibleBranches } = useMemo(
        () =>
            getVisibleSidebarBranches({
                areAllRecentBranchesVisible,
                areStaleBranchesVisible,
                branches: sortedBranches,
                busyOwnerKeys,
                initialVisibleBranchCount: INITIAL_VISIBLE_BRANCH_COUNT,
                projectId: project.id,
            }),
        [
            areAllRecentBranchesVisible,
            areStaleBranchesVisible,
            busyOwnerKeys,
            project.id,
            sortedBranches,
        ],
    );
    const displayedBranches = useMemo(
        () =>
            getDisplayedSidebarBranches({
                busyOwnerKeys,
                isExpanded,
                projectId: project.id,
                selectedBranchName,
                sortedBranches,
                visibleBranches,
            }),
        [
            busyOwnerKeys,
            isExpanded,
            project.id,
            selectedBranchName,
            sortedBranches,
            visibleBranches,
        ],
    );

    useEffect(() => {
        if (!isAwaitingSshPassphrase) {
            return;
        }

        useSshPassphraseStore
            .getState()
            .setRetryAction(`sidebar:${project.id}:branches`, () =>
                branchesQuery.refetch().then(() => undefined),
            );
        return () =>
            useSshPassphraseStore
                .getState()
                .setRetryAction(`sidebar:${project.id}:branches`, null);
    }, [branchesQuery, isAwaitingSshPassphrase, project.id]);

    const canShowMoreRecentBranches =
        isExpanded &&
        !areAllRecentBranchesVisible &&
        hiddenRecentBranchCount > 0;
    const canShowStaleBranches =
        isExpanded &&
        (areAllRecentBranchesVisible || hiddenRecentBranchCount === 0) &&
        !areStaleBranchesVisible &&
        staleBranches.length > 0;

    return (
        <div ref={attachItemAnimation} className="group/menu-item relative">
            <SidebarProjectHeader
                isBusy={isBusy}
                isExpanded={isExpanded}
                isSelected={isSelected}
                isUpdatingProject={isUpdatingProject}
                project={project}
                projectAvatarUri={projectAvatarUri}
                onOpenProject={onOpenProject}
                onToggleProject={onToggleProject}
                onUpdateProject={onUpdateProject}
            />

            {isExpanded || isBusy ? (
                <SidebarProjectBranches
                    branchCount={branchesQuery.data?.length ?? 0}
                    branchError={branchError}
                    branches={displayedBranches}
                    busyOwnerKeys={busyOwnerKeys}
                    canShowMoreRecentBranches={canShowMoreRecentBranches}
                    canShowStaleBranches={canShowStaleBranches}
                    hiddenRecentBranchCount={hiddenRecentBranchCount}
                    isAwaitingSshPassphrase={isAwaitingSshPassphrase}
                    isExpanded={isExpanded}
                    isPending={branchesQuery.isPending}
                    pendingWorktreeCheckoutKey={pendingWorktreeCheckoutKey}
                    pendingWorktreeRemovalKey={pendingWorktreeRemovalKey}
                    project={project}
                    selectedBranchName={selectedBranchName}
                    staleBranchCount={staleBranches.length}
                    onCheckoutBranch={onCheckoutBranch}
                    onRemoveWorktree={onRemoveWorktree}
                    onSelectBranch={onSelectBranch}
                    onShowMoreRecentBranches={() =>
                        setAreAllRecentBranchesVisible(true)
                    }
                    onShowStaleBranches={() => setAreStaleBranchesVisible(true)}
                />
            ) : null}
        </div>
    );
}
