/* ====================================================================
   TUL - DÁ — Traducción ES / EN
   El español vive en el DOM (idioma base). Aquí va el inglés, adaptado
   a la voz de marca: certeza, sensorial, sin hipérboles, frases cortas.
   ==================================================================== */
(function () {
  'use strict';

  var EN = {
    nav_paquetes: 'Packages',
    nav_experiencias: 'Experiences',
    nav_fechas: 'Dates',
    nav_guru: 'Guru Davar',
    nav_cta: 'Reserve your spot',

    hero_eyebrow: 'Mérida&nbsp;&nbsp;→&nbsp;&nbsp;Tulum',
    hero_h1: 'Curated for those who<br>live it <em>all.</em>',
    hero_sub: 'Curated Experiences. Good People. Unforgettable Memories.',
    hero_cta: 'Choose your experience',

    prop_eyebrow: 'Why Tul - Dá',
    prop_h2: 'You arrange nothing.<br>You just <em>show up.</em>',
    prop_1_t: 'Curated', prop_1_b: 'Every detail chosen with intention. Nothing left to chance.',
    prop_2_t: 'Complete', prop_2_b: 'Transport, lodging, entries and experiences in a single package.',
    prop_3_t: 'Yours', prop_3_b: 'You decide how deep you go. We handle the rest.',

    pkg_eyebrow: 'The packages',
    pkg_h2: 'Three ways to <em>live it.</em>',
    pkg_cur: 'MXN',
    pkg_per: '+ tax · per person',
    pkg_exps_label: 'Experiences',
    pkg_classic_name: 'Classic', pkg_classic_tag: 'The entry point. Everything essential, nothing extra.',
    pkg_premium_name: 'Premium', pkg_premium_tag: 'More depth. More silence.',
    pkg_vip_name: 'VIP', pkg_vip_tag: "Here, luxury isn't announced. You feel it the moment you arrive.",
    pkg_inc_basic: 'Round transport Mérida → Tulum · Transport for activities · Entry to selected events · Personalized lodging',
    pkg_inc_vip: 'Round transport Mérida → Tulum · Transport for activities · Entry to selected events · Luxury lodging or full accommodation',
    pkg_cta: 'Reserve your spot',
    pkg_note: 'Also available à la carte: yachts · private chef · wellness · exclusive restaurants.',

    exp_comida: 'Welcome Dinner',
    exp_beach: 'Beach Club',
    exp_wellness: 'Wellness Day',
    exp_bar: 'Bar Hopping',
    exp_villa: 'Villa Party',
    exp_cenote: 'Cenote',
    exp_tour: 'Tour of your choice',
    exp_sound: 'Sound Healing',
    exp_yate: 'Yacht',
    exp_yoga: 'Yoga',
    exp_villavip: 'Villa Party VIP',

    exps_eyebrow: 'The experiences',
    exps_h2: 'Eight <em>moments.</em>',

    proc_eyebrow: 'The process',
    proc_h2: 'Three steps.<br>The rest is <em>ours.</em>',
    proc_1_t: 'Choose', proc_1_b: 'Pick your package and the dates that work for you.',
    proc_2_t: 'Reserve', proc_2_b: 'Hold your spot with an online deposit. Safe and fast.',
    proc_3_t: 'Show up', proc_3_b: 'Arrive in Mérida. We handle the rest.',
    proc_note: '* Prices subject to season. Limited spots per departure.',

    fechas_eyebrow: 'Upcoming departures',
    fechas_h2: 'When is <em>yours?</em>',
    dates_col_fecha: 'Date', dates_col_pkg: 'Packages', dates_col_spots: 'Spots',
    dates_spots: 'spots',
    dates_loading: 'Loading dates…',
    dates_testnote: 'Test mode · payment is $10&nbsp;MXN to validate the end-to-end flow.',
    dates_ask: "Don't see your date?",
    dates_btn: 'Write to us',

    guru_eyebrow: 'Curated by',
    guru_h2: 'Guru <em>Davar.</em>',
    guru_role: 'DJ · Producer · Host',
    guru_bio: "Ricardo has spent years creating the moments people don't forget in Tulum. Tul - Dá is the extension of that — every trip carries his name because it carries his judgment.",
    guru_btn: 'Follow on Instagram',

    footer_route: 'Mérida → Tulum',
    footer_note: '* Prices subject to season. Limited spots per departure.',
    footer_copy: '© 2026 Tul - Dá. All rights reserved.',
    footer_terms: 'Terms & conditions',
    footer_privacy: 'Privacy'
  };

  var META = {
    en: {
      title: 'Tul - Dá — Curated Experiences Mérida → Tulum | by Guru Davar',
      desc: 'Tul - Dá: curated luxury trips on the Mérida → Tulum route, by Guru Davar. Transport, lodging, cenotes, beach club, yacht and nightlife in one package. You just show up.'
    }
  };

  var STORE = 'tulda_lang';
  var els = document.querySelectorAll('[data-t]');
  var es = {}; // caché del español original (DOM)
  els.forEach(function (el) { es[el.getAttribute('data-t')] = el.innerHTML; });

  var descMeta = document.querySelector('meta[name="description"]');
  var esTitle = document.title;
  var esDesc = descMeta ? descMeta.getAttribute('content') : '';

  function apply(lang) {
    var dict = lang === 'en' ? EN : es;
    els.forEach(function (el) {
      var k = el.getAttribute('data-t');
      if (dict[k] != null) el.innerHTML = dict[k];
    });
    document.documentElement.lang = lang;
    document.title = lang === 'en' ? META.en.title : esTitle;
    if (descMeta) descMeta.setAttribute('content', lang === 'en' ? META.en.desc : esDesc);

    var t = document.getElementById('langToggle');
    if (t) {
      t.querySelectorAll('.lang-toggle__opt').forEach(function (o) {
        o.classList.toggle('is-active', o.getAttribute('data-lang') === lang);
      });
      t.setAttribute('aria-label', lang === 'en' ? 'Switch language to Spanish' : 'Cambiar idioma a inglés');
    }
    try { localStorage.setItem(STORE, lang); } catch (e) {}
  }

  // Idioma inicial: ?lang= > localStorage > navegador > es
  var param = new URLSearchParams(location.search).get('lang');
  var saved; try { saved = localStorage.getItem(STORE); } catch (e) {}
  var nav = (navigator.language || 'es').slice(0, 2);
  var initial = param || saved || (nav === 'en' ? 'en' : 'es');
  if (initial === 'en') apply('en');

  var toggle = document.getElementById('langToggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      apply(document.documentElement.lang === 'en' ? 'es' : 'en');
    });
  }
})();
