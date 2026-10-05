import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { createUi, darkColors, lightColors, type ThemeColors, type ThemePreference } from './theme';
import {
  parseThemePreference,
  readThemePreference,
  THEME_STORAGE_KEY,
  writeThemePreference,
} from '../services/themePreference';

const themes = {
  light: { colors: lightColors, ui: createUi(lightColors), isDark: false },
  dark: { colors: darkColors, ui: createUi(darkColors), isDark: true },
};
type ThemeValue = (typeof themes)['light' | 'dark'] & {
  preference: ThemePreference;
  toggleTheme(): Promise<void>;
};
const ThemeContext = createContext<ThemeValue>({
  ...themes.light,
  preference: 'system',
  toggleTheme: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');
  const revision = useRef(0);
  const writes = useRef<Promise<void>>(Promise.resolve());
  const mode = preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
  const theme = themes[mode];

  useEffect(() => {
    let mounted = true;
    const initialRevision = revision.current;
    void readThemePreference().then(
      (saved) => {
        if (mounted && revision.current === initialRevision) setPreference(saved);
      },
      () => {},
    );
    if (Platform.OS !== 'web')
      return () => {
        mounted = false;
      };
    const changed = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
      revision.current++;
      setPreference(parseThemePreference(event.key === null ? null : event.newValue));
    };
    window.addEventListener('storage', changed);
    return () => {
      mounted = false;
      window.removeEventListener('storage', changed);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      document.documentElement.style.colorScheme = mode;
    } else {
      Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
    }
    void SystemUI.setBackgroundColorAsync(theme.colors.background).catch(() => {});
  }, [mode, preference, theme.colors.background]);

  const toggleTheme = useCallback(async () => {
    const next = mode === 'dark' ? 'light' : 'dark';
    revision.current++;
    setPreference(next);
    // Keep rapid switches in order without coupling preferences to audio/history.
    const write = writes.current.catch(() => {}).then(() => writeThemePreference(next));
    writes.current = write;
    await write;
  }, [mode]);

  const value = useMemo(
    () => ({ ...theme, preference, toggleTheme }),
    [preference, theme, toggleTheme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}

export function ThemeSystemBars() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}
