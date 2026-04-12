/**
 * LanguageContext.jsx
 *
 * Provides { language, setLanguage, t } to the voter portal.
 * Persists language preference in localStorage under "voter_lang".
 * Defaults to "en". Supported values: "en" | "ne".
 */

import React, { createContext, useContext, useState, useCallback } from "react";
import translations from "./translations";

const STORAGE_KEY = "voter_lang";
const DEFAULT_LANG = "en";

function getInitialLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "ne") return stored;
  } catch {
    // localStorage unavailable
  }
  return DEFAULT_LANG;
}

const LanguageContext = createContext({
  language: DEFAULT_LANG,
  setLanguage: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  const setLanguage = useCallback((lang) => {
    const value = lang === "ne" ? "ne" : "en";
    setLanguageState(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (key) => {
      const dict = translations[language] || translations.en;
      return dict[key] ?? translations.en[key] ?? key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
