export type SupportedLocale = 'en' | 'hi' | 'kn' | 'ta' | 'bn'

export interface LocaleMeta {
  code: SupportedLocale
  name: string
  nativeName: string
  flag: string
  direction: 'ltr' | 'rtl'
}

export const supportedLocales: LocaleMeta[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇮🇳', direction: 'ltr' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', direction: 'ltr' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳', direction: 'ltr' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', direction: 'ltr' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳', direction: 'ltr' },
]

export const defaultLocale: SupportedLocale = 'en'

/**
 * Returns localized string or falls back to default English dictionary.
 */
export function getTranslation(key: string, locale: SupportedLocale = 'en', fallback = key): string {
  // Production translation dictionary placeholder structure for multi-language support
  const dictionary: Record<string, Record<SupportedLocale, string>> = {
    'common.shop': { en: 'Shop', hi: 'खरीदें', kn: 'ಖರೀದಿಸಿ', ta: 'வாங்கு', bn: 'কিনুন' },
    'common.producers': { en: 'Producers', hi: 'उत्पादक', kn: 'ಉತ್ಪಾದಕರು', ta: 'தயாரிப்பாளர்கள்', bn: 'উৎপাদক' },
    'common.wisdom': { en: 'Kitchen Wisdom', hi: 'रसोई ज्ञान', kn: 'ಅಡುಗೆ ಜ್ಞಾನ', ta: 'சமையல் அறிவு', bn: 'রান্নাঘরের জ্ঞান' },
    'common.search': { en: 'Search ingredients...', hi: 'सामग्री खोजें...', kn: 'ಸಾಮಗ್ರಿಗಳನ್ನು ಹುಡುಕಿ...', ta: 'தேடு...', bn: 'খুঁজুন...' },
  }

  return dictionary[key]?.[locale] || dictionary[key]?.['en'] || fallback
}
