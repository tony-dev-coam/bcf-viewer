import { theme, type ThemeConfig } from 'antd';

// Shared tokens: brand teal for view tools / primary, orange for interaction tools (mirrors reference toolbar).
export const tokens = { primary: '#16637d', accent: '#f39a5f', radius: 12 };

export const antdTheme = (dark: boolean): ThemeConfig => ({
  algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
  token: { colorPrimary: tokens.primary, borderRadius: 8, fontFamily: 'Inter, system-ui, sans-serif' },
});
