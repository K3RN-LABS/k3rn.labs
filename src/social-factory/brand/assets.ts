/**
 * Manifest of allowed assets for stories.
 */

export const logos = {
    default: "/logo-icon/logo.svg",
    white: "/logo-icon/logo2.svg",
    black: "/logo-icon/logo.svg", // Fallback or specific black version if added
    icon: "/logo-icon/logo-icon.svg",
};

export const backgrounds = {
    default: "linear-gradient(to bottom right, #000000, #1a1a1a)",
    premium: "linear-gradient(to bottom right, #090909, #2d2d2d)",
};

export type LogoVariant = keyof typeof logos;
export type BackgroundVariant = keyof typeof backgrounds;
