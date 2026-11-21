import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/themed-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { isSupportedLanguage, setLanguage, supportedLanguages } from '@/i18n';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const current = isSupportedLanguage(i18n.language) ? i18n.language : 'en';

  return (
    <View style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary">
        {t('language.current', { language: t(`language.names.${current}`) })}
      </ThemedText>
      <View style={styles.row}>
        {supportedLanguages.map((language) => (
          <ThemedButton
            key={language}
            size="small"
            rounded
            type={language === current ? 'primary' : 'border'}
            accessibilityState={{ selected: language === current }}
            onPress={() => setLanguage(language)}
          >
            {t(`language.names.${language}`)}
          </ThemedButton>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
