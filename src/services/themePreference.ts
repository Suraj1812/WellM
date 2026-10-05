import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import type { ThemePreference } from '../components/theme';

export const THEME_STORAGE_KEY = 'wellm-appearance';
type NativePreferences = {
  getThemePreference?(): Promise<string>;
  setThemePreference?(preference: string): Promise<void>;
};
const nativePreferences =
  Platform.OS === 'web' ? null : requireOptionalNativeModule<NativePreferences>('WellMSnore');

export function parseThemePreference(value: unknown): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export async function readThemePreference(): Promise<ThemePreference> {
  if (Platform.OS === 'web') {
    return typeof window === 'undefined'
      ? 'system'
      : parseThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
  }
  return parseThemePreference(await nativePreferences?.getThemePreference?.());
}

export async function writeThemePreference(preference: ThemePreference): Promise<void> {
  if (Platform.OS === 'web') {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    return;
  }
  if (!nativePreferences?.setThemePreference) {
    throw new Error('Install the updated WellM build to save your appearance preference.');
  }
  await nativePreferences.setThemePreference(preference);
}
