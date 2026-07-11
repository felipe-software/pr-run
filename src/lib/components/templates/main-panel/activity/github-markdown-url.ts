import { defaultUrlTransform } from "react-markdown";

export function resolveGitHubMarkdownUrl(
    url: string,
    repositoryUrl: string | undefined,
    branchName: string,
) {
    const safeUrl = defaultUrlTransform(url);

    if (
        !safeUrl ||
        !repositoryUrl ||
        safeUrl.startsWith("#") ||
        safeUrl.startsWith("//") ||
        /^[a-z][a-z\d+.-]*:/i.test(safeUrl)
    ) {
        return safeUrl;
    }

    const repository = repositoryUrl.replace(/\/$/, "");

    if (safeUrl.startsWith("../blob/")) {
        return `${repository}/${safeUrl.replace(/^\.\.\//, "")}`;
    }

    const encodedBranch = branchName
        .split("/")
        .map(encodeURIComponent)
        .join("/");
    const relativePath = safeUrl.startsWith("/")
        ? safeUrl.slice(1)
        : safeUrl.replace(/^\.\//, "");

    return `${repository}/blob/${encodedBranch}/${relativePath}`;
}
