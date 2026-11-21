import { getLocales } from 'expo-localization';

import i18n, { getDeviceLanguage, restoreSavedLanguage, setLanguage } from '@/i18n';
import en from '@/i18n/locales/en';
import fr from '@/i18n/locales/fr';

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en', languageTag: 'en-US' }]),
}));
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: async (key: string) => store.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => void store.set(key, value),
    deleteItemAsync: async (key: string) => void store.delete(key),
  };
});

const mockedGetLocales = getLocales as jest.Mock;

/** Every dotted key path, e.g. `home.devMenu.web`. */
function keyPaths(value: object, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'string' ? [prefix + key] : keyPaths(child, `${prefix}${key}.`),
  );
}

it('has the same keys in French as in English', () => {
  expect(keyPaths(fr).sort()).toEqual(keyPaths(en).sort());
});

it('has no empty translations', () => {
  for (const key of keyPaths(fr)) {
    expect(i18n.getFixedT('fr')(key as never)).not.toBe('');
  }
});

describe('getDeviceLanguage', () => {
  it('picks the first supported device language', () => {
    mockedGetLocales.mockReturnValueOnce([
      { languageCode: 'de', languageTag: 'de-DE' },
      { languageCode: 'fr', languageTag: 'fr-CA' },
    ]);
    expect(getDeviceLanguage()).toBe('fr');
  });

  it('falls back to English', () => {
    mockedGetLocales.mockReturnValueOnce([{ languageCode: 'ja', languageTag: 'ja-JP' }]);
    expect(getDeviceLanguage()).toBe('en');
  });
});

it('translates, switches language and restores the saved choice', async () => {
  expect(i18n.t('tabs.home')).toBe('Home');

  await setLanguage('fr');
  expect(i18n.t('tabs.home')).toBe('Accueil');
  expect(i18n.t('language.current', { language: 'Français' })).toBe('Langue actuelle : Français');

  await i18n.changeLanguage('en');
  await restoreSavedLanguage();
  expect(i18n.language).toBe('fr');

  // Clearing the choice follows the device language again.
  await setLanguage(null);
  expect(i18n.language).toBe('en');
});
