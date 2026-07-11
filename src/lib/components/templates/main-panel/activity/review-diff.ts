import { parsePatchFiles } from "@pierre/diffs";
import type { FileDiffMetadata } from "@pierre/diffs/react";

export function parseReviewDiff(
    path: string,
    diffHunk: string,
): FileDiffMetadata | undefined {
    if (!diffHunk.trim()) {
        return undefined;
    }

    const safePath = path.replace(/[\r\n\t]/g, " ");
    const patch = `--- ${safePath}\n+++ ${safePath}\n${diffHunk.trimEnd()}\n`;

    const fileDiff = parsePatchFiles(patch).flatMap((item) => item.files)[0];

    return fileDiff?.hunks.length ? fileDiff : undefined;
}
