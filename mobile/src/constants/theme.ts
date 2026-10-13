export const COLORS = {
    primary: "#0F1115",
    secondary: "#4B5563",
    background: "#FFFFFF",
    inputBackground: "#F8F9FA",
    textPrimary: "#0F1115",
    textSecondary: "#6B7280",
    placeholder: "#9CA3AF",
    white: "#FFFFFF",
    black: "#0F1115",
    lightGray: "#F3F4F6",
    gray: "#9CA3AF",
    error: "#0F1115",
    gradientStart: "#FFFFFF",
    gradientEnd: "#F3F4F6",
};

export const SIZES = {
    base: 8,
    small: 12,
    font: 14,
    medium: 16,
    large: 18,
    extraLarge: 24,
    padding: 10,
    radius: 10,
    h1: 30,
    h2: 22,
    h3: 20,
    h4: 18,
    body1: 30,
    body2: 20,
    body3: 16,
    body4: 14,
    width: 0, // Placeholder, usually dynamic
    height: 0, // Placeholder, usually dynamic
};

export const SHADOWS = {
    light: {
        shadowColor: COLORS.black,
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.22,
        shadowRadius: 2.22,
        elevation: 3,
    },
    medium: {
        shadowColor: COLORS.black,
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.29,
        shadowRadius: 4.65,
        elevation: 7,
    },
    dark: {
        shadowColor: COLORS.black,
        shadowOffset: {
            width: 0,
            height: 7,
        },
        shadowOpacity: 0.41,
        shadowRadius: 9.11,
        elevation: 14,
    },
};

const appTheme = { COLORS, SIZES, SHADOWS };

export default appTheme;
