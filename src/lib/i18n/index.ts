import { en } from './en';
import { te } from './te';
import { hi } from './hi';

export type SupportedLanguage = 'en' | 'te' | 'hi';

export const translations = {
  en,
  te,
  hi,
};

export function getTranslation(lang: SupportedLanguage = 'en') {
  return translations[lang] || translations.en;
}
