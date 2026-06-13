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

  /* Post-traitement : ajuste tu/vous sur les langues à pronom d'adresse double.
     Limité et honnête — corrige les cas fréquents, pas une garantie complète. */
  function postRegister(out, tgtLang) {
    if (register === "neutral") return out;
    const map = {
      fr: { formal: [[/\btu\b/g, "vous"], [/\bton\b/g, "votre"], [/\bta\b/g, "votre"], [/\btes\b/g, "vos"], [/\bte\b/g, "vous"], [/\btoi\b/g, "vous"]],
            informal: [[/\bvous\b/g, "tu"], [/\bvotre\b/g, "ton"], [/\bvos\b/g, "tes"]] },
      es: { formal: [[/\btú\b/g, "usted"], [/\btu\b/g, "su"], [/\bte\b/g, "le"]],
            informal: [[/\busted\b/g, "tú"]] },
      de: { formal: [[/\bdu\b/g, "Sie"], [/\bdein\b/g, "Ihr"], [/\bdich\b/g, "Sie"]],
            informal: [[/\bSie\b/g, "du"], [/\bIhr\b/g, "dein"]] },
      it: { formal: [[/\btu\b/g, "Lei"]], informal: [[/\bLei\b/g, "tu"]] },
      pt: { formal: [[/\btu\b/g, "você"]], informal: [[/\bvocê\b/g, "tu"]] },
      tr: { formal: [[/\bsen\b/g, "siz"], [/\bsenin\b/g, "sizin"]], informal: [[/\bsiz\b/g, "sen"]] }
    };
    const rules = map[tgtLang] && map[tgtLang][register];
    if (!rules) return out;
    let r = out;
    rules.forEach(([re, rep]) => { r = r.replace(re, rep); });
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
    const endpoints = ["https://libretranslate.com/translate", "https://translate.terraprint.co/translate"];
    let lastErr;
    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: text, source: from === "auto" ? "auto" : from, target: to, format: "text" })
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
    const from = srcSel.value, to = tgtSel.value;

    if (!text) { resultEl.textContent = ""; resultMeta.textContent = ""; hideExtras(); return; }
    if (from === to && from !== "auto") {
      resultEl.textContent = text;
      resultMeta.textContent = "Langues identiques";
      hideExtras();
      return;
    }

    // 1) Hors-ligne ou réseau absent : on tente le cache local
    if (!navigator.onLine) {
      const cached = getFromCache(text, from, to);
      if (cached) { applyResult(cached, text, from, to, true); return; }
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
        if (cached) { applyResult(cached, text, from, to, true); return; }
        resultEl.className = "result";
        resultEl.innerHTML = `<span class="err">Impossible de traduire pour le moment. Vérifiez votre connexion puis réessayez.</span>`;
        resultMeta.textContent = ""; hideExtras();
        statusText.textContent = "Erreur réseau";
        return;
      }
    }

    const outText = postRegister(r.text, to);
    const payload = { text: outText, detected: r.detected, alternatives: r.alternatives || [], engine: r.engine };
    saveToCache(text, from, to, payload);
    applyResult(payload, text, from, to, false);
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
      ? "Prêt — traduction gratuite et illimitée"
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
    $("fav").classList.toggle("active-fav", !!exists);
    $("fav").textContent = exists ? "★" : "☆";
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
        <button class="card-del" title="Supprimer">×</button>
        <div class="card-langs">${nameOf(it.srcLang)} → ${nameOf(it.tgtLang)}</div>
        <div class="card-src">${escapeHtml(it.src)}</div>
        <div class="card-tgt">${escapeHtml(it.tgt)}</div>`;
      card.addEventListener("click", (e) => {
        if (e.target.classList.contains("card-del")) {
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
  function speak(text, langCode) {
    if (!text || !("speechSynthesis" in window)) { toast("Synthèse vocale indisponible"); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = NEXUS_TTS[langCode] || "en-US";
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
      if (srcSel.value === "auto") {
        // on bascule la détection vers la langue cible actuelle
        srcSel.value = tgtSel.value;
      }
      const a = srcSel.value;
      srcSel.value = tgtSel.value;
      tgtSel.value = a === "auto" ? tgtSel.value : a;
      const tmp = srcTa.value;
      srcTa.value = resultEl.textContent;
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
    // Hiragana (japonais, principal)
    "あ":"a","い":"i","う":"u","え":"e","お":"o","か":"ka","き":"ki","く":"ku","け":"ke","こ":"ko",
    "さ":"sa","し":"shi","す":"su","せ":"se","そ":"so","た":"ta","ち":"chi","つ":"tsu","て":"te","と":"to",
    "な":"na","に":"ni","ぬ":"nu","ね":"ne","の":"no","は":"ha","ひ":"hi","ふ":"fu","へ":"he","ほ":"ho",
    "ま":"ma","み":"mi","む":"mu","め":"me","も":"mo","や":"ya","ゆ":"yu","よ":"yo",
    "ら":"ra","り":"ri","る":"ru","れ":"re","ろ":"ro","わ":"wa","を":"wo","ん":"n"
  };
  function transliterate(text, lang) {
    // n'agit que sur les langues à script non latin
    if (!["ru","uk","el","ar","ja","fa","bg"].includes(lang)) return null;
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
    else statusText.textContent = "Prêt — traduction gratuite et illimitée";
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
