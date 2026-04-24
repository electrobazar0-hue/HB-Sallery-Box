import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { en, Translation } from './translations/en';
import { hi } from './translations/hi';

export type Language = 'en' | 'hi';

const translations: Record<Language, Translation> = {
  en,
  hi,
};

interface LanguageState {
  language: Language;
  t: Translation;
  setLanguage: (lang: Language) => void;
  getText: (path: string) => string;
}

// Helper to get nested value from object using dot notation
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let result: unknown = obj;
  
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return path; // Return path if not found
    }
  }
  
  return typeof result === 'string' ? result : path;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: 'en',
      t: en,
      setLanguage: (lang) => set({ 
        language: lang, 
        t: translations[lang] 
      }),
      getText: (path) => {
        const { t } = get();
        return getNestedValue(t as unknown as Record<string, unknown>, path);
      },
    }),
    {
      name: 'hb-sallery-language',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ language: state.language }), // Only persist language
      onRehydrateStorage: () => (state) => {
        // Restore t based on persisted language
        if (state && state.language) {
          state.t = translations[state.language];
        }
      },
    }
  )
);

// Export translations for direct use
export { translations };
