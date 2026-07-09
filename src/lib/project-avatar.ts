import type { ProjectConfig } from "@/types/pr-run";

export type ProjectAvatarUris = ReadonlyMap<string, string>;

function hashString(str: string): number {
    let hash = 2166136261;

    for (let index = 0; index < str.length; index++) {
        hash ^= str.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
}

function hueDistance(first: number, second: number): number {
    const distance = Math.abs(first - second) % 360;

    return distance > 180 ? 360 - distance : distance;
}

function pickDistinctHue(
    seed: string,
    usedHues: number[],
    minDistance: number,
): number {
    let bestHue = 0;
    let bestScore = -1;

    for (let nonce = 0; nonce < 100; nonce++) {
        const hash = hashString(`${seed}:${nonce}`);
        const candidate = hash % 360;
        const score =
            usedHues.length === 0
                ? 360
                : Math.min(
                      ...usedHues.map((usedHue) =>
                          hueDistance(candidate, usedHue),
                      ),
                  );

        if (score > bestScore) {
            bestScore = score;
            bestHue = candidate;
        }

        if (score >= minDistance) {
            break;
        }
    }

    return bestHue;
}

function analogousHue(hash: number, baseHue: number): number {
    const direction = (hash & 1) === 0 ? 1 : -1;
    const offset = 20 + (hash % 20);

    return (baseHue + direction * offset + 360) % 360;
}

function svgAvatarMarkup(seed: string, hue: number): string {
    const hash = hashString(seed);
    const coreHue = analogousHue(hash, hue);
    const firstX = 30 + (hash % 30);
    const firstY = 25 + ((hash >> 4) % 25);
    const secondX = 100 - firstX - 10;
    const secondY = 100 - firstY - 10;

    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="b" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="16" />
      </filter>
      <clipPath id="c"><circle cx="50" cy="50" r="50" /></clipPath>
    </defs>
    <g clip-path="url(#c)">
      <rect width="100" height="100" fill="hsl(${hue}, 50%, 70%)" />
      <circle cx="${firstX}" cy="${firstY}" r="52" fill="hsl(${hue}, 68%, 58%)" filter="url(#b)" />
      <circle cx="${secondX}" cy="${secondY}" r="34" fill="hsl(${coreHue}, 75%, 46%)" filter="url(#b)" />
    </g>
  </svg>`;
}

export function assignFolderAvatars(
    names: string[],
    minDistance = 30,
): Map<string, string> {
    const usedHues: number[] = [];
    const uris = new Map<string, string>();

    for (const name of names) {
        const hue = pickDistinctHue(name, usedHues, minDistance);

        usedHues.push(hue);
        uris.set(
            name,
            `data:image/svg+xml;utf8,${encodeURIComponent(
                svgAvatarMarkup(name, hue),
            )}`,
        );
    }

    return uris;
}

export function assignProjectAvatars(
    projects: ProjectConfig[],
): ProjectAvatarUris {
    const sortedProjects = [...projects].sort((first, second) =>
        first.id.localeCompare(second.id),
    );
    const seeds = new Map(
        sortedProjects.map((project) => [
            project.id,
            `${project.name}:${project.path}`,
        ]),
    );
    const avatarsBySeed = assignFolderAvatars([...seeds.values()]);

    return new Map(
        sortedProjects.map((project) => [
            project.id,
            avatarsBySeed.get(seeds.get(project.id)!)!,
        ]),
    );
}
