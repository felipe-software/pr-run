const DEFAULT_WIDTH = 320;
const MIN_WIDTH = 256;
const MAX_WIDTH = 560;
const MIN_MAIN_CONTENT_WIDTH = 640;

function clamp(width: number) {
    return Math.min(Math.max(width, MIN_WIDTH), MAX_WIDTH);
}

function getEffectiveMaximumWidth(availableWidth: number) {
    return Math.max(
        MIN_WIDTH,
        Math.min(MAX_WIDTH, availableWidth - MIN_MAIN_CONTENT_WIDTH),
    );
}

function canAccept(width: number, availableWidth: number) {
    return (
        width <= getEffectiveMaximumWidth(availableWidth) &&
        availableWidth - width >= MIN_MAIN_CONTENT_WIDTH
    );
}

export const sidebarResize = {
    canAccept,
    clamp,
    defaultWidth: DEFAULT_WIDTH,
    getEffectiveMaximumWidth,
    maximumWidth: MAX_WIDTH,
    minimumMainContentWidth: MIN_MAIN_CONTENT_WIDTH,
    minimumWidth: MIN_WIDTH,
};
