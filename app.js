/* ============================================================
   NEXUS TRANSLATOR — logique applicative
   100% gratuit, sans clé API.
   - Traduction principale : MyMemory (gratuit, détection auto)
   - Repli : LibreTranslate (instances publiques)
   - Persistance : localStorage (historique + favoris)
   ============================================================ */

(() => {
  "use strict";

  /* ---- état & raccourcis DOM ---- */
  const $ = (id) => document.getElementById(id);
  const srcSel = $("src-lang"), tgtSel = $("tgt-lang");
  const srcTa = $("source"), resultEl = $("result");
  const srcName = $("src-name"), tgtName = $("tgt-name");
  const charCount = $("char-count"), resultMeta = $("result-meta");
  const statusText = $("status-text"), registerBar = $("register-bar");
  const phoneticEl = $("phonetic"), altWrap = $("alternatives"), altChips = $("alt-chips");
  const netBadge = $("net-badge");

  let register = "neutral";
  let debounceTimer = null;
  let lastTranslation = null; // { src, tgt, srcLang, tgtLang }

  const STORE = { hist: "nexus_tr_history", fav: "nexus_tr_favorites", cache: "nexus_tr_cache" };

  // Message de statut « prêt » (le nombre de langues est dérivé du référentiel).
  const READY_MSG = `Prêt — traduction gratuite et illimitée · ${NEXUS_LANGUAGES.length - 1} langues`;

  /* ---- cache hors-ligne : mémorise les traductions pour réutilisation sans réseau ---- */
  function cacheKey(text, from, to) { return `${from}::${to}::${text}`; }
  function loadCache() { try { return JSON.parse(localStorage.getItem(STORE.cache)) || {}; } catch { return {}; } }
  function saveToCache(text, from, to, payload) {
    const c = loadCache();
    c[cacheKey(text, from, to)] = payload;
    const keys = Object.keys(c);
    if (keys.length > 300) delete c[keys[0]]; // borne la taille
    try { localStorage.setItem(STORE.cache, JSON.stringify(c)); } catch {}
  }
  function getFromCache(text, from, to) { return loadCache()[cacheKey(text, from, to)] || null; }

  /* ---- init des sélecteurs de langue ---- */
  function fillSelects() {
    NEXUS_LANGUAGES.forEach((l) => {
      const o1 = new Option(l.name, l.code);
      srcSel.add(o1);
      if (l.code !== "auto") tgtSel.add(new Option(l.name, l.code));
    });
    srcSel.value = "auto";
    tgtSel.value = "fr";
  }

  function nameOf(code) {
    const l = NEXUS_LANGUAGES.find((x) => x.code === code);
    return l ? l.name : code;
  }

  /* ---- détection automatique de langue (côté client) ----
     Combine reconnaissance d'écriture (fiable) et heuristique de mots-outils
     pour l'alphabet latin. Fonctionne hors-ligne et garantit une source
     concrète aux API (qui ne détectent pas depuis une source vide). */
  const LATIN_STOPWORDS = {
    en: ["the","and","is","are","you","to","of","in","that","it","for","this","with","not","have","what","hello","hi","thanks","yes","no"],
    fr: ["le","la","les","et","est","vous","je","un","une","des","que","pour","dans","ne","pas","ce","sur","avec","bonjour","merci","oui","salut"],
    es: ["el","la","los","las","es","que","de","en","un","una","por","para","con","no","se","su","como","hola","gracias","sí","pero"],
    de: ["der","die","das","und","ist","ich","nicht","ein","eine","mit","sie","den","von","auf","für","wie","geht","ihnen","guten","tag","auch","aber","oder","wir","sind","was","sehr","haben","hallo","danke","ja","nein"],
    it: ["il","la","le","che","di","un","una","per","con","non","sono","del","della","gli","questo","come","ciao","grazie","sono"],
    pt: ["os","as","que","de","um","uma","para","com","não","se","da","do","mais","como","olá","obrigado","sim","você"],
    nl: ["de","het","een","en","is","ik","niet","van","dat","te","op","met","voor","zijn","hallo","dank","ja","nee"],
    pl: ["nie","to","jest","się","że","na","do","co","jak","tak","jego","czy","dziękuję","cześć"],
    ro: ["și","este","nu","de","la","un","în","că","cu","pentru","mai","sunt","mulțumesc","bună"],
    tr: ["ve","bir","bu","için","ile","değil","çok","ben","sen","ama","daha","merhaba","teşekkür","evet","hayır"],
    sv: ["och","är","att","det","en","som","inte","jag","för","med","på","hej","tack","ja"],
    id: ["dan","yang","di","itu","ini","dengan","untuk","tidak","saya","adalah","terima","halo"],
    vi: ["và","là","của","có","không","được","người","những","cho","một","xin","cảm","chào"]
  };
  const LATIN_DIACRITICS = {
    es: /[ñ¿¡]/, fr: /[àâçéèêëîïôûùœ]/, pt: /[ãõáâàçê]/, de: /[äöüß]/,
    it: /[àèéìòù]/, ro: /[ăâîșțş]/, pl: /[ąćęłńóśźż]/, tr: /[ışğçöü]/,
    sv: /[åäö]/, vi: /[ăâđêôơưạảấầ]/
  };

  function detectLanguage(text) {
    const t = (text || "").trim();
    if (!t) return null;
    const has = (re) => re.test(t);

    // 1) Reconnaissance d'écriture (priorité — très fiable)
    if (has(/[぀-ヿ]/)) return "ja";                        // kana japonais
    if (has(/[가-힣ᄀ-ᇿ]/)) return "ko";          // hangul
    if (has(/[฀-๿]/)) return "th";                       // thaï
    if (has(/[֐-׿]/)) return "he";                       // hébreu
    if (has(/[Ͱ-Ͽἀ-῿]/)) return "el";          // grec
    if (has(/[ऀ-ॿ]/)) return "hi";                       // devanagari
    if (has(/[ঀ-৿]/)) return "bn";                       // bengali
    if (has(/[஀-௿]/)) return "ta";                       // tamoul
    if (has(/[ఀ-౿]/)) return "te";                       // télougou
    if (has(/[԰-֏]/)) return "hy";                       // arménien
    if (has(/[Ⴀ-ჿ]/)) return "ka";                       // géorgien
    if (has(/[؀-ۿݐ-ݿࢠ-ࣿ]/)) {        // écriture arabe
      if (has(/[پچگژ]/)) return "fa";          // پ چ گ ژ → persan
      if (has(/[ٹڈںھہے]/)) return "ur"; // ourdou
      return "ar";
    }
    if (has(/[Ѐ-ӿ]/)) {                                  // cyrillique
      if (has(/[іїєґ]/)) return "uk";          // і ї є ґ
      if (has(/[ђћџљњ]/)) return "sr";    // ђ ћ џ љ њ
      if (has(/[ѓќ]/)) return "mk";                      // ѓ ќ
      if (has(/[ў]/)) return "be";                            // ў
      return "ru";
    }
    if (has(/[一-鿿]/)) return "zh-CN";                    // han (après le kana)

    // 2) Écriture latine : score par mots-outils + diacritiques
    const padded = " " + t.toLowerCase().replace(/[^\p{L}\s]/gu, " ").replace(/\s+/g, " ") + " ";
    let best = "en", bestScore = -1;
    for (const lang in LATIN_STOPWORDS) {
      let score = 0;
      for (const w of LATIN_STOPWORDS[lang]) if (padded.includes(" " + w + " ")) score += 2;
      if (LATIN_DIACRITICS[lang] && LATIN_DIACRITICS[lang].test(t)) score += 1.5;
      if (score > bestScore) { bestScore = score; best = lang; }
    }
    return best;
  }

  /* ---- registre tu/vous : actif seulement si pertinent ---- */
  function refreshRegister() {
    const t = tgtSel.value;
    const ok = NEXUS_REGISTER_LANGS.includes(t);
    registerBar.classList.toggle("disabled", !ok);
    if (!ok) setRegister("neutral");
  }
  function setRegister(r) {
    register = r;
    document.querySelectorAll(".reg-btn").forEach((b) =>
      b.classList.toggle("active", b.dataset.reg === r)
    );
  }

  /* Applique une consigne de registre via un préfixe d'indice de politesse.
     Les API publiques ne gèrent pas nativement le registre : on biaise donc
     la formulation source côté français/langues latines en marquant le pronom. */
  function applyRegisterHint(text, tgtLang) {
    if (register === "neutral") return text;
    // On n'altère pas le texte source : le registre est indiqué à l'utilisateur
    // et appliqué en post-traitement léger sur les pronoms d'adresse connus.
    return text;
  }

  /* Règles de registre par langue.
     Chaque règle : [forme_source, forme_cible, sensibleCasse?].
     - Par défaut : insensible à la casse, la casse du mot trouvé est préservée.
     - sensibleCasse = true : nécessaire quand la forme minuscule a un autre sens
       (ex. all. « Sie » = vous vs « sie » = elle/ils ; it. « Lei » = vous vs « lei » = elle). */
  const REGISTER_RULES = {
    /* ----- Langues romanes ----- */
    fr: { formal:   [["tu","vous"],["toi","vous"],["ton","votre"],["ta","votre"],["tes","vos"],["te","vous"]],
          informal: [["vous","tu"],["votre","ton"],["vos","tes"]] },
    es: { formal:   [["tú","usted"],["ti","usted"],["te","le"],["tuyo","suyo"],["tuya","suya"]],
          informal: [["usted","tú"]] },
    it: { formal:   [["tu","Lei"],["ti","La"],["tuo","Suo"],["tua","Sua"],["te","Lei"]],
          informal: [["Lei","tu",true]] },
    pt: { formal:   [["tu","você"],["te","lhe"],["teu","seu"],["tua","sua"],["ti","você"]],
          informal: [["você","tu"]] },
    ro: { formal:   [["tu","dumneavoastră"],["tău","dumneavoastră"],["ție","dumneavoastră"],["te","vă"]],
          informal: [["dumneavoastră","tu"]] },
    ca: { formal:   [["tu","vostè"],["teu","seu"],["teva","seva"]],
          informal: [["vostè","tu"]] },
    gl: { formal:   [["ti","vostede"],["tu","vostede"],["teu","seu"]],
          informal: [["vostede","ti"]] },
    /* ----- Langues germaniques ----- */
    de: { formal:   [["du","Sie"],["dich","Sie"],["dir","Ihnen"],["dein","Ihr"],["deine","Ihre"],["deinen","Ihren"]],
          informal: [["Sie","du",true],["Ihnen","dir",true],["Ihre","deine",true],["Ihren","deinen",true],["Ihr","dein",true]] },
    nl: { formal:   [["jij","u"],["je","u"],["jou","u"],["jouw","uw"]],
          informal: [["u","jij"],["uw","jouw"]] },
    /* ----- Grec ----- */
    el: { formal:   [["εσύ","εσείς"],["σου","σας"],["σε","σας"],["σένα","εσάς"]],
          informal: [["εσείς","εσύ"],["σας","σου"]] },
    /* ----- Turc ----- */
    tr: { formal:   [["sen","siz"],["senin","sizin"],["sana","size"],["seni","sizi"],["sende","sizde"]],
          informal: [["siz","sen"],["sizin","senin"],["size","sana"],["sizi","seni"]] },
    /* ----- Langues slaves (cyrillique) ----- */
    ru: { formal:   [["ты","вы"],["тебя","вас"],["тебе","вам"],["тобой","вами"],["твой","ваш"],["твоя","ваша"],["твоё","ваше"],["твои","ваши"]],
          informal: [["вы","ты"],["вас","тебя"],["вам","тебе"],["ваш","твой"],["ваша","твоя"]] },
    uk: { formal:   [["ти","ви"],["тебе","вас"],["тобі","вам"],["твій","ваш"]],
          informal: [["ви","ти"],["вас","тебе"]] },
    bg: { formal:   [["ти","вие"],["теб","вас"],["твой","ваш"],["твоя","ваша"]],
          informal: [["вие","ти"]] },
    mk: { formal:   [["ти","вие"],["тебе","вас"],["твој","ваш"]],
          informal: [["вие","ти"]] },
    be: { formal:   [["ты","вы"],["цябе","вас"],["твой","ваш"]],
          informal: [["вы","ты"]] },
    sr: { formal:   [["ти","ви"],["тебе","вас"],["ti","Vi"],["tebe","Vas"]],
          informal: [["ви","ти"],["Vi","ti",true],["Vas","tebe",true]] },
    /* ----- Langues slaves (latin) ----- */
    pl: { formal:   [["ty","Pan"],["ciebie","Pana"],["tobie","Panu"],["twój","Pański"]],
          informal: [["Pan","ty",true],["Pani","ty",true],["Pana","ciebie",true]] },
    cs: { formal:   [["ty","vy"],["tebe","vás"],["tobě","vám"],["tvůj","váš"],["tě","vás"]],
          informal: [["vy","ty"],["vás","tebe"],["vám","tobě"]] },
    sk: { formal:   [["ty","vy"],["teba","vás"],["tebe","vás"],["tvoj","váš"]],
          informal: [["vy","ty"],["vás","teba"]] },
    sl: { formal:   [["ti","vi"],["tebe","vas"],["tvoj","vaš"]],
          informal: [["vi","ti"],["vas","tebe"]] },
    hr: { formal:   [["ti","Vi"],["tebe","Vas"],["tvoj","Vaš"]],
          informal: [["Vi","ti",true],["Vas","tebe",true]] },
    bs: { formal:   [["ti","Vi"],["tebe","Vas"]],
          informal: [["Vi","ti",true],["Vas","tebe",true]] }
  };

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  /* Reproduit la casse de `sample` sur `repl` (Tu -> Vous, TU -> VOUS). */
  function matchCase(sample, repl) {
    if (sample === sample.toUpperCase() && sample !== sample.toLowerCase()) return repl.toUpperCase();
    if (sample[0] === sample[0].toUpperCase() && sample[0] !== sample[0].toLowerCase())
      return repl[0].toUpperCase() + repl.slice(1);
    return repl;
  }

  /* Remplace un mot entier en s'appuyant sur des frontières Unicode
     (indispensable pour le cyrillique/grec où \b ASCII échoue). */
  function replaceWord(text, from, to, caseSensitive) {
    const flags = caseSensitive ? "gu" : "giu";
    let re;
    try {
      re = new RegExp(`(?<![\\p{L}\\p{M}'-])(${escapeRe(from)})(?![\\p{L}\\p{M}'-])`, flags);
    } catch {
      // Repli si lookbehind/\p non supporté
      re = new RegExp(`\\b(${escapeRe(from)})\\b`, flags);
    }
    return text.replace(re, (m) => (caseSensitive ? to : matchCase(m, to)));
  }

  /* Post-traitement : ajuste tu/vous (ou équivalent) sur les langues à
     double pronom d'adresse. Approximatif et honnête — corrige les cas
     fréquents, ce n'est pas une garantie grammaticale complète. */
  function postRegister(out, tgtLang) {
    if (register === "neutral") return out;
    const rules = REGISTER_RULES[tgtLang] && REGISTER_RULES[tgtLang][register];
    if (!rules) return out;
    let r = out;
    rules.forEach(([from, to, cs]) => { r = replaceWord(r, from, to, cs); });
    return r;
  }

  /* ---- API 1 : MyMemory ---- */
  async function viaMyMemory(text, from, to) {
    const langpair = `${from === "auto" ? "" : from}|${to}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langpair)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("MyMemory indisponible");
    const data = await res.json();
    if (data.responseStatus !== 200 && !data.responseData?.translatedText)
      throw new Error(data.responseDetails || "Réponse invalide");
    const detected = data.responseData?.detectedLanguage || (from === "auto" ? null : from);
    // Variantes : MyMemory renvoie plusieurs correspondances réelles, on les dédoublonne
    let alternatives = [];
    if (Array.isArray(data.matches)) {
      const seen = new Set();
      const main = data.responseData.translatedText.trim().toLowerCase();
      seen.add(main);
      data.matches.forEach((m) => {
        const t = (m.translation || "").trim();
        const k = t.toLowerCase();
        if (t && !seen.has(k) && t.length < 120) { seen.add(k); alternatives.push(t); }
      });
      alternatives = alternatives.slice(0, 5);
    }
    return { text: data.responseData.translatedText, detected, alternatives, engine: "MyMemory" };
  }

  /* ---- API 2 : LibreTranslate (repli) ---- */
  async function viaLibre(text, from, to) {
    const endpoints = [
      "https://translate.fedilab.app/translate",
      "https://libretranslate.com/translate",
      "https://lt.vern.cc/translate",
      "https://trans.zillyhuhn.com/translate"
    ];
    // LibreTranslate n'utilise pas les variantes régionales (zh-CN -> zh).
    const libreCode = (c) => (c === "auto" ? "auto" : c.split("-")[0]);
    let lastErr;
    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: text, source: libreCode(from), target: libreCode(to), format: "text" })
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        if (!data.translatedText) throw new Error("Réponse vide");
        return { text: data.translatedText, detected: data.detectedLanguage?.language || null, alternatives: [], engine: "LibreTranslate" };
      } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error("LibreTranslate indisponible");
  }

  /* ---- moteur de traduction avec repli ---- */
  async function translate() {
    const text = srcTa.value.trim();
    const uiFrom = srcSel.value, to = tgtSel.value;

    if (!text) { resultEl.textContent = ""; resultMeta.textContent = ""; hideExtras(); return; }

    // Détection automatique côté client : MyMemory exige une source concrète,
    // un langpair à source vide ne déclenche pas de vraie détection.
    let from = uiFrom, detected = null;
    if (uiFrom === "auto") {
      detected = detectLanguage(text);
      if (detected) from = detected;
    }

    if (from === to && from !== "auto") {
      resultEl.className = "result";
      resultEl.textContent = text;
      resultMeta.textContent = uiFrom === "auto" ? `Langues identiques (détecté : ${nameOf(from)})` : "Langues identiques";
      if (uiFrom === "auto") srcName.textContent = `Détecté : ${nameOf(from)}`;
      hideExtras();
      return;
    }

    // 1) Hors-ligne ou réseau absent : on tente le cache local
    if (!navigator.onLine) {
      const cached = getFromCache(text, from, to);
      if (cached) { applyResult(cached, text, uiFrom, to, true); return; }
      resultEl.className = "result";
      resultEl.innerHTML = `<span class="err">Hors ligne, et cette phrase n'est pas en cache. Reconnectez-vous pour la traduire.</span>`;
      resultMeta.textContent = ""; hideExtras();
      return;
    }

    resultEl.className = "result loading";
    resultEl.textContent = "Traduction en cours…";
    statusText.textContent = "Traduction en cours…";

    let r;
    try {
      r = await viaMyMemory(text, from, to);
    } catch (e1) {
      try { r = await viaLibre(text, from, to); }
      catch (e2) {
        // dernier recours : cache
        const cached = getFromCache(text, from, to);
        if (cached) { applyResult(cached, text, uiFrom, to, true); return; }
        resultEl.className = "result";
        resultEl.innerHTML = `<span class="err">Impossible de traduire pour le moment. Vérifiez votre connexion puis réessayez.</span>`;
        resultMeta.textContent = ""; hideExtras();
        statusText.textContent = "Erreur réseau";
        return;
      }
    }

    const outText = postRegister(r.text, to);
    // La détection retenue : celle du moteur si fournie, sinon la nôtre.
    const finalDetected = r.detected || detected;
    const payload = { text: outText, detected: finalDetected, alternatives: r.alternatives || [], engine: r.engine };
    saveToCache(text, from, to, payload);
    applyResult(payload, text, uiFrom, to, false);
  }

  /* ---- applique un résultat (depuis réseau OU cache) ---- */
  function applyResult(payload, text, from, to, fromCache) {
    const outText = payload.text;
    resultEl.className = "result";
    resultEl.textContent = outText;

    const detName = payload.detected ? nameOf(payload.detected) : (from === "auto" ? "auto" : nameOf(from));
    srcName.textContent = from === "auto" ? `Détecté : ${detName}` : nameOf(from);
    resultMeta.textContent = `${payload.engine}${fromCache ? " (cache)" : ""} • ${outText.length} caractères`;
    statusText.textContent = navigator.onLine
      ? READY_MSG
      : "Mode hors ligne — résultats en cache";

    showAlternatives(payload.alternatives, to);
    showPhonetic(outText, to);

    lastTranslation = { src: text, tgt: outText, srcLang: payload.detected || from, tgtLang: to };
    saveHistory(lastTranslation);
    refreshFavBtn();
  }

  /* ---- variantes cliquables (clic = remplace le résultat) ---- */
  function showAlternatives(alts, to) {
    if (!alts || !alts.length) { altWrap.hidden = true; return; }
    altChips.innerHTML = "";
    alts.forEach((a) => {
      const chip = document.createElement("button");
      chip.className = "alt-chip";
      chip.textContent = a;
      chip.title = "Utiliser cette variante";
      chip.addEventListener("click", () => {
        resultEl.textContent = a;
        resultMeta.textContent = `Variante choisie • ${a.length} caractères`;
        showPhonetic(a, to);
        if (lastTranslation) lastTranslation.tgt = a;
      });
      altChips.appendChild(chip);
    });
    altWrap.hidden = false;
  }

  /* ---- phonétique : translittération latine pour scripts non latins ----
     Aide à la prononciation (point fort apprécié chez les concurrents).
     Honnête : couvre les scripts principaux, ce n'est pas une transcription IPA exacte. */
  function showPhonetic(text, lang) {
    const tr = transliterate(text, lang);
    if (tr && tr !== text) { phoneticEl.textContent = tr; phoneticEl.hidden = false; }
    else { phoneticEl.hidden = true; }
  }

  function hideExtras() { altWrap.hidden = true; phoneticEl.hidden = true; }

  /* ---- persistance ---- */
  function load(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } }
  function save(key, arr) { try { localStorage.setItem(key, JSON.stringify(arr)); } catch {} }

  function saveHistory(item) {
    const h = load(STORE.hist);
    if (h[0] && h[0].src === item.src && h[0].tgt === item.tgt) return;
    h.unshift({ ...item, id: Date.now() });
    save(STORE.hist, h.slice(0, 100));
  }

  function refreshFavBtn() {
    const favs = load(STORE.fav);
    const exists = lastTranslation && favs.some((f) => f.src === lastTranslation.src && f.tgt === lastTranslation.tgt);
    const btn = $("fav");
    btn.classList.toggle("active-fav", !!exists);
    const label = exists ? "Retirer des favoris" : "Ajouter aux favoris";
    btn.title = label;
    btn.setAttribute("aria-label", label);
  }

  /* ---- rendu des listes ---- */
  function renderList(key, mountId) {
    const mount = $(mountId);
    const items = load(key);
    if (!items.length) {
      mount.innerHTML = `<div class="empty">Rien ici pour l'instant.</div>`;
      return;
    }
    mount.innerHTML = "";
    items.forEach((it) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <button class="card-del" title="Supprimer" aria-label="Supprimer">
          <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
        <div class="card-langs">${nameOf(it.srcLang)} → ${nameOf(it.tgtLang)}</div>
        <div class="card-src">${escapeHtml(it.src)}</div>
        <div class="card-tgt">${escapeHtml(it.tgt)}</div>`;
      card.addEventListener("click", (e) => {
        if (e.target.closest(".card-del")) {
          const arr = load(key).filter((x) => x.id !== it.id);
          save(key, arr); renderList(key, mountId);
          return;
        }
        srcTa.value = it.src;
        srcSel.value = NEXUS_LANGUAGES.some((l) => l.code === it.srcLang) ? it.srcLang : "auto";
        tgtSel.value = it.tgtLang;
        updateMeta(); refreshRegister();
        switchView("translate"); translate();
      });
      mount.appendChild(card);
    });
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ---- synthèse vocale ---- */
  // Précharge la liste des voix (asynchrone sur certains navigateurs).
  let ttsVoices = [];
  function refreshVoices() {
    if ("speechSynthesis" in window) ttsVoices = speechSynthesis.getVoices() || [];
  }
  if ("speechSynthesis" in window) {
    refreshVoices();
    speechSynthesis.addEventListener?.("voiceschanged", refreshVoices);
  }

  function speak(text, langCode) {
    if (!("speechSynthesis" in window)) { toast("Synthèse vocale indisponible"); return; }
    text = (text || "").trim();
    if (!text) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const lang = NEXUS_TTS[langCode] || (langCode && langCode !== "auto" ? langCode : "en-US");
    u.lang = lang;
    // Cherche la meilleure voix disponible (exacte puis par langue de base).
    if (!ttsVoices.length) refreshVoices();
    const low = lang.toLowerCase(), base = low.split("-")[0];
    const voice =
      ttsVoices.find((v) => v.lang.toLowerCase() === low) ||
      ttsVoices.find((v) => v.lang.toLowerCase().startsWith(base + "-")) ||
      ttsVoices.find((v) => v.lang.toLowerCase() === base);
    if (voice) u.voice = voice;
    else if (!ttsVoices.some((v) => v.lang.toLowerCase().startsWith(base)))
      toast(`Voix « ${nameOf(langCode)} » non installée sur cet appareil`);
    speechSynthesis.speak(u);
  }

  /* ---- toast ---- */
  let toastTimer;
  function toast(msg) {
    let t = document.querySelector(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 1900);
  }

  /* ---- navigation ---- */
  function switchView(view) {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === view));
    document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + view));
    if (view === "history") renderList(STORE.hist, "history-list");
    if (view === "favorites") renderList(STORE.fav, "favorites-list");
  }

  function updateMeta() {
    charCount.textContent = `${srcTa.value.length} caractères`;
    tgtName.textContent = nameOf(tgtSel.value);
    if (srcSel.value !== "auto") srcName.textContent = nameOf(srcSel.value);
    else if (!srcTa.value) srcName.textContent = "Détection auto";
  }

  /* ============ ÉVÉNEMENTS ============ */
  function bind() {
    srcTa.addEventListener("input", () => {
      updateMeta();
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(translate, 550);
    });

    [srcSel, tgtSel].forEach((s) => s.addEventListener("change", () => {
      updateMeta(); refreshRegister(); translate();
    }));

    $("swap").addEventListener("click", () => {
      // Détermine la langue source effective (résout "auto" via la détection).
      let effSrc = srcSel.value;
      if (effSrc === "auto") {
        const det = lastTranslation && lastTranslation.srcLang;
        effSrc = det && NEXUS_LANGUAGES.some((l) => l.code === det) ? det : tgtSel.value;
      }
      const newSrc = tgtSel.value;
      const newTgt = effSrc;
      srcSel.value = newSrc;
      tgtSel.value = newTgt;
      // Le résultat précédent devient le texte source (si disponible).
      const prev = resultEl.textContent;
      if (prev && !resultEl.classList.contains("loading") && !resultEl.querySelector(".err")) {
        srcTa.value = prev;
      }
      updateMeta(); refreshRegister(); translate();
    });

    document.querySelectorAll(".reg-btn").forEach((b) =>
      b.addEventListener("click", () => { setRegister(b.dataset.reg); translate(); })
    );

    $("paste").addEventListener("click", async () => {
      try { srcTa.value += await navigator.clipboard.readText(); updateMeta(); translate(); }
      catch { toast("Autorisez l'accès au presse-papiers"); }
    });

    $("clear").addEventListener("click", () => {
      srcTa.value = ""; resultEl.textContent = ""; resultMeta.textContent = "";
      updateMeta(); srcTa.focus();
    });

    $("copy").addEventListener("click", async () => {
      const txt = resultEl.textContent;
      if (!txt) return;
      try { await navigator.clipboard.writeText(txt); flash("copy", "Copié"); }
      catch { toast("Copie impossible"); }
    });

    $("fav").addEventListener("click", () => {
      if (!lastTranslation) return;
      const favs = load(STORE.fav);
      const i = favs.findIndex((f) => f.src === lastTranslation.src && f.tgt === lastTranslation.tgt);
      if (i >= 0) { favs.splice(i, 1); toast("Retiré des favoris"); }
      else { favs.unshift({ ...lastTranslation, id: Date.now() }); toast("Ajouté aux favoris"); }
      save(STORE.fav, favs); refreshFavBtn();
    });

    $("speak-src").addEventListener("click", () =>
      speak(srcTa.value, srcSel.value === "auto" ? (lastTranslation?.srcLang || "en") : srcSel.value));
    $("speak-tgt").addEventListener("click", () => speak(resultEl.textContent, tgtSel.value));

    document.querySelectorAll(".tab").forEach((t) =>
      t.addEventListener("click", () => switchView(t.dataset.view)));

    $("clear-history").addEventListener("click", () => {
      if (confirm("Effacer tout l'historique ?")) { save(STORE.hist, []); renderList(STORE.hist, "history-list"); }
    });
    $("clear-favorites").addEventListener("click", () => {
      if (confirm("Effacer tous les favoris ?")) { save(STORE.fav, []); renderList(STORE.fav, "favorites-list"); }
    });
  }

  function flash(btnId, label) {
    const b = $(btnId); const old = b.textContent;
    b.textContent = label; b.classList.add("done");
    setTimeout(() => { b.textContent = old; b.classList.remove("done"); }, 1200);
  }

  /* ---- translittération phonétique (caractère par caractère) ---- */
  const TRANSLIT = {
    // Cyrillique (russe/ukrainien)
    "а":"a","б":"b","в":"v","г":"g","д":"d","е":"ie","ё":"io","ж":"j","з":"z","и":"i","й":"y",
    "к":"k","л":"l","м":"m","н":"n","о":"o","п":"p","р":"r","с":"s","т":"t","у":"ou","ф":"f",
    "х":"kh","ц":"ts","ч":"tch","ш":"ch","щ":"chtch","ъ":"","ы":"y","ь":"","э":"e","ю":"iou","я":"ia",
    "і":"i","ї":"yi","є":"ie","ґ":"g",
    // Grec
    "α":"a","β":"v","γ":"g","δ":"d","ε":"e","ζ":"z","η":"i","θ":"th","ι":"i","κ":"k","λ":"l",
    "μ":"m","ν":"n","ξ":"x","ο":"o","π":"p","ρ":"r","σ":"s","ς":"s","τ":"t","υ":"y","φ":"f",
    "χ":"kh","ψ":"ps","ω":"o",
    // Arabe (approximation)
    "ا":"a","ب":"b","ت":"t","ث":"th","ج":"j","ح":"h","خ":"kh","د":"d","ذ":"dh","ر":"r","ز":"z",
    "س":"s","ش":"ch","ص":"s","ض":"d","ط":"t","ظ":"z","ع":"3","غ":"gh","ف":"f","ق":"q","ك":"k",
    "ل":"l","م":"m","ن":"n","ه":"h","و":"w","ي":"y","ء":"'",
    // Hébreu (approximation latine)
    "א":"a","ב":"v","ג":"g","ד":"d","ה":"h","ו":"v","ז":"z","ח":"h","ט":"t","י":"y",
    "כ":"k","ך":"kh","ל":"l","מ":"m","ם":"m","נ":"n","ן":"n","ס":"s","ע":"'","פ":"p",
    "ף":"f","צ":"ts","ץ":"ts","ק":"k","ר":"r","ש":"sh","ת":"t",
    // Hiragana (japonais)
    "あ":"a","い":"i","う":"u","え":"e","お":"o","か":"ka","き":"ki","く":"ku","け":"ke","こ":"ko",
    "さ":"sa","し":"shi","す":"su","せ":"se","そ":"so","た":"ta","ち":"chi","つ":"tsu","て":"te","と":"to",
    "な":"na","に":"ni","ぬ":"nu","ね":"ne","の":"no","は":"ha","ひ":"hi","ふ":"fu","へ":"he","ほ":"ho",
    "ま":"ma","み":"mi","む":"mu","め":"me","も":"mo","や":"ya","ゆ":"yu","よ":"yo",
    "ら":"ra","り":"ri","る":"ru","れ":"re","ろ":"ro","わ":"wa","を":"wo","ん":"n",
    "が":"ga","ぎ":"gi","ぐ":"gu","げ":"ge","ご":"go","ざ":"za","じ":"ji","ず":"zu","ぜ":"ze","ぞ":"zo",
    "だ":"da","ぢ":"ji","づ":"zu","で":"de","ど":"do","ば":"ba","び":"bi","ぶ":"bu","べ":"be","ぼ":"bo",
    "ぱ":"pa","ぴ":"pi","ぷ":"pu","ぺ":"pe","ぽ":"po",
    // Katakana (japonais)
    "ア":"a","イ":"i","ウ":"u","エ":"e","オ":"o","カ":"ka","キ":"ki","ク":"ku","ケ":"ke","コ":"ko",
    "サ":"sa","シ":"shi","ス":"su","セ":"se","ソ":"so","タ":"ta","チ":"chi","ツ":"tsu","テ":"te","ト":"to",
    "ナ":"na","ニ":"ni","ヌ":"nu","ネ":"ne","ノ":"no","ハ":"ha","ヒ":"hi","フ":"fu","ヘ":"he","ホ":"ho",
    "マ":"ma","ミ":"mi","ム":"mu","メ":"me","モ":"mo","ヤ":"ya","ユ":"yu","ヨ":"yo",
    "ラ":"ra","リ":"ri","ル":"ru","レ":"re","ロ":"ro","ワ":"wa","ヲ":"wo","ン":"n","ー":"",
    "ガ":"ga","ギ":"gi","グ":"gu","ゲ":"ge","ゴ":"go","ザ":"za","ジ":"ji","ズ":"zu","ゼ":"ze","ゾ":"zo",
    "ダ":"da","デ":"de","ド":"do","バ":"ba","ビ":"bi","ブ":"bu","ベ":"be","ボ":"bo",
    "パ":"pa","ピ":"pi","プ":"pu","ペ":"pe","ポ":"po"
  };
  function transliterate(text, lang) {
    // n'agit que sur les langues à script non latin que l'on sait translittérer
    if (!["ru","uk","be","bg","mk","sr","el","ar","fa","ja","he"].includes(lang)) return null;
    let out = "", changed = false;
    for (const ch of text.toLowerCase()) {
      if (TRANSLIT[ch] !== undefined) { out += TRANSLIT[ch]; changed = true; }
      else out += ch;
    }
    return changed ? out : null;
  }

  /* ---- badge réseau (mode hors-ligne) ---- */
  function updateNet() {
    const on = navigator.onLine;
    netBadge.textContent = on ? "En ligne" : "Hors ligne";
    netBadge.className = "net-badge " + (on ? "online" : "offline");
    if (!on) statusText.textContent = "Mode hors ligne — résultats en cache";
    else statusText.textContent = READY_MSG;
  }
  window.addEventListener("online", updateNet);
  window.addEventListener("offline", updateNet);

  /* ---- démarrage ---- */
  fillSelects();
  refreshRegister();
  updateMeta();
  updateNet();
  bind();
})();
