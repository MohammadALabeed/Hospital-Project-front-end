# Project UI Guidelines

- For all user-facing interface text, use `react-i18next` with translations defined in `src/locales/ar.json` and `src/locales/en.json`. Do not add hardcoded UI strings or language-specific conditional text in components.
- Keep the interface usable in both RTL and LTR. Set the direction from the active i18next language (`rtl` for Arabic and `ltr` for English), and use `dir="auto"` for dynamic text whose language may differ from the interface language.
