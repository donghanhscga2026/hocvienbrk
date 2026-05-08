import { Dictionary, Locale } from './types';
import { vi } from './vi';
import { en } from './en';

const dictionaries: Record<Locale, Dictionary> = {
  vi,
  en,
  zh: vi,
  ja: vi,
  ko: vi,
  th: vi,
  lo: vi,
  km: vi,
  my: vi,
  id: vi,
  ms: vi,
  tl: vi,
};

export const getDictionary = (locale: Locale): Dictionary => {
  return dictionaries[locale] || dictionaries.vi;
};

export const dictionaryLinks = (locale: Locale) => {
  const supportedLocales: Locale[] = ['vi', 'en'];
  
  return supportedLocales.map((loc) => ({
    locale: loc,
    href: `/${loc}`,
  }));
};

export { vi, en };
export type { Dictionary, Locale };
