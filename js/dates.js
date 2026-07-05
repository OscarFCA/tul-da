/* ====================================================================
   TUL - DÁ — Selector de fechas con disponibilidad en tiempo real.
   Consume el backend (/api/availability) — la BD (Airtable) es la única
   fuente de verdad. Estados: open / low_availability / sold_out.
   Modo prueba: la reserva apunta a un Payment Link de Stripe de $10 MXN.
   ==================================================================== */
(function () {
  'use strict';

  var root = document.getElementById('datesLive');
  if (!root) return;
  var body = document.getElementById('datesBody');
  var testNote = document.getElementById('datesTestNote');
  var API = root.getAttribute('data-api');
  var TEST_LINK = root.getAttribute('data-test-link');

  var STR = {
    es: {
      spots: 'lugares', reserve: 'Reservar', last: 'Últimos lugares',
      soldout: 'Agotado', empty: 'Pronto anunciamos nuevas fechas.',
      error: 'No pudimos cargar las fechas. Intenta de nuevo en un momento.'
    },
    en: {
      spots: 'spots', reserve: 'Reserve', last: 'Last spots',
      soldout: 'Sold out', empty: 'New dates coming soon.',
      error: "We couldn't load the dates. Please try again shortly."
    }
  };
  var MONTHS = {
    es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  };

  function lang() { return document.documentElement.lang === 'en' ? 'en' : 'es'; }

  function fmtDate(iso, lg) {
    // "2026-11-15" → es "15 nov 2026" · en "Nov 15, 2026"
    if (!iso) return '';
    var p = iso.split('-');
    if (p.length !== 3) return iso;
    var y = p[0], m = parseInt(p[1], 10) - 1, d = parseInt(p[2], 10);
    var mo = MONTHS[lg][m] || p[1];
    return lg === 'en' ? (mo + ' ' + d + ', ' + y) : (d + ' ' + mo + ' ' + y);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var data = null; // cache de la última respuesta para re-render al cambiar idioma

  function render() {
    if (!data) return;
    var lg = lang(), t = STR[lg];

    if (!data.length) {
      body.innerHTML = '<p class="dates__state">' + esc(t.empty) + '</p>';
      if (testNote) testNote.hidden = true;
      return;
    }

    var anyOpen = false;
    var rows = data.map(function (dt) {
      var pkg = (dt.packageNames && dt.packageNames.length)
        ? dt.packageNames.join(' · ')
        : (dt.label || '');
      var dateStr = esc(fmtDate(dt.date, lg));

      if (dt.status === 'sold_out') {
        return '' +
          '<div class="dates__row dates__row--sold" aria-disabled="true">' +
            '<span class="dates__date">' + dateStr + '</span>' +
            '<span class="dates__pkg">' + esc(pkg) + '</span>' +
            '<span class="dates__spots dates__spots--sold">' + esc(t.soldout) + '</span>' +
          '</div>';
      }

      anyOpen = true;
      var low = dt.status === 'low_availability';
      var spotsCls = 'dates__spots' + (low ? ' dates__spots--low' : '');
      var lastTag = low ? '<span class="dates__last">' + esc(t.last) + '</span>' : '';
      // La reserva lleva el contexto de fecha/paquete en la URL (para trazabilidad).
      var href = TEST_LINK +
        (TEST_LINK.indexOf('?') > -1 ? '&' : '?') +
        'client_reference_id=' + encodeURIComponent(dt.id);
      return '' +
        '<a class="dates__row dates__row--link" href="' + href + '">' +
          '<span class="dates__date">' + dateStr + lastTag + '</span>' +
          '<span class="dates__pkg">' + esc(pkg) + '</span>' +
          '<span class="' + spotsCls + '">' +
            '<b>' + esc(dt.spotsLeft) + '</b> <i>' + esc(t.spots) + '</i>' +
            '<span class="dates__reserve">' + esc(t.reserve) + ' →</span>' +
          '</span>' +
        '</a>';
    }).join('');

    body.innerHTML = rows;
    if (testNote) testNote.hidden = !anyOpen;
  }

  function load() {
    fetch(API + '/api/availability')
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { data = (j.dates || []); render(); })
      .catch(function () {
        body.innerHTML = '<p class="dates__state dates__state--err">' + esc(STR[lang()].error) + '</p>';
      });
  }

  // Re-render al cambiar el idioma (el i18n cambia html[lang]).
  new MutationObserver(function () { render(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  load();
})();
