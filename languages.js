/* Langues prises en charge par les API gratuites (MyMemory / LibreTranslate).
   Codes ISO 639-1. "auto" = détection automatique (source uniquement). */
const NEXUS_LANGUAGES = [
  { code: "auto", name: "Détection auto" },
  { code: "fr", name: "Français" },
  { code: "en", name: "Anglais" },
  { code: "es", name: "Espagnol" },
  { code: "de", name: "Allemand" },
  { code: "it", name: "Italien" },
  { code: "pt", name: "Portugais" },
  { code: "nl", name: "Néerlandais" },
  { code: "ru", name: "Russe" },
  { code: "tr", name: "Turc" },
  { code: "ar", name: "Arabe" },
  { code: "zh", name: "Chinois" },
  { code: "ja", name: "Japonais" },
  { code: "ko", name: "Coréen" },
  { code: "hi", name: "Hindi" },
  { code: "pl", name: "Polonais" },
  { code: "uk", name: "Ukrainien" },
  { code: "sv", name: "Suédois" },
  { code: "da", name: "Danois" },
  { code: "fi", name: "Finnois" },
  { code: "nb", name: "Norvégien" },
  { code: "cs", name: "Tchèque" },
  { code: "el", name: "Grec" },
  { code: "he", name: "Hébreu" },
  { code: "hu", name: "Hongrois" },
  { code: "ro", name: "Roumain" },
  { code: "bg", name: "Bulgare" },
  { code: "id", name: "Indonésien" },
  { code: "vi", name: "Vietnamien" },
  { code: "th", name: "Thaï" },
  { code: "fa", name: "Persan" },
  { code: "ms", name: "Malais" },
  { code: "sk", name: "Slovaque" },
  { code: "sl", name: "Slovène" },
  { code: "lt", name: "Lituanien" },
  { code: "lv", name: "Letton" },
  { code: "et", name: "Estonien" },
  { code: "ca", name: "Catalan" },
  { code: "ga", name: "Irlandais" },
  { code: "eu", name: "Basque" },
  { code: "gl", name: "Galicien" }
];

/* Codes vers identifiants de synthèse vocale du navigateur (BCP-47). */
const NEXUS_TTS = {
  fr: "fr-FR", en: "en-US", es: "es-ES", de: "de-DE", it: "it-IT",
  pt: "pt-PT", nl: "nl-NL", ru: "ru-RU", tr: "tr-TR", ar: "ar-SA",
  zh: "zh-CN", ja: "ja-JP", ko: "ko-KR", hi: "hi-IN", pl: "pl-PL",
  uk: "uk-UA", sv: "sv-SE", da: "da-DK", fi: "fi-FI", nb: "nb-NO",
  cs: "cs-CZ", el: "el-GR", he: "he-IL", hu: "hu-HU", ro: "ro-RO",
  bg: "bg-BG", id: "id-ID", vi: "vi-VN", th: "th-TH", fa: "fa-IR",
  ms: "ms-MY", sk: "sk-SK", sl: "sl-SI", lt: "lt-LT", lv: "lv-LV",
  et: "et-EE", ca: "ca-ES", ga: "ga-IE", eu: "eu-ES", gl: "gl-ES"
};

/* Langues pour lesquelles un registre tu/vous a un sens. */
const NEXUS_REGISTER_LANGS = ["fr", "es", "de", "it", "pt", "ru", "tr", "nl", "pl", "uk", "cs", "ro"];
