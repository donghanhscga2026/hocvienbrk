export interface LanguageOption {
  code: string;
  label: string;
  nativeLabel: string;
  flag: string;
  direction: 'ltr' | 'rtl';
}

export const languages: LanguageOption[] = [
  {
    code: 'vi',
    label: 'Vietnamese',
    nativeLabel: 'Tiếng Việt',
    flag: '🇻🇳',
    direction: 'ltr',
  },
  {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    flag: '🇺🇸',
    direction: 'ltr',
  },
  {
    code: 'zh',
    label: 'Chinese',
    nativeLabel: '中文',
    flag: '🇨🇳',
    direction: 'ltr',
  },
  {
    code: 'ja',
    label: 'Japanese',
    nativeLabel: '日本語',
    flag: '🇯🇵',
    direction: 'ltr',
  },
  {
    code: 'ko',
    label: 'Korean',
    nativeLabel: '한국어',
    flag: '🇰🇷',
    direction: 'ltr',
  },
  {
    code: 'th',
    label: 'Thai',
    nativeLabel: 'ภาษาไทย',
    flag: '🇹🇭',
    direction: 'ltr',
  },
  {
    code: 'lo',
    label: 'Lao',
    nativeLabel: 'ເມື່ອງ',
    flag: '🇱🇦',
    direction: 'ltr',
  },
  {
    code: 'km',
    label: 'Khmer',
    nativeLabel: 'ភាសាខ្មែរ',
    flag: '🇰🇭',
    direction: 'ltr',
  },
  {
    code: 'my',
    label: 'Burmese',
    nativeLabel: 'မြန်မာစာ',
    flag: '🇲🇲',
    direction: 'ltr',
  },
  {
    code: 'id',
    label: 'Indonesian',
    nativeLabel: 'Bahasa Indonesia',
    flag: '🇮🇩',
    direction: 'ltr',
  },
  {
    code: 'ms',
    label: 'Malay',
    nativeLabel: 'Bahasa Melayu',
    flag: '🇲🇾',
    direction: 'ltr',
  },
  {
    code: 'tl',
    label: 'Tagalog',
    nativeLabel: 'Filipino',
    flag: '🇵🇭',
    direction: 'ltr',
  },
];

export const getLanguageByCode = (code: string): LanguageOption | undefined => {
  return languages.find((lang) => lang.code === code);
};

export const defaultLanguage = languages[0];

export const supportedLanguageCodes = languages.map((lang) => lang.code);
