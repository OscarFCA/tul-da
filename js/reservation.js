/* ====================================================================
   TUL - DÁ — Modal de reserva (carrito).
   Flujo: Fecha + Paquete (una sola vista con calendario) → Boletos → Datos → Stripe.
   El calendario muestra las salidas; al elegir un día ves los paquetes con
   los lugares que quedan ese día y eliges. Disponibilidad y pago: backend.
   ==================================================================== */
(function () {
  'use strict';

  var modal = document.getElementById('reserveModal');
  if (!modal) return;
  var API = modal.getAttribute('data-api');
  var PKG_ORDER = ['Classic', 'Premium', 'VIP'];

  /* ---- Datos de paquetes (precio base sin IVA, MXN) ---- */
  var PACKAGES = [
    { key: 'Classic', price: 6666 },
    { key: 'Premium', price: 9999 },
    { key: 'VIP', price: 18881 }
  ];
  var PRICE = {}; PACKAGES.forEach(function (p) { PRICE[p.key] = p.price; });

  /* ---- Textos ES / EN ---- */
  var STR = {
    es: {
      title: 'Reserva tu experiencia',
      steps: ['Fecha y paquete', 'Boletos', 'Tus datos'],
      pick_datepkg: 'Elige fecha y paquete', pick_datepkg_sub: 'Elige un día y verás los paquetes con lugar disponible.',
      pkg_for_day: 'Paquetes para esta fecha', pick_day_first: 'Primero elige una fecha disponible.',
      per: '+ IVA · p/p', spots_left: 'lugares', spot_1: 'lugar', soldout: 'Agotado',
      no_dates: 'Sin fechas disponibles por ahora.',
      tickets: '¿Cuántos boletos?', tickets_sub: 'Máximo según lugares disponibles.',
      your_data: 'Tus datos', name: 'Nombre completo', email: 'Correo electrónico', phone: 'WhatsApp / Teléfono',
      summary: 'Resumen', cart_empty: 'Tu selección aparecerá aquí.', pkg_l: 'Paquete', date_l: 'Fecha', qty_l: 'Boletos',
      currency_l: 'Moneda', subtotal_l: 'Subtotal', iva_l: 'IVA (16%)', total_l: 'Total',
      test_charge: 'Cargo de prueba', test_note2: 'Modo prueba: se cobra el mínimo. Usa la tarjeta 4242 4242 4242 4242.',
      diet_q: '¿Tienes restricciones alimenticias o alergias?',
      diet_notes_ph: '¿Algo más que debamos saber? Alergias graves, preferencias específicas…',
      back: 'Atrás', next: 'Continuar', pay: 'Ir a pagar',
      test: 'Modo prueba · usa la tarjeta 4242 4242 4242 4242 (no se cobra dinero real).',
      err_datepkg: 'Elige una fecha y un paquete disponible.',
      err_name: 'Escribe tu nombre.', err_email: 'Correo inválido.', err_phone: 'Escribe tu teléfono.',
      loading: 'Cargando fechas…', pay_err: 'No pudimos iniciar el pago. Intenta de nuevo.',
      months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
      wd: ['L', 'M', 'M', 'J', 'V', 'S', 'D'], locale: 'es-MX'
    },
    en: {
      title: 'Reserve your experience',
      steps: ['Date & package', 'Tickets', 'Your details'],
      pick_datepkg: 'Choose date & package', pick_datepkg_sub: 'Pick a day and you’ll see the packages with spots left.',
      pkg_for_day: 'Packages for this date', pick_day_first: 'First pick an available date.',
      per: '+ tax · pp', spots_left: 'spots', spot_1: 'spot', soldout: 'Sold out',
      no_dates: 'No dates available right now.',
      tickets: 'How many tickets?', tickets_sub: 'Max based on available spots.',
      your_data: 'Your details', name: 'Full name', email: 'Email', phone: 'WhatsApp / Phone',
      summary: 'Summary', cart_empty: 'Your selection will appear here.', pkg_l: 'Package', date_l: 'Date', qty_l: 'Tickets',
      currency_l: 'Currency', subtotal_l: 'Subtotal', iva_l: 'Tax (16%)', total_l: 'Total',
      test_charge: 'Test charge', test_note2: 'Test mode: the minimum is charged. Use card 4242 4242 4242 4242.',
      diet_q: 'Any dietary restrictions or allergies?',
      diet_notes_ph: 'Anything else we should know? Serious allergies, specific preferences…',
      back: 'Back', next: 'Continue', pay: 'Proceed to payment',
      test: 'Test mode · use card 4242 4242 4242 4242 (no real charge).',
      err_datepkg: 'Choose an available date and package.',
      err_name: 'Enter your name.', err_email: 'Invalid email.', err_phone: 'Enter your phone.',
      loading: 'Loading dates…', pay_err: "We couldn't start the payment. Please try again.",
      months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      wd: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], locale: 'en-US'
    }
  };
  function lang() { return document.documentElement.lang === 'en' ? 'en' : 'es'; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var cfg = { rates: { MXN: 1 }, ivaRate: 0.16, testMode: false, testAmounts: {}, currencies: ['MXN', 'USD', 'EUR'] };
  var CUR_DEC = { MXN: 0, USD: 2, EUR: 2 };
  var DIET_OPTS = [
    { v: 'Vegetariano', es: 'Vegetariano', en: 'Vegetarian' },
    { v: 'Vegano', es: 'Vegano', en: 'Vegan' },
    { v: 'Sin gluten', es: 'Sin gluten', en: 'Gluten-free' },
    { v: 'Sin lácteos', es: 'Sin lácteos', en: 'Dairy-free' },
    { v: 'Sin mariscos', es: 'Sin mariscos', en: 'Shellfish-free' },
    { v: 'Sin nueces', es: 'Sin nueces', en: 'Nut-free' },
    { v: 'Kosher', es: 'Kosher', en: 'Kosher' },
    { v: 'Halal', es: 'Halal', en: 'Halal' }
  ];
  function money(mxn) {
    var cur = state.currency, amt = mxn * (cfg.rates[cur] || 1);
    return new Intl.NumberFormat(STR[lang()].locale, { style: 'currency', currency: cur, maximumFractionDigits: CUR_DEC[cur] }).format(amt);
  }
  function fmtCurMinor(minor, cur) {
    return new Intl.NumberFormat(STR[lang()].locale, { style: 'currency', currency: cur, maximumFractionDigits: CUR_DEC[cur] }).format((minor || 0) / 100);
  }
  function unitPrice(key) { return PRICE[key]; }

  /* ---- Estado ---- */
  var state = { step: 0, dateIso: null, pkg: null, dateId: null, dateObj: null, qty: 1, name: '', email: '', phone: '', cal: null, currency: 'MXN', dietary: { enabled: false, restrictions: [], notes: '' } };
  var depByIso = {};   // 'YYYY-MM-DD' → { iso, endDate, packages:[{key,id,spotsLeft,status}], total, status }
  var allLoaded = false;

  /* ---- Estructura del modal ---- */
  modal.innerHTML =
    '<div class="rmodal__overlay" data-close></div>' +
    '<div class="rmodal__panel" role="dialog" aria-modal="true" aria-labelledby="rmodalTitle">' +
      '<button class="rmodal__x" type="button" data-close aria-label="Cerrar">&times;</button>' +
      '<header class="rmodal__head"><h3 id="rmodalTitle" class="rmodal__title"></h3>' +
        '<ol class="rmodal__steps"></ol></header>' +
      '<div class="rmodal__body">' +
        '<div class="rmodal__main"><div class="rmodal__content"></div></div>' +
        '<aside class="rmodal__aside">' +
          '<div class="rmodal__cart"></div>' +
          '<div class="rmodal__actions">' +
            '<button class="rmodal__btn rmodal__btn--gold" type="button" data-next></button>' +
            '<button class="rmodal__btnback" type="button" data-back></button>' +
          '</div>' +
        '</aside>' +
      '</div>' +
    '</div>';

  var elContent = modal.querySelector('.rmodal__content');
  var elSteps = modal.querySelector('.rmodal__steps');
  var elCart = modal.querySelector('.rmodal__cart');
  var elTitle = modal.querySelector('.rmodal__title');
  var btnBack = modal.querySelector('[data-back]');
  var btnNext = modal.querySelector('[data-next]');
  var LAST_STEP = 2;

  /* ---- Apertura / cierre ---- */
  function open(opts) {
    opts = opts || {};
    state.step = 0; state.qty = 1; state.dateIso = null; state.dateId = null; state.dateObj = null; state.cal = null;
    if (opts.package && PRICE[opts.package]) state.pkg = opts.package; // paquete preferido
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    function proceed() {
      if (opts.dateId) {
        Object.keys(depByIso).some(function (iso) {
          var p = depByIso[iso].packages.filter(function (x) { return x.id === opts.dateId; })[0];
          if (p) { pickPackageForDay(iso, p.key); return true; } // preselecciona día + paquete
          return false;
        });
      }
      render();
    }
    // Si ya hay disponibilidad, render final directo (sin parpadeo). Si no, un
    // "Cargando…" limpio hasta que esté todo listo (nunca un estado intermedio).
    if (allLoaded) { proceed(); return; }
    var t = STR[lang()];
    elTitle.textContent = t.title; elSteps.innerHTML = '';
    elContent.innerHTML = '<h4 class="rmodal__h">' + esc(t.pick_datepkg) + '</h4><p class="rmodal__state">' + esc(t.loading) + '</p>';
    elCart.innerHTML = ''; btnBack.style.visibility = 'hidden'; btnNext.textContent = t.next;
    ensureAllAvail().then(proceed);
  }
  function close() { modal.hidden = true; document.body.style.overflow = ''; }
  modal.addEventListener('click', function (e) { if (e.target.hasAttribute('data-close')) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) close(); });

  /* ---- Disponibilidad (todas las salidas, agrupadas por día) ---- */
  function ensureAllAvail() {
    if (allLoaded) return Promise.resolve();
    return fetch(API + '/api/availability')
      .then(function (r) { return r.json(); })
      .then(function (j) {
        (j.dates || []).forEach(function (d) {
          if (!d.date) return;
          var key = (d.packageNames && d.packageNames[0]) || '?';
          var dep = depByIso[d.date] || (depByIso[d.date] = { iso: d.date, endDate: d.endDate, packages: [], total: 0, status: 'open' });
          dep.packages.push({ key: key, id: d.id, spotsLeft: d.spotsLeft, status: d.status });
          if (d.endDate) dep.endDate = d.endDate;
        });
        Object.keys(depByIso).forEach(function (iso) {
          var dep = depByIso[iso];
          dep.packages.sort(function (a, b) { return PKG_ORDER.indexOf(a.key) - PKG_ORDER.indexOf(b.key); });
          dep.total = dep.packages.reduce(function (s, p) { return s + Math.max(0, p.spotsLeft); }, 0);
          dep.status = dep.total <= 0 ? 'sold_out' : (dep.total <= 5 ? 'low_availability' : 'open');
        });
        allLoaded = true;
      })
      .catch(function () { allLoaded = true; });
  }
  // Elige un paquete para el día iso, prefiriendo `prefer` o el actual state.pkg.
  function pickPackageForDay(iso, prefer) {
    var dep = depByIso[iso];
    state.dateIso = iso;
    if (!dep) { state.pkg = null; state.dateId = null; state.dateObj = null; return; }
    var bookable = dep.packages.filter(function (p) { return p.spotsLeft > 0 && p.status !== 'sold_out'; });
    var want = prefer || state.pkg;
    var chosen = bookable.filter(function (p) { return p.key === want; })[0] || bookable[0] || null;
    if (chosen) {
      state.pkg = chosen.key; state.dateId = chosen.id; state.dateObj = chosen;
      if (state.qty > chosen.spotsLeft) state.qty = chosen.spotsLeft;
      if (state.qty < 1) state.qty = 1;
    } else { state.pkg = null; state.dateId = null; state.dateObj = null; }
  }

  /* ---- Render principal ---- */
  function render() {
    var t = STR[lang()];
    elTitle.textContent = t.title;
    elSteps.innerHTML = t.steps.map(function (s, i) {
      var cls = 'rmodal__step' + (i === state.step ? ' is-active' : '') + (i < state.step ? ' is-done' : '');
      return '<li class="' + cls + '"><span>' + (i + 1) + '</span>' + esc(s) + '</li>';
    }).join('');

    if (state.step === 0) renderDatePkg();
    else if (state.step === 1) renderTickets();
    else if (state.step === 2) renderDetails();

    btnBack.textContent = t.back;
    btnBack.style.visibility = state.step === 0 ? 'hidden' : 'visible';
    btnNext.textContent = state.step === LAST_STEP ? t.pay : t.next;
    renderCart();
  }

  function renderCart() {
    var t = STR[lang()];
    var curSel = '<div class="rmodal__curr" role="group" aria-label="' + esc(t.currency_l) + '">' +
      cfg.currencies.map(function (c) {
        return '<button type="button" class="rmodal__curbtn' + (state.currency === c ? ' is-sel' : '') + '" data-cur="' + c + '">' + c + '</button>';
      }).join('') + '</div>';
    var head = '<div class="rmodal__carthead">' + esc(t.summary) + '</div>';

    if (!state.pkg || !state.dateObj) {
      elCart.innerHTML = head + curSel + '<p class="rmodal__cartempty">' + esc(t.cart_empty) + '</p>';
      bindCur(); return;
    }
    var subtotal = unitPrice(state.pkg) * state.qty;
    var iva = subtotal * cfg.ivaRate;
    var total = subtotal + iva;
    var depSel = depByIso[state.dateIso];
    var dateTxt = fmtRange(state.dateIso, depSel && depSel.endDate);
    var testBlock = '';
    if (cfg.testMode) {
      testBlock =
        '<div class="rmodal__cartrow rmodal__cartrow--test"><span>' + esc(t.test_charge) + '</span><b>' +
          fmtCurMinor(cfg.testAmounts[state.currency], state.currency) + '</b></div>' +
        '<p class="rmodal__cartnote">' + esc(t.test_note2) + '</p>';
    }
    elCart.innerHTML = head + curSel +
      '<div class="rmodal__cartrow"><span>' + esc(t.pkg_l) + '</span><b>' + esc(state.pkg) + '</b></div>' +
      '<div class="rmodal__cartrow"><span>' + esc(t.date_l) + '</span><b>' + esc(dateTxt) + '</b></div>' +
      '<div class="rmodal__cartrow"><span>' + esc(t.qty_l) + '</span><b>' + state.qty + '</b></div>' +
      '<div class="rmodal__cartrow"><span>' + esc(t.subtotal_l) + '</span><b>' + money(subtotal) + '</b></div>' +
      '<div class="rmodal__cartrow"><span>' + esc(t.iva_l) + '</span><b>' + money(iva) + '</b></div>' +
      '<div class="rmodal__cartrow rmodal__cartrow--total"><span>' + esc(t.total_l) + '</span><b>' + money(total) + '</b></div>' +
      testBlock;
    bindCur();
  }
  function bindCur() {
    elCart.querySelectorAll('[data-cur]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.currency = b.getAttribute('data-cur');
        renderCart();
        if (state.step === 0) drawPkgPanel(); // precios de los paquetes del día
      });
    });
  }

  /* ---- Fechas ---- */
  function fmtDate(iso) {
    var lg = lang(), t = STR[lg], p = iso.split('-');
    var d = parseInt(p[2], 10), mo = t.months[parseInt(p[1], 10) - 1], y = p[0];
    return lg === 'en' ? (mo + ' ' + d + ', ' + y) : (d + ' ' + mo + ' ' + y);
  }
  function fmtRange(start, end) {
    if (!end || end === start) return fmtDate(start);
    var lg = lang(), t = STR[lg];
    function dm(iso) { var p = iso.split('-'); var d = parseInt(p[2], 10), mo = t.months[parseInt(p[1], 10) - 1]; return lg === 'en' ? (mo + ' ' + d) : (d + ' ' + mo); }
    return dm(start) + ' – ' + fmtDate(end);
  }

  /* ---- Paso 0: Fecha + Paquete (una sola vista) ---- */
  function renderDatePkg() {
    var t = STR[lang()];
    if (!allLoaded) {
      elContent.innerHTML = '<h4 class="rmodal__h">' + esc(t.pick_datepkg) + '</h4><p class="rmodal__state">' + esc(t.loading) + '</p>';
      return;
    }
    if (!Object.keys(depByIso).length) {
      elContent.innerHTML = '<h4 class="rmodal__h">' + esc(t.pick_datepkg) + '</h4><p class="rmodal__state">' + esc(t.no_dates) + '</p>';
      return;
    }
    elContent.innerHTML =
      '<h4 class="rmodal__h">' + esc(t.pick_datepkg) + '</h4>' +
      '<p class="rmodal__sub">' + esc(t.pick_datepkg_sub) + '</p>' +
      '<div class="rmodal__cal" id="rmodalCal"></div>' +
      '<div class="rmodal__daypkgs-wrap" id="rmodalDayPkgs"></div>';
    if (!state.cal) {
      var firstOpen = Object.keys(depByIso).sort().filter(function (iso) { return depByIso[iso].status !== 'sold_out'; })[0] || Object.keys(depByIso).sort()[0];
      var p = firstOpen.split('-'); state.cal = { y: +p[0], m: +p[1] - 1 };
    }
    drawCalendar();
    drawPkgPanel();
  }

  function monthRange() {
    var isos = [];
    Object.keys(depByIso).forEach(function (iso) {
      isos.push(iso);
      if (depByIso[iso].endDate) isos.push(depByIso[iso].endDate); // incluir meses del rango (agosto)
    });
    if (!isos.length) return null;
    isos.sort();
    function ym(iso) { var p = iso.split('-'); return { y: +p[0], m: +p[1] - 1 }; }
    return { min: ym(isos[0]), max: ym(isos[isos.length - 1]) };
  }

  function drawCalendar() {
    var lg = lang(), t = STR[lg], cal = state.cal, box = document.getElementById('rmodalCal');
    if (!box) return;
    var y = cal.y, m = cal.m;
    var firstDow = (new Date(y, m, 1).getDay() + 6) % 7;
    var days = new Date(y, m + 1, 0).getDate();
    var range = monthRange();
    var canPrev = range && (y > range.min.y || (y === range.min.y && m > range.min.m));
    var canNext = range && (y < range.max.y || (y === range.max.y && m < range.max.m));

    // Días de continuación (rango de la salida).
    var contMap = {};
    Object.keys(depByIso).forEach(function (iso) {
      var dep = depByIso[iso];
      if (!dep.endDate || dep.endDate === iso) return;
      var s = new Date(iso + 'T00:00:00'), e = new Date(dep.endDate + 'T00:00:00');
      for (var x = new Date(s.getTime() + 86400000); x <= e; x = new Date(x.getTime() + 86400000)) {
        contMap[x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0')] = iso;
      }
    });

    var cells = '';
    for (var i = 0; i < firstDow; i++) cells += '<span class="rmodal__day rmodal__day--pad"></span>';
    for (var d = 1; d <= days; d++) {
      var iso = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      var dep = depByIso[iso];
      if (dep && dep.status !== 'sold_out') {
        var sel = state.dateIso === iso ? ' is-sel' : '';
        // Badge = lugares del paquete SELECCIONADO ese día (no la suma de todos).
        var selP = state.pkg ? dep.packages.filter(function (p) { return p.key === state.pkg; })[0] : null;
        var badge = selP ? selP.spotsLeft : dep.total;
        var low = badge <= 5 ? ' rmodal__day--low' : '';
        cells += '<button type="button" class="rmodal__day rmodal__day--open' + low + sel + '" data-iso="' + iso + '">' +
          d + '<i>' + badge + '</i></button>';
      } else if (dep && dep.status === 'sold_out') {
        cells += '<span class="rmodal__day rmodal__day--sold">' + d + '</span>';
      } else if (contMap[iso]) {
        var selr = state.dateIso === contMap[iso] ? ' is-selrange' : '';
        cells += '<span class="rmodal__day rmodal__day--range' + selr + '">' + d + '</span>';
      } else {
        cells += '<span class="rmodal__day rmodal__day--off">' + d + '</span>';
      }
    }
    box.innerHTML =
      '<div class="rmodal__calhead">' +
        '<button type="button" class="rmodal__calnav" data-cal-prev ' + (canPrev ? '' : 'disabled') + '>‹</button>' +
        '<span class="rmodal__calmonth">' + esc(t.months[m]) + ' ' + y + '</span>' +
        '<button type="button" class="rmodal__calnav" data-cal-next ' + (canNext ? '' : 'disabled') + '>›</button>' +
      '</div>' +
      '<div class="rmodal__wd">' + t.wd.map(function (w) { return '<span>' + w + '</span>'; }).join('') + '</div>' +
      '<div class="rmodal__grid">' + cells + '</div>';

    box.querySelector('[data-cal-prev]').addEventListener('click', function () { if (m === 0) { cal.y--; cal.m = 11; } else cal.m--; drawCalendar(); });
    box.querySelector('[data-cal-next]').addEventListener('click', function () { if (m === 11) { cal.y++; cal.m = 0; } else cal.m++; drawCalendar(); });
    box.querySelectorAll('[data-iso]').forEach(function (b) {
      b.addEventListener('click', function () {
        pickPackageForDay(b.getAttribute('data-iso'));
        drawCalendar(); drawPkgPanel(); renderCart();
      });
    });
  }

  // Panel de paquetes del día seleccionado (con lugares que quedan).
  function drawPkgPanel() {
    var t = STR[lang()], box = document.getElementById('rmodalDayPkgs');
    if (!box) return;
    if (!state.dateIso || !depByIso[state.dateIso]) {
      box.innerHTML = '<p class="rmodal__daypkgs-hint">' + esc(t.pick_day_first) + '</p>';
      return;
    }
    var dep = depByIso[state.dateIso];
    box.innerHTML =
      '<div class="rmodal__daypkgs-h">' + esc(t.pkg_for_day) + ' · ' + esc(fmtRange(state.dateIso, dep.endDate)) + '</div>' +
      '<div class="rmodal__daypkgs">' + dep.packages.map(function (p) {
        var out = p.spotsLeft <= 0 || p.status === 'sold_out';
        var urg = p.spotsLeft <= 2 ? ' is-critical' : (p.spotsLeft <= 5 ? ' is-low' : '');
        var seat = out ? esc(t.soldout) : '<b>' + p.spotsLeft + '</b> ' + esc(p.spotsLeft === 1 ? t.spot_1 : t.spots_left);
        return '<button type="button" class="rmodal__daypkg' + (state.pkg === p.key && !out ? ' is-sel' : '') + (out ? ' is-out' : '') + urg + '"' +
          (out ? ' disabled' : '') + ' data-pkgkey="' + esc(p.key) + '">' +
          '<span class="rmodal__daypkg-name">' + esc(p.key) + '</span>' +
          '<span class="rmodal__daypkg-price">' + money(PRICE[p.key]) + '</span>' +
          '<span class="rmodal__daypkg-spots"><span class="cd__dot"></span>' + seat + '</span>' +
        '</button>';
      }).join('') + '</div>';
    box.querySelectorAll('[data-pkgkey]').forEach(function (b) {
      if (b.disabled) return;
      b.addEventListener('click', function () {
        var key = b.getAttribute('data-pkgkey');
        var p = dep.packages.filter(function (x) { return x.key === key; })[0];
        state.pkg = key; state.dateId = p.id; state.dateObj = p;
        if (state.qty > p.spotsLeft) state.qty = p.spotsLeft; if (state.qty < 1) state.qty = 1;
        drawPkgPanel(); drawCalendar(); renderCart(); // el badge del calendario sigue al paquete
      });
    });
  }

  /* ---- Paso 1: Boletos ---- */
  function renderTickets() {
    var t = STR[lang()];
    var max = state.dateObj ? state.dateObj.spotsLeft : 1;
    if (state.qty > max) state.qty = max; if (state.qty < 1) state.qty = 1;
    elContent.innerHTML =
      '<h4 class="rmodal__h">' + esc(t.tickets) + '</h4>' +
      '<p class="rmodal__sub">' + esc(t.tickets_sub) + '</p>' +
      '<div class="rmodal__stepper">' +
        '<button type="button" class="rmodal__pm" data-dec>−</button>' +
        '<span class="rmodal__qty" id="rmodalQty">' + state.qty + '</span>' +
        '<button type="button" class="rmodal__pm" data-inc>+</button>' +
      '</div>' +
      '<p class="rmodal__sub rmodal__sub--c">' + esc(state.pkg || '') + (state.dateObj ? ' · ' + state.dateObj.spotsLeft + ' ' + t.spots_left : '') + '</p>';
    elContent.querySelector('[data-dec]').addEventListener('click', function () { if (state.qty > 1) { state.qty--; document.getElementById('rmodalQty').textContent = state.qty; renderCart(); } });
    elContent.querySelector('[data-inc]').addEventListener('click', function () { if (state.qty < max) { state.qty++; document.getElementById('rmodalQty').textContent = state.qty; renderCart(); } });
  }

  /* ---- Paso 2: Datos ---- */
  function renderDetails() {
    var t = STR[lang()], lg = lang(), d = state.dietary;
    var pills = DIET_OPTS.map(function (o) {
      var on = d.restrictions.indexOf(o.v) > -1 ? ' is-sel' : '';
      return '<button type="button" class="rmodal__pill' + on + '" data-diet="' + esc(o.v) + '">' + esc(o[lg]) + '</button>';
    }).join('');
    elContent.innerHTML =
      '<h4 class="rmodal__h">' + esc(t.your_data) + '</h4>' +
      '<div class="rmodal__form">' +
        '<label class="rmodal__field"><span>' + esc(t.name) + '</span><input type="text" id="rf_name" autocomplete="name" value="' + esc(state.name) + '"></label>' +
        '<label class="rmodal__field"><span>' + esc(t.email) + '</span><input type="email" id="rf_email" autocomplete="email" value="' + esc(state.email) + '"></label>' +
        '<label class="rmodal__field"><span>' + esc(t.phone) + '</span><input type="tel" id="rf_phone" autocomplete="tel" value="' + esc(state.phone) + '"></label>' +
        '<label class="rmodal__check"><input type="checkbox" id="rf_diet"' + (d.enabled ? ' checked' : '') + '> <span>' + esc(t.diet_q) + '</span></label>' +
        '<div class="rmodal__diet' + (d.enabled ? ' is-open' : '') + '" id="rf_dietbox">' +
          '<div class="rmodal__pills">' + pills + '</div>' +
          '<textarea class="rmodal__textarea" id="rf_dietnotes" rows="3" placeholder="' + esc(t.diet_notes_ph) + '">' + esc(d.notes) + '</textarea>' +
        '</div>' +
        '<p class="rmodal__err" id="rf_err" hidden></p>' +
        '<p class="rmodal__test">' + esc(t.test) + '</p>' +
      '</div>';
    ['name', 'email', 'phone'].forEach(function (f) {
      elContent.querySelector('#rf_' + f).addEventListener('input', function (e) { state[f] = e.target.value; });
    });
    var box = elContent.querySelector('#rf_dietbox');
    elContent.querySelector('#rf_diet').addEventListener('change', function (e) {
      d.enabled = e.target.checked;
      if (d.enabled) box.classList.add('is-open');
      else { box.classList.remove('is-open'); d.restrictions = []; d.notes = ''; renderDetails(); }
    });
    elContent.querySelectorAll('[data-diet]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-diet'), i = d.restrictions.indexOf(v);
        if (i > -1) { d.restrictions.splice(i, 1); b.classList.remove('is-sel'); }
        else { d.restrictions.push(v); b.classList.add('is-sel'); }
      });
    });
    elContent.querySelector('#rf_dietnotes').addEventListener('input', function (e) { d.notes = e.target.value; });
  }

  /* ---- Navegación ---- */
  function showErr(msg) {
    var errEl = elContent.querySelector('#rf_err');
    if (errEl) { errEl.textContent = msg; errEl.hidden = false; } else alert(msg);
  }
  function next() {
    var t = STR[lang()];
    if (state.step === 0) {
      if (!state.dateId || !state.pkg || !state.dateObj || state.dateObj.spotsLeft <= 0) return showErr(t.err_datepkg);
      state.step = 1; return render();
    }
    if (state.step === 1) { state.step = 2; return render(); }
    if (state.step === 2) return submit();
  }
  function back() { if (state.step > 0) { state.step--; render(); } }
  btnNext.addEventListener('click', next);
  btnBack.addEventListener('click', back);

  function submit() {
    var t = STR[lang()];
    if (!state.name.trim()) return showErr(t.err_name);
    if (!/.+@.+\..+/.test(state.email)) return showErr(t.err_email);
    if (!state.phone.trim()) return showErr(t.err_phone);
    btnNext.disabled = true; btnNext.textContent = '…';
    fetch(API + '/api/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        package: state.pkg, dateId: state.dateId, quantity: state.qty,
        name: state.name.trim(), email: state.email.trim(), phone: state.phone.trim(),
        currency: state.currency,
        dietaryRestrictions: state.dietary.enabled ? state.dietary.restrictions : [],
        dietaryNotes: state.dietary.enabled ? state.dietary.notes.trim() : ''
      })
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok && res.j.url) { window.location.href = res.j.url; return; }
        showErr(res.j.error || t.pay_err); btnNext.disabled = false; btnNext.textContent = t.pay;
      })
      .catch(function () { showErr(t.pay_err); btnNext.disabled = false; btnNext.textContent = t.pay; });
  }

  new MutationObserver(function () { if (!modal.hidden) render(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('.js-reserve');
    if (!trigger) return;
    e.preventDefault();
    open({ package: trigger.getAttribute('data-package') });
  });

  fetch(API + '/api/config')
    .then(function (r) { return r.json(); })
    .then(function (c) {
      if (!c) return;
      if (c.rates) cfg.rates = c.rates;
      if (typeof c.ivaRate === 'number') cfg.ivaRate = c.ivaRate;
      if (Array.isArray(c.currencies)) cfg.currencies = c.currencies;
      cfg.testMode = !!c.testMode;
      cfg.testAmounts = c.testAmounts || {};
      if (!modal.hidden) render();
    })
    .catch(function () {});

  window.TuldaReserve = { open: open };
})();
