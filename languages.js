/* ============================================================
   NEXUS TRANSLATOR — Référentiel des langues
   ------------------------------------------------------------
   Liste complète des langues prises en charge par les API
   gratuites (MyMemory / LibreTranslate). Codes ISO 639-1
   (et quelques variantes régionales acceptées par MyMemory).
   "auto" = détection automatique (langue source uniquement).

   Chaque entrée :
     code  : code transmis à l'API de traduction
     name  : libellé affiché (français)
     tts   : identifiant BCP-47 pour la synthèse vocale (optionnel)
     reg   : true si la langue distingue un registre tu/vous
   ============================================================ */

const NEXUS_RAW_LANGUAGES = [
  { code: "auto", name: "Détection automatique" },

  { code: "af",    name: "Afrikaans",                tts: "af-ZA" },
  { code: "sq",    name: "Albanais",                 tts: "sq-AL" },
  { code: "am",    name: "Amharique",                tts: "am-ET" },
  { code: "ar",    name: "Arabe",                    tts: "ar-SA" },
  { code: "hy",    name: "Arménien",                 tts: "hy-AM" },
  { code: "az",    name: "Azéri",                    tts: "az-AZ" },
  { code: "eu",    name: "Basque",                   tts: "eu-ES" },
  { code: "be",    name: "Biélorusse",               tts: "be-BY", reg: true },
  { code: "bn",    name: "Bengali",                  tts: "bn-IN" },
  { code: "bs",    name: "Bosniaque",                tts: "bs-BA", reg: true },
  { code: "bg",    name: "Bulgare",                  tts: "bg-BG", reg: true },
  { code: "my",    name: "Birman",                   tts: "my-MM" },
  { code: "ca",    name: "Catalan",                  tts: "ca-ES", reg: true },
  { code: "ceb",   name: "Cebuano" },
  { code: "ny",    name: "Chichewa" },
  { code: "zh-CN", name: "Chinois (simplifié)",      tts: "zh-CN" },
  { code: "zh-TW", name: "Chinois (traditionnel)",   tts: "zh-TW" },
  { code: "co",    name: "Corse",                    tts: "co-FR" },
  { code: "hr",    name: "Croate",                   tts: "hr-HR", reg: true },
  { code: "cs",    name: "Tchèque",                  tts: "cs-CZ", reg: true },
  { code: "da",    name: "Danois",                   tts: "da-DK" },
  { code: "nl",    name: "Néerlandais",              tts: "nl-NL", reg: true },
  { code: "en",    name: "Anglais",                  tts: "en-US" },
  { code: "eo",    name: "Espéranto",                tts: "eo" },
  { code: "et",    name: "Estonien",                 tts: "et-EE" },
  { code: "tl",    name: "Filipino (Tagalog)",       tts: "fil-PH" },
  { code: "fi",    name: "Finnois",                  tts: "fi-FI" },
  { code: "fr",    name: "Français",                 tts: "fr-FR", reg: true },
  { code: "fy",    name: "Frison occidental",        tts: "fy-NL" },
  { code: "gl",    name: "Galicien",                 tts: "gl-ES", reg: true },
  { code: "ka",    name: "Géorgien",                 tts: "ka-GE" },
  { code: "de",    name: "Allemand",                 tts: "de-DE", reg: true },
  { code: "el",    name: "Grec",                     tts: "el-GR", reg: true },
  { code: "gu",    name: "Gujarati",                 tts: "gu-IN" },
  { code: "ht",    name: "Créole haïtien",           tts: "ht-HT" },
  { code: "ha",    name: "Haoussa",                  tts: "ha-NG" },
  { code: "haw",   name: "Hawaïen" },
  { code: "he",    name: "Hébreu",                   tts: "he-IL" },
  { code: "hi",    name: "Hindi",                    tts: "hi-IN" },
  { code: "hmn",   name: "Hmong" },
  { code: "hu",    name: "Hongrois",                 tts: "hu-HU" },
  { code: "is",    name: "Islandais",                tts: "is-IS" },
  { code: "ig",    name: "Igbo",                     tts: "ig-NG" },
  { code: "id",    name: "Indonésien",               tts: "id-ID" },
  { code: "ga",    name: "Irlandais",                tts: "ga-IE" },
  { code: "it",    name: "Italien",                  tts: "it-IT", reg: true },
  { code: "ja",    name: "Japonais",                 tts: "ja-JP" },
  { code: "jv",    name: "Javanais",                 tts: "jv-ID" },
  { code: "kn",    name: "Kannada",                  tts: "kn-IN" },
  { code: "kk",    name: "Kazakh",                   tts: "kk-KZ" },
  { code: "km",    name: "Khmer",                    tts: "km-KH" },
  { code: "rw",    name: "Kinyarwanda" },
  { code: "ko",    name: "Coréen",                   tts: "ko-KR" },
  { code: "ku",    name: "Kurde (kurmandji)",        tts: "ku" },
  { code: "ky",    name: "Kirghize",                 tts: "ky-KG" },
  { code: "lo",    name: "Lao",                      tts: "lo-LA" },
  { code: "la",    name: "Latin",                    tts: "la" },
  { code: "lv",    name: "Letton",                   tts: "lv-LV" },
  { code: "lt",    name: "Lituanien",                tts: "lt-LT" },
  { code: "lb",    name: "Luxembourgeois",           tts: "lb-LU" },
  { code: "mk",    name: "Macédonien",               tts: "mk-MK", reg: true },
  { code: "mg",    name: "Malgache",                 tts: "mg-MG" },
  { code: "ms",    name: "Malais",                   tts: "ms-MY" },
  { code: "ml",    name: "Malayalam",                tts: "ml-IN" },
  { code: "mt",    name: "Maltais",                  tts: "mt-MT" },
  { code: "mi",    name: "Maori",                    tts: "mi-NZ" },
  { code: "mr",    name: "Marathi",                  tts: "mr-IN" },
  { code: "mn",    name: "Mongol",                   tts: "mn-MN" },
  { code: "ne",    name: "Népalais",                 tts: "ne-NP" },
  { code: "nb",    name: "Norvégien (bokmål)",       tts: "nb-NO" },
  { code: "or",    name: "Odia (oriya)",             tts: "or-IN" },
  { code: "ps",    name: "Pachto",                   tts: "ps-AF" },
  { code: "fa",    name: "Persan (farsi)",           tts: "fa-IR" },
  { code: "pl",    name: "Polonais",                 tts: "pl-PL", reg: true },
  { code: "pt",    name: "Portugais",                tts: "pt-PT", reg: true },
  { code: "pa",    name: "Pendjabi",                 tts: "pa-IN" },
  { code: "ro",    name: "Roumain",                  tts: "ro-RO", reg: true },
  { code: "ru",    name: "Russe",                    tts: "ru-RU", reg: true },
  { code: "sm",    name: "Samoan" },
  { code: "gd",    name: "Gaélique écossais",        tts: "gd-GB" },
  { code: "sr",    name: "Serbe",                    tts: "sr-RS", reg: true },
  { code: "st",    name: "Sesotho" },
  { code: "sn",    name: "Shona" },
  { code: "sd",    name: "Sindhi" },
  { code: "si",    name: "Cingalais",                tts: "si-LK" },
  { code: "sk",    name: "Slovaque",                 tts: "sk-SK", reg: true },
  { code: "sl",    name: "Slovène",                  tts: "sl-SI", reg: true },
  { code: "so",    name: "Somali",                   tts: "so-SO" },
  { code: "es",    name: "Espagnol",                 tts: "es-ES", reg: true },
  { code: "su",    name: "Soundanais",               tts: "su-ID" },
  { code: "sw",    name: "Swahili",                  tts: "sw-KE" },
  { code: "sv",    name: "Suédois",                  tts: "sv-SE" },
  { code: "tg",    name: "Tadjik",                   tts: "tg-TJ" },
  { code: "ta",    name: "Tamoul",                   tts: "ta-IN" },
  { code: "tt",    name: "Tatar",                    tts: "tt-RU" },
  { code: "te",    name: "Télougou",                 tts: "te-IN" },
  { code: "th",    name: "Thaï",                     tts: "th-TH" },
  { code: "tr",    name: "Turc",                     tts: "tr-TR", reg: true },
  { code: "tk",    name: "Turkmène",                 tts: "tk-TM" },
  { code: "uk",    name: "Ukrainien",               tts: "uk-UA", reg: true },
  { code: "ur",    name: "Ourdou",                   tts: "ur-PK" },
  { code: "ug",    name: "Ouïghour",                 tts: "ug-CN" },
  { code: "uz",    name: "Ouzbek",                   tts: "uz-UZ" },
  { code: "vi",    name: "Vietnamien",               tts: "vi-VN" },
  { code: "cy",    name: "Gallois",                  tts: "cy-GB" },
  { code: "xh",    name: "Xhosa",                    tts: "xh-ZA" },
  { code: "yi",    name: "Yiddish",                  tts: "yi" },
  { code: "yo",    name: "Yoruba",                   tts: "yo-NG" },
  { code: "zu",    name: "Zoulou",                   tts: "zu-ZA" }
];

/* Tri : "auto" en tête, puis ordre alphabétique français (sensible aux accents). */
const NEXUS_LANGUAGES = (() => {
  const auto = NEXUS_RAW_LANGUAGES.filter((l) => l.code === "auto");
  const rest = NEXUS_RAW_LANGUAGES
    .filter((l) => l.code !== "auto")
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  return [...auto, ...rest];
})();

/* Codes ISO -> identifiants BCP-47 de synthèse vocale du navigateur.
   Construit automatiquement à partir du référentiel ci-dessus. */
const NEXUS_TTS = NEXUS_RAW_LANGUAGES.reduce((acc, l) => {
  if (l.tts) acc[l.code] = l.tts;
  return acc;
}, {});

/* Langues pour lesquelles un registre tu/vous (ou équivalent) a un sens.
   Le toggle de registre ne s'affiche que pour ces langues. */
const NEXUS_REGISTER_LANGS = NEXUS_RAW_LANGUAGES
  .filter((l) => l.reg)
  .map((l) => l.code);
