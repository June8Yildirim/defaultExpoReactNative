import 'i18next';

import type en from './locales/en';

// Type-checks `t('...')` keys against the English strings, with autocomplete.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof en };
    returnNull: false;
  }
}
