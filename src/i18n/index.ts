import { getLocales } from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Platform } from 'react-native';

import en from './locales/en';
import fr from './locales/fr';

export const resources = {
  en: { translation: en },
  fr: { translation: fr },
} as const;

export type Language = keyof typeof resources;
export const supportedLanguages = Object.keys(resources) as Language[];
export const fallbackLanguage: Language = 'en';

export function isSupportedLanguage(value: unknown): value is Language {
  return typeof value === 'string' && value in resources;
}

/** First device language we have strings for, e.g. `fr-CA` → `fr`; otherwise English. */
export function getDeviceLanguage(): Language {
  for (const locale of getLocales()) {
    if (isSupportedLanguage(locale.languageCode)) return locale.languageCode;
  }
  return fallbackLanguage;
}

const STORAGE_KEY = 'app.language';
const isWeb = Platform.OS === 'web';

async function readSavedLanguage(): Promise<Language | null> {
  try {
    const value = isWeb
      ? (globalThis.localStorage?.getItem(STORAGE_KEY) ?? null)
      : await SecureStore.getItemAsync(STORAGE_KEY);
    return isSupportedLanguage(value) ? value : null;
  } catch {
    return null;
  }
}

async function writeSavedLanguage(language: Language | null): Promise<void> {
  try {
    if (isWeb) {
      if (language) globalThis.localStorage?.setItem(STORAGE_KEY, language);
      else globalThis.localStorage?.removeItem(STORAGE_KEY);
    } else if (language) {
      await SecureStore.setItemAsync(STORAGE_KEY, language);
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    }
  } catch {
    // Storage unavailable: the choice still applies for this session.
  }
}

// Initialise synchronously with the device language so the first render is already translated.
// `initAsync: false` + bundled resources means no flash of untranslated keys.
const i18n = createInstance();

i18n.use(initReactI18next).init({
  resources,
  lng: getDeviceLanguage(),
  fallbackLng: fallbackLanguage,
  supportedLngs: supportedLanguages,
  interpolation: { escapeValue: false }, // React already escapes output.
  returnNull: false,
  initAsync: false,
});

/** Apply a language the user picked in-app earlier (overrides the device language). */
export async function restoreSavedLanguage(): Promise<void> {
  const saved = await readSavedLanguage();
  if (saved && saved !== i18n.language) await i18n.changeLanguage(saved);
}

/** Switch language and remember the choice. Pass `null` to go back to following the device. */
export async function setLanguage(language: Language | null): Promise<void> {
  await writeSavedLanguage(language);
  await i18n.changeLanguage(language ?? getDeviceLanguage());
}

export default i18n;
