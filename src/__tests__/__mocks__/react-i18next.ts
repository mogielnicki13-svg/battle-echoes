export const useTranslation = () => ({
  t: (key: string) => key,
  i18n: { changeLanguage: async () => {}, language: 'pl' },
});
export const initReactI18next = { type: '3rdParty', init: () => {} };
