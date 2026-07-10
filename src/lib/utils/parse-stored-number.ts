export function parseStoredNumber(value: string | null) {
    if (value === null) {
        return null;
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}
