/**
 * Translation utility for Urdu support
 * This is a placeholder structure that can be extended with:
 * - Google Translate API
 * - Custom translation dictionary
 * - Backend translation service
 */

// Mock translation dictionary (can be replaced with API call)
const TRANSLATION_DICT: Record<string, string> = {
  // Common phrases
  'Day': 'دن',
  'Places': 'مقامات',
  'Description': 'تفصیل',
  'Budget Breakdown': 'بجٹ کی تفصیل',
  'Recommended Hotels': 'تجویز کردہ ہوٹل',
  'Weather Considerations': 'موسم کے بارے میں',
  'Transport Details': 'نقل و حمل کی تفصیلات',
  'Total Cost': 'کل لاگت',
  'Travel Window': 'سفر کا وقت',
  'Getting There': 'وہاں پہنچنا',
  'Getting Around': 'گھومنا',
  'Book Now': 'اب بک کریں',
  'Download App': 'ایپ ڈاؤن لوڈ کریں',
  
  // Activity types
  'mountains': 'پہاڑ',
  'lakes': 'جھیلیں',
  'hiking': 'پیدل سفر',
  'camping': 'کیمپنگ',
  'photography': 'فوٹوگرافی',
  'culture': 'ثقافت',
  'history': 'تاریخ',
  'adventure': 'مہم جوئی',
  'nature': 'فطرت',
  'wildlife': 'جنگلی حیات',
  'food': 'کھانا',
  'shopping': 'خریداری',
};

/**
 * Translate text to Urdu
 * Currently uses a dictionary with mock translations for testing
 * Can be extended to call an API
 */
export async function translateToUrdu(text: string): Promise<string> {
  if (!text || text.trim() === '') {
    return text;
  }

  // Check dictionary first (exact match)
  if (TRANSLATION_DICT[text]) {
    return TRANSLATION_DICT[text];
  }

  // Check dictionary with trimmed/lowercase
  const normalized = text.trim();
  if (TRANSLATION_DICT[normalized]) {
    return TRANSLATION_DICT[normalized];
  }

  // Mock translation for common patterns (for testing)
  // This ensures the toggle works visually even without full API
  const mockTranslations: Record<string, string> = {
    // Common itinerary phrases
    'Morning:': 'صبح:',
    'Afternoon:': 'دوپہر:',
    'Evening:': 'شام:',
    'Explore': 'دریافت کریں',
    'Visit': 'ملاحظہ کریں',
    'Enjoy': 'لطف اٹھائیں',
    'Beautiful': 'خوبصورت',
    'Scenic': 'مناظر',
    'Mountain': 'پہاڑ',
    'Lake': 'جھیل',
    'Valley': 'وادی',
    'Hotel': 'ہوٹل',
    'Restaurant': 'ریسٹوران',
    'Breakfast': 'ناشتہ',
    'Lunch': 'دوپہر کا کھانا',
    'Dinner': 'رات کا کھانا',
  };

  // Check for partial matches in mock translations
  for (const [key, value] of Object.entries(mockTranslations)) {
    if (text.toLowerCase().includes(key.toLowerCase())) {
      // Simple replacement for testing
      return text.replace(new RegExp(key, 'gi'), value);
    }
  }

  // Mock translation for common itinerary phrases (for visual testing)
  const commonPhrases: Record<string, string> = {
    'Start your day': 'اپنا دن شروع کریں',
    'Visit': 'ملاحظہ کریں',
    'Explore': 'دریافت کریں',
    'Enjoy': 'لطف اٹھائیں',
    'Beautiful': 'خوبصورت',
    'Scenic': 'مناظر',
    'Morning': 'صبح',
    'Afternoon': 'دوپہر',
    'Evening': 'شام',
    'Day': 'دن',
    'Places to visit': 'ملاحظہ کرنے کے مقامات',
    'Recommended': 'تجویز کردہ',
    'Hotel': 'ہوٹل',
    'Restaurant': 'ریسٹوران',
  };

  // Check for common phrases in text
  for (const [key, value] of Object.entries(commonPhrases)) {
    if (text.toLowerCase().includes(key.toLowerCase())) {
      return text.replace(new RegExp(key, 'gi'), value);
    }
  }

  // For longer text, return a mock Urdu translation for testing
  // This ensures the toggle button works visually
  if (text.length > 20) {
    // Return a mock Urdu translation with visible change
    return `یہ ایک خوبصورت جگہ ہے۔ ${text}`; // Prefix with Urdu text to show it's working
  }

  // TODO: Implement API call to translation service
  // Example:
  // const response = await fetch('https://translation-api.com/translate', {
  //   method: 'POST',
  //   body: JSON.stringify({ text, target: 'ur' })
  // });
  // return response.json().translatedText;

  // For short text not in dictionary, return with Urdu prefix for testing
  return `[اردو] ${text}`;
}

/**
 * Translate an object's string values to Urdu
 */
export async function translateObjectToUrdu<T extends Record<string, any>>(
  obj: T,
  keysToTranslate: string[] = []
): Promise<T> {
  const translated = { ...obj };

  for (const key of keysToTranslate) {
    if (typeof translated[key] === 'string' && translated[key]) {
      translated[key] = await translateToUrdu(translated[key]);
    } else if (Array.isArray(translated[key])) {
      translated[key] = await Promise.all(
        translated[key].map(async (item: any) => {
          if (typeof item === 'string') {
            return await translateToUrdu(item);
          }
          return item;
        })
      );
    }
  }

  return translated;
}

/**
 * Check if translation is available (for UI toggle state)
 */
export function isTranslationAvailable(): boolean {
  // For now, always return true since we have dictionary
  // In production, check if API is available
  return true;
}

