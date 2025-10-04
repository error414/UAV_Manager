export const calculateColorGreenToRed = (value, maxValue) => {
    maxValue = maxValue ?? 1000
    value = Math.max(0, Math.min(maxValue, value));

    let r, g, b = 0;

    if (value <= maxValue / 2) {
        r = Math.round(255 * (value / (maxValue / 2)));
        g = 255;
    } else {
        r = 255;
        g = Math.round(255 * (1 - (value - (maxValue / 2)) / (maxValue / 2)));
    }

    return `rgb(${r}, ${g}, ${b})`;
}