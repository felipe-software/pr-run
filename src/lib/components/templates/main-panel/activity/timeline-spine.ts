export type TimelineSpineNode = {
    bottom: number;
    top: number;
    x: number;
    y: number;
};

const CORNER_RADIUS = 10;

export function buildTimelineSpinePath(nodes: TimelineSpineNode[]) {
    const firstNode = nodes[0];

    if (!firstNode || nodes.length < 2) {
        return "";
    }

    let path = `M${formatCoordinate(firstNode.x)} ${formatCoordinate(firstNode.y)}`;

    for (let index = 1; index < nodes.length; index += 1) {
        const previousNode = nodes[index - 1];
        const node = nodes[index];

        if (previousNode.x === node.x) {
            path += `V${formatCoordinate(node.y)}`;
            continue;
        }

        const gap = Math.max(0, node.top - previousNode.bottom);
        const transitionY = previousNode.bottom + gap / 2;
        const horizontalDirection = Math.sign(node.x - previousNode.x);
        const radius = Math.max(
            0,
            Math.min(
                CORNER_RADIUS,
                gap / 2,
                Math.abs(node.x - previousNode.x) / 4,
            ),
        );
        const firstCornerX = previousNode.x + horizontalDirection * radius;
        const secondCornerX = node.x - horizontalDirection * radius;

        if (radius === 0) {
            path += `V${formatCoordinate(transitionY)}H${formatCoordinate(node.x)}V${formatCoordinate(node.y)}`;
            continue;
        }

        path += [
            `V${formatCoordinate(transitionY - radius)}`,
            `Q${formatCoordinate(previousNode.x)} ${formatCoordinate(transitionY)} ${formatCoordinate(firstCornerX)} ${formatCoordinate(transitionY)}`,
            `H${formatCoordinate(secondCornerX)}`,
            `Q${formatCoordinate(node.x)} ${formatCoordinate(transitionY)} ${formatCoordinate(node.x)} ${formatCoordinate(transitionY + radius)}`,
            `V${formatCoordinate(node.y)}`,
        ].join("");
    }

    return path;
}

function formatCoordinate(value: number) {
    return Math.round(value * 100) / 100;
}
