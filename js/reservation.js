/* ====================================================================
   TUL - DÁ — Modal de reserva (carrito).
   Flujo: Paquete → Fecha (calendario con lugares) → Boletos → Datos → Stripe.
   Disponibilidad y pago vienen del backend (Railway). La BD (Airtable) manda.
   ==================================================================== */
(function () {
  'use strict';

  var modal = document.getElementById('reserveModal');
  if (!modal) return;
  var API = modal.getAttribute('data-api');

  /* ---- Datos de paquetes (precio base sin IVA, MXN) ---- */
  var PACKAGES = [
    { key: 'Classic', price: 6666, tag: { es: 'Lo esencial, sin extras.', en: 'The essentials, nothing extra.' } },
    { key: 'Premium', price: 9999, tag: { es: 'Más profundidad. Más silencio.', en: 'More depth. More silence.' } },
    { key: 'VIP', price: 18881, tag: { es: 'El lujo que se siente al llegar.', en: 'Luxury you feel on arrival.' } }
  ];
  var PRICE = {}; PACKAGES.forEach(function (p) { PRICE[p.key] = p.price; });

  /* ---- Textos ES / EN ---- */
  var STR = {
    es: {
      title: 'Reserva tu experiencia',
      steps: ['Paquete', 'Fecha', 'Boletos', 'Tus datos'],
      pick_pkg: 'Elige tu paquete', per: '+ IVA · por persona',
      pick_date: 'Elige tu fecha', pick_date_sub: 'Salidas con lugar disponible',
      spots_left: 'lugares', soldout: 'Agotado', no_dates: 'Sin fechas disponibles para este paquete por ahora.',
      tickets: '¿Cuántos boletos?', tickets_sub: 'Máximo según lugares disponibles.',
      your_data: 'Tus datos', name: 'Nombre completo', email: 'Correo electrónico', phone: 'WhatsApp / Teléfono',
      summary: 'Resumen', pkg_l: 'Paquete', date_l: 'Fecha', qty_l: 'Boletos', total_l: 'Total',
      back: 'Atrás', next: 'Continuar', pay: 'Ir a pagar',
      test: 'Modo prueba · usa la tarjeta 4242 4242 4242 4242 (no se cobra dinero real).',
      err_pkg: 'Elige un paquete.', err_date: 'Elige una fecha disponible.',
      err_name: 'Escribe tu nombre.', err_email: 'Correo inválido.', err_phone: 'Escribe tu teléfono.',
      loading: 'Cargando fechas…', pay_err: 'No pudimos iniciar el pago. Intenta de nuevo.',
      months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
      wd: ['L', 'M', 'M', 'J', 'V', 'S', 'D'], locale: 'es-MX'
    },
    en: {
      title: 'Reserve your experience',
      steps: ['Package', 'Date', 'Tickets', 'Your details'],
      pick_pkg: 'Choose your package', per: '+ tax · per person',
      pick_date: 'Choose your date', pick_date_sub: 'Departures with spots available',
      spots_left: 'spots', soldout: 'Sold out', no_dates: 'No dates available for this package right now.',
      tickets: 'How many tickets?', tickets_sub: 'Max based on available spots.',
      your_data: 'Your details', name: 'Full name', email: 'Email', phone: 'WhatsApp / Phone',
      summary: 'Summary', pkg_l: 'Package', date_l: 'Date', qty_l: 'Tickets', total_l: 'Total',
      back: 'Back', next: 'Continue', pay: 'Proceed to payment',
      test: 'Test mode · use card 4242 4242 4242 4242 (no real charge).',
      err_pkg: 'Choose a package.', err_date: 'Choose an available date.',
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
  function money(n) {
    return new Intl.NumberFormat(STR[lang()].locale, { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
  }

  /* ---- Estado ---- */
  var state = { step: 0, pkg: null, dateId: null, dateObj: null, qty: 1, name: '', email: '', phone: '', cal: null };
  var availCache = {}; // pkg → array de fechas
  var availByIso = {}; // 'YYYY-MM-DD' → {id, spotsLeft, status}

  /* ---- Estructura del modal ---- */
  modal.innerHTML =
    '<div class="rmodal__overlay" data-close></div>' +
    '<div class="rmodal__panel" role="dialog" aria-modal="true" aria-labelledby="rmodalTitle">' +
      '<button class="rmodal__x" type="button" data-close aria-label="Cerrar">&times;</button>' +
      '<header class="rmodal__head"><h3 id="rmodalTitle" class="rmodal__title"></h3>' +
        '<ol class="rmodal__steps"></ol></header>' +
      '<div class="rmodal__content"></div>' +
      '<footer class="rmodal__foot">' +
        '<div class="rmodal__cart"></div>' +
        '<div class="rmodal__actions">' +
          '<button class="rmodal__btn rmodal__btn--ghost" type="button" data-back></button>' +
          '<button class="rmodal__btn rmodal__btn--gold" type="button" data-next></button>' +
        '</div>' +
      '</footer>' +
    '</div>';

  var elContent = modal.querySelector('.rmodal__content');
  var elSteps = modal.querySelector('.rmodal__steps');
  var elCart = modal.querySelector('.rmodal__cart');
  var elTitle = modal.querySelector('.rmodal__title');
  var btnBack = modal.querySelector('[data-back]');
  var btnNext = modal.querySelector('[data-next]');

  /* ---- Apertura / cierre ---- */
  function open(opts) {
    opts = opts || {};
    state.step = 0; state.qty = 1; state.dateId = null; state.dateObj = null; state.cal = null;
    if (opts.package && PRICE[opts.package]) state.pkg = opts.package;
    if (opts.dateId) state.pendingDateId = opts.dateId;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    // Si viene con paquete (y quizá fecha) preseleccionado, avanza.
    if (state.pkg && opts.dateId) { ensureAvail(state.pkg).then(function () { selectPendingDate(); state.step = 2; render(); }); return; }
    if (state.pkg) { state.step = 1; }
    render();
  }
  function close() { modal.hidden = true; document.body.style.overflow = ''; }
  function selectPendingDate() {
    if (!state.pendingDateId) return;
    var list = availCache[state.pkg] || [];
    var d = list.filter(function (x) { return x.id === state.pendingDateId; })[0];
    if (d) { state.dateId = d.id; state.dateObj = d; }
    state.pendingDateId = null;
  }

  modal.addEventListener('click', function (e) { if (e.target.hasAttribute('data-close')) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) close(); });

  /* ---- Disponibilidad ---- */
  function ensureAvail(pkg) {
    if (availCache[pkg]) return Promise.resolve(availCache[pkg]);
    return fetch(API + '/api/availability?package=' + encodeURIComponent(pkg))
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var list = (j.dates || []);
        availCache[pkg] = list;
        list.forEach(function (d) { if (d.date) availByIso[d.date] = d; });
        return list;
      })
      .catch(function () { availCache[pkg] = []; return []; });
  }

  /* ---- Render principal ---- */
  function render() {
    var t = STR[lang()];
    elTitle.textContent = t.title;
    elSteps.innerHTML = t.steps.map(function (s, i) {
      var cls = 'rmodal__step' + (i === state.step ? ' is-active' : '') + (i < state.step ? ' is-done' : '');
      return '<li class="' + cls + '"><span>' + (i + 1) + '</span>' + esc(s) + '</li>';
    }).join('');

    if (state.step === 0) renderPackages();
    else if (state.step === 1) renderDates();
    else if (state.step === 2) renderTickets();
    else if (state.step === 3) renderDetails();

    // Footer
    btnBack.textContent = t.back;
    btnBack.style.visibility = state.step === 0 ? 'hidden' : 'visible';
    btnNext.textContent = state.step === 3 ? t.pay : t.next;
    renderCart();
  }

  function renderCart() {
    var t = STR[lang()];
    if (!state.pkg) { elCart.innerHTML = ''; return; }
    var total = state.pkg ? PRICE[state.pkg] * state.qty : 0;
    var dateTxt = state.dateObj ? fmtDate(state.dateObj.date) : '—';
    elCart.innerHTML =
      '<div class="rmodal__cartrow"><span>' + esc(t.pkg_l) + '</span><b>' + esc(state.pkg || '—') + '</b></div>' +
      '<div class="rmodal__cartrow"><span>' + esc(t.date_l) + '</span><b>' + esc(dateTxt) + '</b></div>' +
      '<div class="rmodal__cartrow"><span>' + esc(t.qty_l) + '</span><b>' + state.qty + '</b></div>' +
      '<div class="rmodal__cartrow rmodal__cartrow--total"><span>' + esc(t.total_l) + '</span><b>' + money(total) + '</b></div>';
  }

  /* ---- Paso 0: Paquetes ---- */
  function renderPackages() {
    var lg = lang(), t = STR[lg];
    elContent.innerHTML =
      '<h4 class="rmodal__h">' + esc(t.pick_pkg) + '</h4>' +
      '<div class="rmodal__pkgs">' + PACKAGES.map(function (p) {
        var on = state.pkg === p.key ? ' is-sel' : '';
        return '<button type="button" class="rmodal__pkg' + on + '" data-pkg="' + p.key + '">' +
          '<span class="rmodal__pkgname">' + esc(p.key) + '</span>' +
          '<span class="rmodal__pkgprice">' + money(p.price) + '</span>' +
          '<span class="rmodal__pkgper">' + esc(t.per) + '</span>' +
          '<span class="rmodal__pkgtag">' + esc(p.tag[lg]) + '</span>' +
        '</button>';
      }).join('') + '</div>';
    elContent.querySelectorAll('[data-pkg]').forEach(function (b) {
      b.addEventListener('click', function () {
        var newPkg = b.getAttribute('data-pkg');
        if (state.pkg !== newPkg) { state.dateId = null; state.dateObj = null; state.qty = 1; state.cal = null; }
        state.pkg = newPkg;
        renderPackages(); renderCart();
      });
    });
  }

  /* ---- Paso 1: Fecha (calendario) ---- */
  function fmtDate(iso) {
    var lg = lang(), t = STR[lg], p = iso.split('-');
    var d = parseInt(p[2], 10), mo = t.months[parseInt(p[1], 10) - 1], y = p[0];
    return lg === 'en' ? (mo + ' ' + d + ', ' + y) : (d + ' ' + mo + ' ' + y);
  }
  function renderDates() {
    var t = STR[lang()];
    elContent.innerHTML = '<h4 class="rmodal__h">' + esc(t.pick_date) + '</h4>' +
      '<p class="rmodal__sub">' + esc(t.pick_date_sub) + '</p>' +
      '<div class="rmodal__cal" id="rmodalCal"><p class="rmodal__state">' + esc(t.loading) + '</p></div>';
    ensureAvail(state.pkg).then(function (list) {
      var avail = list.filter(function (d) { return d.status !== 'sold_out'; });
      if (!list.length) { document.getElementById('rmodalCal').innerHTML = '<p class="rmodal__state">' + esc(t.no_dates) + '</p>'; return; }
      if (!state.cal) {
        var first = (avail[0] || list[0]).date.split('-');
        state.cal = { y: parseInt(first[0], 10), m: parseInt(first[1], 10) - 1 };
      }
      drawCalendar();
    });
  }
  function monthRange() {
    var isos = (availCache[state.pkg] || []).map(function (d) { return d.date; }).filter(Boolean).sort();
    if (!isos.length) return null;
    function ym(iso) { var p = iso.split('-'); return { y: +p[0], m: +p[1] - 1 }; }
    return { min: ym(isos[0]), max: ym(isos[isos.length - 1]) };
  }
  function drawCalendar() {
    var lg = lang(), t = STR[lg], cal = state.cal, box = document.getElementById('rmodalCal');
    var y = cal.y, m = cal.m;
    var firstDow = (new Date(y, m, 1).getDay() + 6) % 7; // Lunes=0
    var days = new Date(y, m + 1, 0).getDate();
    var range = monthRange();
    var canPrev = range && (y > range.min.y || (y === range.min.y && m > range.min.m));
    var canNext = range && (y < range.max.y || (y === range.max.y && m < range.max.m));

    var cells = '';
    for (var i = 0; i < firstDow; i++) cells += '<span class="rmodal__day rmodal__day--pad"></span>';
    for (var d = 1; d <= days; d++) {
      var iso = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      var info = availByIso[iso];
      if (info && info.status !== 'sold_out') {
        var sel = state.dateId === info.id ? ' is-sel' : '';
        var low = info.status === 'low_availability' ? ' rmodal__day--low' : '';
        cells += '<button type="button" class="rmodal__day rmodal__day--open' + low + sel + '" data-iso="' + iso + '">' +
          d + '<i>' + info.spotsLeft + '</i></button>';
      } else if (info && info.status === 'sold_out') {
        cells += '<span class="rmodal__day rmodal__day--sold">' + d + '</span>';
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
      '<div class="rmodal__grid">' + cells + '</div>' +
      '<p class="rmodal__callegend"><i class="lg lg--open"></i>' + esc(t.spots_left) +
        ' &nbsp; <i class="lg lg--sold"></i>' + esc(t.soldout) + '</p>';

    box.querySelector('[data-cal-prev]').addEventListener('click', function () { if (m === 0) { cal.y--; cal.m = 11; } else cal.m--; drawCalendar(); });
    box.querySelector('[data-cal-next]').addEventListener('click', function () { if (m === 11) { cal.y++; cal.m = 0; } else cal.m++; drawCalendar(); });
    box.querySelectorAll('[data-iso]').forEach(function (b) {
      b.addEventListener('click', function () {
        var info = availByIso[b.getAttribute('data-iso')];
        state.dateId = info.id; state.dateObj = info;
        if (state.qty > info.spotsLeft) state.qty = info.spotsLeft;
        drawCalendar(); renderCart();
      });
    });
  }

  /* ---- Paso 2: Boletos ---- */
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
      '<p class="rmodal__sub rmodal__sub--c">' + (state.dateObj ? (state.dateObj.spotsLeft + ' ' + t.spots_left) : '') + '</p>';
    elContent.querySelector('[data-dec]').addEventListener('click', function () { if (state.qty > 1) { state.qty--; document.getElementById('rmodalQty').textContent = state.qty; renderCart(); } });
    elContent.querySelector('[data-inc]').addEventListener('click', function () { if (state.qty < max) { state.qty++; document.getElementById('rmodalQty').textContent = state.qty; renderCart(); } });
  }

  /* ---- Paso 3: Datos ---- */
  function renderDetails() {
    var t = STR[lang()];
    elContent.innerHTML =
      '<h4 class="rmodal__h">' + esc(t.your_data) + '</h4>' +
      '<div class="rmodal__form">' +
        '<label class="rmodal__field"><span>' + esc(t.name) + '</span><input type="text" id="rf_name" autocomplete="name" value="' + esc(state.name) + '"></label>' +
        '<label class="rmodal__field"><span>' + esc(t.email) + '</span><input type="email" id="rf_email" autocomplete="email" value="' + esc(state.email) + '"></label>' +
        '<label class="rmodal__field"><span>' + esc(t.phone) + '</span><input type="tel" id="rf_phone" autocomplete="tel" value="' + esc(state.phone) + '"></label>' +
        '<p class="rmodal__err" id="rf_err" hidden></p>' +
        '<p class="rmodal__test">' + esc(t.test) + '</p>' +
      '</div>';
    ['name', 'email', 'phone'].forEach(function (f) {
      elContent.querySelector('#rf_' + f).addEventListener('input', function (e) { state[f] = e.target.value; });
    });
  }

  /* ---- Navegación ---- */
  function showErr(msg) {
    var box = elContent.querySelector('#rf_err') || elContent.querySelector('.rmodal__h');
    if (elContent.querySelector('#rf_err')) { box.textContent = msg; box.hidden = false; }
    else alert(msg);
  }
  function next() {
    var t = STR[lang()];
    if (state.step === 0) { if (!state.pkg) return showErr(t.err_pkg); state.step = 1; return render(); }
    if (state.step === 1) { if (!state.dateId) return showErr(t.err_date); state.step = 2; return render(); }
    if (state.step === 2) { state.step = 3; return render(); }
    if (state.step === 3) return submit();
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
      body: JSON.stringify({ package: state.pkg, dateId: state.dateId, quantity: state.qty, name: state.name.trim(), email: state.email.trim(), phone: state.phone.trim() })
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok && res.j.url) { window.location.href = res.j.url; return; }
        showErr(res.j.error || t.pay_err); btnNext.disabled = false; btnNext.textContent = t.pay;
      })
      .catch(function () { showErr(t.pay_err); btnNext.disabled = false; btnNext.textContent = t.pay; });
  }

  // Re-render al cambiar idioma
  new MutationObserver(function () { if (!modal.hidden) render(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  /* ---- Disparadores ---- */
  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('.js-reserve');
    if (!trigger) return;
    e.preventDefault();
    open({ package: trigger.getAttribute('data-package') });
  });

  window.TuldaReserve = { open: open };
})();
