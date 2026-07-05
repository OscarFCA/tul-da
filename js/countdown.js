/* ====================================================================
   TUL - DÁ — Cuenta regresiva a la próxima salida.
   Toma la fecha reservable más cercana (disponibilidad real de Airtable),
   cuenta hacia atrás, muestra lugares con urgencia creciente. Al agotarse
   (poll en tiempo real) reproduce animación SOLD OUT y salta a la siguiente.
   Sin próximas fechas → aviso "pronto nuevas fechas".
   ==================================================================== */
(function () {
  'use strict';

  var root = document.getElementById('countdown');
  if (!root) return;
  var API = root.getAttribute('data-api');

  var STR = {
    es: {
      units: ['Días', 'Horas', 'Min', 'Seg'],
      route: 'Mérida → Tulum',
      spots: function (n) { return 'Quedan ' + n + (n === 1 ? ' lugar' : ' lugares'); },
      last: function (n) { return '¡Últimos ' + n + '! Casi lleno'; },
      almost: function (n) { return n === 1 ? '¡Último lugar!' : '¡Solo ' + n + ' lugares!'; },
      reserve: 'Reservar mi lugar',
      soldout: 'AGOTADO',
      soldout_msg: 'Esta salida se llenó. Siguiente fecha:',
      none_t: 'Muy pronto, nuevas fechas',
      none_b: 'Estamos preparando la próxima salida. Escríbenos por WhatsApp y te avisamos primero.',
      none_cta: 'Quiero enterarme',
      loading: 'Cargando próxima salida…'
    },
    en: {
      units: ['Days', 'Hours', 'Min', 'Sec'],
      route: 'Mérida → Tulum',
      spots: function (n) { return n + (n === 1 ? ' spot left' : ' spots left'); },
      last: function (n) { return 'Only ' + n + ' left! Almost full'; },
      almost: function (n) { return n === 1 ? 'Last spot!' : 'Only ' + n + ' spots!'; },
      reserve: 'Reserve my spot',
      soldout: 'SOLD OUT',
      soldout_msg: 'This departure filled up. Next date:',
      none_t: 'New dates coming very soon',
      none_b: 'We’re preparing the next departure. Message us on WhatsApp and we’ll tell you first.',
      none_cta: 'Keep me posted',
      loading: 'Loading next departure…'
    }
  };
  var MONTHS = {
    es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  };
  function lang() { return document.documentElement.lang === 'en' ? 'en' : 'es'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function target(iso) { return new Date(iso + 'T00:00:00'); }
  function fmtDate(iso) {
    var lg = lang(), p = iso.split('-');
    var mo = MONTHS[lg][parseInt(p[1], 10) - 1];
    return lg === 'en' ? (mo + ' ' + parseInt(p[2], 10)) : (parseInt(p[2], 10) + ' ' + mo);
  }

  var list = [];       // próximas reservables ordenadas
  var cur = null;      // fecha actual mostrada
  var tick = null;
  var poll = null;
  var animating = false;

  function upcoming(dates) {
    var now = new Date();
    return (dates || [])
      .filter(function (d) { return d.status !== 'sold_out' && d.spotsLeft > 0 && d.date && target(d.date) > now; })
      .sort(function (a, b) { return a.date.localeCompare(b.date); });
  }

  function urgency(n) {
    if (n <= 2) return { cls: 'is-critical', txt: STR[lang()].almost(n) };
    if (n <= 5) return { cls: 'is-low', txt: STR[lang()].last(n) };
    return { cls: '', txt: STR[lang()].spots(n) };
  }

  function fetchAvail() {
    return fetch(API + '/api/availability').then(function (r) { return r.json(); }).then(function (j) { return j.dates || []; });
  }

  function load() {
    root.innerHTML = '<p class="cd__state">' + esc(STR[lang()].loading) + '</p>';
    fetchAvail().then(function (dates) {
      list = upcoming(dates);
      cur = list[0] || null;
      render();
    }).catch(function () { renderNone(); });
  }

  function render() {
    clearInterval(tick);
    if (!cur) { renderNone(); return; }
    var t = STR[lang()], u = urgency(cur.spotsLeft);
    var pkg = (cur.packageNames && cur.packageNames[0]) || '';
    root.className = 'countdown reveal is-active';
    root.innerHTML =
      '<div class="cd__top">' +
        '<span class="cd__route">' + esc(t.route) + '</span>' +
        '<span class="cd__date">' + esc(fmtDate(cur.date)) + (pkg ? ' · ' + esc(pkg) : '') + '</span>' +
      '</div>' +
      '<div class="cd__clock" id="cdClock">' +
        t.units.map(function (label, i) {
          return '<div class="cd__unit"><b data-u="' + i + '">00</b><i>' + esc(label) + '</i></div>' +
            (i < 3 ? '<span class="cd__sep">:</span>' : '');
        }).join('') +
      '</div>' +
      '<div class="cd__spots ' + u.cls + '"><span class="cd__dot"></span>' + esc(u.txt) + '</div>' +
      '<button type="button" class="btn cd__cta js-reserve" data-package="' + esc(pkg) + '" data-date-id="' + esc(cur.id) + '">' + esc(t.reserve) + '</button>';
    // El CTA abre el modal con paquete + fecha preseleccionados.
    root.querySelector('.cd__cta').addEventListener('click', function (e) {
      e.preventDefault();
      if (window.TuldaReserve) window.TuldaReserve.open({ package: pkg, dateId: cur.id });
    });
    startTick();
  }

  function renderNone() {
    clearInterval(tick);
    var t = STR[lang()];
    root.className = 'countdown reveal is-none';
    root.innerHTML =
      '<div class="cd__none">' +
        '<span class="cd__none-icon">✦</span>' +
        '<h3 class="cd__none-t">' + esc(t.none_t) + '</h3>' +
        '<p class="cd__none-b">' + esc(t.none_b) + '</p>' +
        '<a class="btn" href="https://wa.me/525530171203?text=Hola%2C%20quiero%20que%20me%20avisen%20de%20las%20pr%C3%B3ximas%20fechas%20de%20Tul-D%C3%A1" target="_blank" rel="noopener">' + esc(t.none_cta) + '</a>' +
      '</div>';
  }

  function startTick() {
    clearInterval(tick);
    updateClock();
    tick = setInterval(updateClock, 1000);
  }
  function two(n) { return (n < 10 ? '0' : '') + n; }
  function updateClock() {
    if (!cur) return;
    var diff = target(cur.date) - new Date();
    if (diff <= 0) { load(); return; } // la fecha llegó → recalcular
    var s = Math.floor(diff / 1000);
    var vals = [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
    var clock = document.getElementById('cdClock');
    if (!clock) return;
    clock.querySelectorAll('[data-u]').forEach(function (el, i) {
      var v = two(vals[i]);
      if (el.textContent !== v) el.textContent = v;
    });
  }

  // Poll en tiempo real: si la fecha actual se agota → animación SOLD OUT → siguiente.
  function refresh() {
    if (animating) return;
    fetchAvail().then(function (dates) {
      var fresh = upcoming(dates);
      if (!cur) { list = fresh; cur = fresh[0] || null; render(); return; }
      var same = dates.filter(function (d) { return d.id === cur.id; })[0];
      if (!same || same.status === 'sold_out' || same.spotsLeft <= 0) {
        // se agotó la salida actual
        list = fresh;
        var next = fresh.filter(function (d) { return d.id !== cur.id; })[0] || null;
        playSoldOut(next);
      } else if (same.spotsLeft !== cur.spotsLeft) {
        cur.spotsLeft = same.spotsLeft; // actualizar urgencia sin reiniciar reloj
        var box = root.querySelector('.cd__spots');
        if (box) { var u = urgency(cur.spotsLeft); box.className = 'cd__spots ' + u.cls; box.innerHTML = '<span class="cd__dot"></span>' + esc(u.txt); }
      }
    }).catch(function () {});
  }

  function playSoldOut(next) {
    animating = true;
    clearInterval(tick);
    var t = STR[lang()];
    var stamp = document.createElement('div');
    stamp.className = 'cd__soldout';
    stamp.innerHTML = '<span>' + esc(t.soldout) + '</span>';
    root.appendChild(stamp);
    root.classList.add('is-sellingout');
    setTimeout(function () {
      animating = false;
      cur = next;
      render(); // muestra la siguiente fecha, o "sin fechas" si next es null
    }, 2800);
  }

  // Re-render al cambiar idioma.
  new MutationObserver(function () { if (cur) render(); else renderNone(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  load();
  poll = setInterval(refresh, 30000);
})();
