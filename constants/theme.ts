export const lightTheme = {
  primary: '#1976D2',
  primaryLight: '#42A5F5',
  primaryDark: '#1565C0',
  secondary: '#7C4DFF',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceVariant: '#F8F9FA',
  error: '#D32F2F',
  errorLight: '#EF5350',
  success: '#43A047',
  warning: '#FF9800',
  text: '#212121',
  textSecondary: '#616161',
  textDisabled: '#9E9E9E',
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowDark: 'rgba(0, 0, 0, 0.2)',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const darkTheme = {
  primary: '#42A5F5',
  primaryLight: '#64B5F6',
  primaryDark: '#1976D2',
  secondary: '#9575CD',
  background: '#121212',
  surface: '#1E1E1E',
  surfaceVariant: '#2C2C2C',
  error: '#EF5350',
  errorLight: '#E57373',
  success: '#66BB6A',
  warning: '#FFA726',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textDisabled: '#757575',
  border: '#333333',
  borderLight: '#2A2A2A',
  shadow: 'rgba(0, 0, 0, 0.3)',
  shadowDark: 'rgba(0, 0, 0, 0.5)',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

export type Theme = typeof lightTheme;

// ---- Expo Router template compatibility ----
// These exports are used by template files in `app/(tabs)` and some UI helpers.
export const Colors = {
  light: {
    text: lightTheme.text,
    background: lightTheme.background,
    tint: lightTheme.primary,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: lightTheme.primary,
  },
  dark: {
    text: darkTheme.text,
    background: darkTheme.background,
    tint: darkTheme.primaryDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: darkTheme.primaryDark,
  },
} as const;

export const Fonts = {
  rounded: 'System',
  mono: 'Courier',
} as const;
