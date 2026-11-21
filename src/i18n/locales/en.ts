/**
 * English strings: the source of truth. Every other locale must have the same keys
 * (enforced by the `Translations` type in fr.ts and by the i18n tests).
 */
const en = {
  common: {
    learnMore: 'Learn more',
    docs: 'Docs',
  },
  tabs: {
    home: 'Home',
    explore: 'Explore',
    brand: 'Expo Starter',
  },
  home: {
    title: 'Welcome to Expo',
    getStarted: 'get started',
    tryEditing: 'Try editing',
    devTools: 'Dev tools',
    freshStart: 'Fresh start',
    devMenu: {
      web: 'use browser devtools',
      devicePrefix: 'shake device or press',
      deviceSuffix: 'in terminal',
      press: 'press',
    },
  },
  explore: {
    title: 'Explore',
    subtitle: 'This starter app includes example\ncode to help you get started.',
    expoDocs: 'Expo documentation',
    sections: {
      language: 'Language',
      colors: 'Colors',
      cards: 'Card variants',
      text: 'Text variants',
      buttons: 'Button variants',
      routing: 'File-based routing',
      platforms: 'Android, iOS, and web support',
      images: 'Images',
      themes: 'Light and dark mode components',
      animations: 'Animations',
    },
  },
  language: {
    current: 'Current language: {{language}}',
    names: {
      en: 'English',
      fr: 'French',
    },
  },
};

export default en;

/** Same shape as English, with string values. */
type DeepStringify<T> = { [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]> };
export type Translations = DeepStringify<typeof en>;
