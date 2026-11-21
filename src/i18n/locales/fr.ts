import type { Translations } from './en';

const fr: Translations = {
  common: {
    learnMore: 'En savoir plus',
    docs: 'Docs',
  },
  tabs: {
    home: 'Accueil',
    explore: 'Explorer',
    brand: 'Expo Starter',
  },
  home: {
    title: 'Bienvenue sur Expo',
    getStarted: 'pour commencer',
    tryEditing: 'Modifiez',
    devTools: 'Outils de dév.',
    freshStart: 'Repartir de zéro',
    devMenu: {
      web: 'utilisez les outils de développement du navigateur',
      devicePrefix: "secouez l'appareil ou appuyez sur",
      deviceSuffix: 'dans le terminal',
      press: 'appuyez sur',
    },
  },
  explore: {
    title: 'Explorer',
    subtitle: 'Cette application de démarrage contient\ndes exemples de code pour vous aider.',
    expoDocs: 'Documentation Expo',
    sections: {
      language: 'Langue',
      colors: 'Couleurs',
      cards: 'Variantes de cartes',
      text: 'Variantes de texte',
      buttons: 'Variantes de boutons',
      routing: 'Routage basé sur les fichiers',
      platforms: 'Prise en charge Android, iOS et web',
      images: 'Images',
      themes: 'Composants mode clair et sombre',
      animations: 'Animations',
    },
  },
  language: {
    current: 'Langue actuelle : {{language}}',
    names: {
      en: 'Anglais',
      fr: 'Français',
    },
  },
};

export default fr;
