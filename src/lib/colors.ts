// Pastel colors — kept for light mode / legacy reference
export const PASTEL_COLORS = [
    "#FF6B6B", // Coral
    "#4ECDC4", // Teal
    "#45B7D1", // Sky Blue
    "#96CEB4", // Sage
    "#FFEAA7", // Lemon
    "#DDA0DD", // Plum
    "#98D8C8", // Mint
    "#F7DC6F", // Gold
    "#74B9FF", // Light Blue
    "#FD79A8", // Pink
];

// Dark-mode event color tokens: low-saturation tinted bg + left accent border + readable text
export const DARK_EVENT_COLORS: Array<{ bg: string; border: string; text: string }> = [
    { bg: "rgba(255, 107, 107, 0.10)", border: "#ff6b6b", text: "#ff9999" }, // Coral
    { bg: "rgba(78,  205, 196, 0.10)", border: "#4ecdc4", text: "#7ee8e0" }, // Teal
    { bg: "rgba(69,  183, 209, 0.10)", border: "#45b7d1", text: "#82d0ea" }, // Sky
    { bg: "rgba(150, 206, 180, 0.10)", border: "#96ceb4", text: "#b8ddc8" }, // Sage
    { bg: "rgba(247, 220, 111, 0.10)", border: "#f7c948", text: "#f7dc6f" }, // Lemon
    { bg: "rgba(221, 160, 221, 0.10)", border: "#dda0dd", text: "#e8bce8" }, // Plum
    { bg: "rgba(152, 216, 200, 0.10)", border: "#98d8c8", text: "#b8e8dc" }, // Mint
    { bg: "rgba(247, 220, 111, 0.10)", border: "#f7dc6f", text: "#f7e48e" }, // Gold
    { bg: "rgba(116, 185, 255, 0.10)", border: "#74b9ff", text: "#99ccff" }, // Blue
    { bg: "rgba(253, 121, 168, 0.10)", border: "#fd79a8", text: "#fd99be" }, // Pink
];

// Generate consistent color index from course code
export function getColorIndex(courseCode: string): number {
    let hash = 0;
    for (let i = 0; i < courseCode.length; i++) {
        const char = courseCode.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) % PASTEL_COLORS.length;
}
