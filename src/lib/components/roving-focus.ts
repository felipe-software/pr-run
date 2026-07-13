export function getRovingFocusIndex(
    currentIndex: number,
    itemCount: number,
    key: string,
) {
    if (itemCount <= 0 || currentIndex < 0 || currentIndex >= itemCount) {
        return null;
    }

    if (key === "Home") {
        return 0;
    }

    if (key === "End") {
        return itemCount - 1;
    }

    if (key === "ArrowLeft") {
        return (currentIndex - 1 + itemCount) % itemCount;
    }

    if (key === "ArrowRight") {
        return (currentIndex + 1) % itemCount;
    }

    return null;
}
