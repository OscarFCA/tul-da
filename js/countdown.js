/* ====================================================================
   TUL - DÁ — Cuenta regresiva a la próxima salida.
   Agrupa por fecha de salida y muestra los 3 paquetes con sus lugares.
   El usuario elige el paquete desde el inicio. Urgencia por paquete.
   Poll en tiempo real: si TODA la salida se agota → animación SOLD OUT y
   salta a la siguiente. Sin próximas fechas → aviso.
   Mini flotante (abajo-izquierda) refleja el paquete seleccionado.
   ==================================================================== */
(function () {
  'use strict';

  var root = document.getElementById('countdown');
  if (!root) return;
  var API = root.getAttribute('data-api');
  var PKG_ORDER = ['Classic', 'Premium', 'VIP'];

  var STR = {
    es: {
      units: ['Días', 'Horas', 'Min', 'Seg'],
      route: 'Mérida → Tulum',
      choose: 'Elige tu paquete',
      seats: 'lugares', seat1: 'lugar', full: 'Agotado',
      reserve: function (p) { return 'Reservar' + (p ? ' · ' + p : ''); },
      mini_label: 'Próxima salida', mini_reserve: 'Reservar',
      soldout: 'AGOTADO',
      none_t: 'Muy pronto, nuevas fechas',
      none_b: 'Estamos preparando la próxima salida. Escríbenos por WhatsApp y te avisamos primero.',
      none_cta: 'Quiero enterarme',
      loading: 'Cargando próxima salida…'
    },
    en: {
      units: ['Days', 'Hours', 'Min', 'Sec'],
      route: 'Mérida → Tulum',
      choose: 'Choose your package',
      seats: 'spots', seat1: 'spot', full: 'Sold out',
      reserve: function (p) { return 'Reserve' + (p ? ' · ' + p : ''); },
      mini_label: 'Next departure', mini_reserve: 'Reserve',
      soldout: 'SOLD OUT',
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
  function fmtRange(start, end) {
    return (end && end !== start) ? (fmtDate(start) + ' – ' + fmtDate(end)) : fmtDate(start);
  }
  function urgency(n) {
    if (n <= 0) return { cls: 'is-out' };
    if (n <= 2) return { cls: 'is-critical' };
    if (n <= 5) return { cls: 'is-low' };
    return { cls: '' };
  }

  var deps = [];       // salidas futuras con al menos un paquete reservable
  var cur = null;      // salida actual { date, packages: [{key,id,spotsLeft,status}] }
  var sel = null;      // paquete seleccionado (key)
  var tick = null, poll = null, animating = false;

  // Mini flotante (esquina inferior izquierda).
  var mini = document.createElement('div');
  mini.className = 'cd-mini';
  document.body.appendChild(mini);
  var proximaSec = null;
  function onScroll() {
    if (!proximaSec) proximaSec = document.getElementById('proxima');
    var r = proximaSec ? proximaSec.getBoundingClientRect() : { bottom: 9999 };
    var show = cur && !animating && r.bottom < 80;
    mini.classList.toggle('is-shown', !!show);
    document.body.classList.toggle('cd-mini-on', !!show);
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // Agrupa las fechas por salida (date) → {date, packages[]}. Solo futuras con
  // al menos un paquete reservable. Mantiene los agotados para mostrarlos.
  function group(dates) {
    var now = new Date(), byDate = {};
    (dates || []).forEach(function (d) {
      if (!d.date) return;
      var key = (d.packageNames && d.packageNames[0]) || '?';
      (byDate[d.date] = byDate[d.date] || []).push({ key: key, id: d.id, spotsLeft: d.spotsLeft, status: d.status, endDate: d.endDate });
    });
    return Object.keys(byDate)
      .filter(function (date) { return target(date) > now; })
      .sort()
      .map(function (date) {
        var pk = byDate[date].sort(function (a, b) { return PKG_ORDER.indexOf(a.key) - PKG_ORDER.indexOf(b.key); });
        return { date: date, endDate: pk[0].endDate, packages: pk };
      })
      .filter(function (dep) { return dep.packages.some(function (p) { return p.spotsLeft > 0 && p.status !== 'sold_out'; }); });
  }
  function firstBookable(dep) {
    var p = dep && dep.packages.filter(function (x) { return x.spotsLeft > 0 && x.status !== 'sold_out'; })[0];
    return p ? p.key : null;
  }

  function fetchAvail() { return fetch(API + '/api/availability').then(function (r) { return r.json(); }).then(function (j) { return j.dates || []; }); }

  function load() {
    root.innerHTML = '<p class="cd__state">' + esc(STR[lang()].loading) + '</p>';
    fetchAvail().then(function (dates) {
      deps = group(dates);
      cur = deps[0] || null;
      sel = firstBookable(cur);
      render();
    }).catch(renderNone);
  }

  function render() {
    clearInterval(tick);
    if (!cur) { renderNone(); return; }
    var t = STR[lang()];
    root.classList.remove('is-none', 'is-sellingout');
    root.classList.add('is-active');
    root.innerHTML =
      '<div class="cd__top">' +
        '<span class="cd__route">' + esc(t.route) + '</span>' +
        '<span class="cd__date">' + esc(fmtRange(cur.date, cur.endDate)) + '</span>' +
      '</div>' +
      '<div class="cd__clock" id="cdClock">' +
        t.units.map(function (label, i) {
          return '<div class="cd__unit"><b data-u="' + i + '">00</b><i>' + esc(label) + '</i></div>' + (i < 3 ? '<span class="cd__sep">:</span>' : '');
        }).join('') +
      '</div>' +
      '<div class="cd__choose">' + esc(t.choose) + '</div>' +
      '<div class="cd__pkgs" id="cdPkgs"></div>' +
      '<div id="cdCta"></div>';
    startTick();
    paint();
  }

  // Pinta paquetes + CTA + mini (sin reiniciar el reloj).
  function paint() {
    if (!cur) return;
    var t = STR[lang()];
    var pkgsEl = document.getElementById('cdPkgs');
    var ctaEl = document.getElementById('cdCta');
    if (pkgsEl) {
      pkgsEl.innerHTML = cur.packages.map(function (p) {
        var u = urgency(p.spotsLeft);
        var out = p.spotsLeft <= 0 || p.status === 'sold_out';
        var seatTxt = out ? esc(t.full)
          : '<b>' + p.spotsLeft + '</b> ' + esc(p.spotsLeft === 1 ? t.seat1 : t.seats);
        return '<button type="button" class="cd__pkg ' + u.cls + (sel === p.key ? ' is-sel' : '') + (out ? ' is-disabled' : '') + '"' +
          (out ? ' disabled' : '') + ' data-pkgkey="' + esc(p.key) + '">' +
          '<span class="cd__pkg-name">' + esc(p.key) + '</span>' +
          '<span class="cd__pkg-spots"><span class="cd__dot"></span>' + seatTxt + '</span>' +
        '</button>';
      }).join('');
      pkgsEl.querySelectorAll('[data-pkgkey]').forEach(function (b) {
        if (b.disabled) return;
        b.addEventListener('click', function () { sel = b.getAttribute('data-pkgkey'); paint(); });
      });
    }
    if (ctaEl) {
      var selPkg = cur.packages.filter(function (p) { return p.key === sel; })[0];
      var canBuy = selPkg && selPkg.spotsLeft > 0;
      ctaEl.innerHTML = '<button type="button" class="btn cd__cta"' + (canBuy ? '' : ' disabled') + '>' + esc(t.reserve(canBuy ? sel : '')) + '</button>';
      var btn = ctaEl.querySelector('.cd__cta');
      if (btn && canBuy) btn.addEventListener('click', function () { if (window.TuldaReserve) window.TuldaReserve.open({ package: sel, dateId: selPkg.id }); });
    }
    renderMini();
  }

  function renderMini() {
    if (!cur) { mini.classList.remove('is-shown'); return; }
    var t = STR[lang()];
    var selPkg = cur.packages.filter(function (p) { return p.key === sel; })[0];
    var u = urgency(selPkg ? selPkg.spotsLeft : 0);
    var seatTxt = (selPkg && selPkg.spotsLeft > 0)
      ? '<b>' + selPkg.spotsLeft + '</b> ' + esc(selPkg.spotsLeft === 1 ? t.seat1 : t.seats) : esc(t.full);
    mini.innerHTML =
      '<span class="cd-mini__label">' + esc(t.mini_label) + (sel ? ' · ' + esc(sel) : '') + '</span>' +
      '<span class="cd-mini__date">' + esc(fmtRange(cur.date, cur.endDate)) + '</span>' +
      '<span class="cd-mini__time" id="cdMiniTime">—</span>' +
      '<span class="cd-mini__spots ' + u.cls + '"><span class="cd__dot"></span>' + seatTxt + '</span>' +
      '<button type="button" class="cd-mini__cta"' + (selPkg && selPkg.spotsLeft > 0 ? '' : ' disabled') + '>' + esc(t.mini_reserve) + '</button>';
    var mb = mini.querySelector('.cd-mini__cta');
    if (mb && selPkg && selPkg.spotsLeft > 0) mb.addEventListener('click', function () { if (window.TuldaReserve) window.TuldaReserve.open({ package: sel, dateId: selPkg.id }); });
    updateClock();
    onScroll();
  }

  function renderNone() {
    clearInterval(tick);
    mini.classList.remove('is-shown');
    document.body.classList.remove('cd-mini-on');
    var t = STR[lang()];
    root.classList.remove('is-active', 'is-sellingout');
    root.classList.add('is-none');
    root.innerHTML =
      '<div class="cd__none">' +
        '<span class="cd__none-icon">✦</span>' +
        '<h3 class="cd__none-t">' + esc(t.none_t) + '</h3>' +
        '<p class="cd__none-b">' + esc(t.none_b) + '</p>' +
        '<a class="btn" href="https://wa.me/525530171203?text=Hola%2C%20quiero%20que%20me%20avisen%20de%20las%20pr%C3%B3ximas%20fechas%20de%20Tul-D%C3%A1" target="_blank" rel="noopener">' + esc(t.none_cta) + '</a>' +
      '</div>';
  }

  function startTick() { clearInterval(tick); updateClock(); tick = setInterval(updateClock, 1000); }
  function two(n) { return (n < 10 ? '0' : '') + n; }
  function updateClock() {
    if (!cur) return;
    var diff = target(cur.date) - new Date();
    if (diff <= 0) { load(); return; }
    var s = Math.floor(diff / 1000);
    var vals = [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
    var clock = document.getElementById('cdClock');
    if (clock) clock.querySelectorAll('[data-u]').forEach(function (el, i) { var v = two(vals[i]); if (el.textContent !== v) el.textContent = v; });
    var miniT = document.getElementById('cdMiniTime');
    if (miniT) miniT.textContent = vals[0] + 'd ' + two(vals[1]) + ':' + two(vals[2]) + ':' + two(vals[3]);
  }

  // Poll: actualiza lugares por paquete; si TODA la salida se agota → SOLD OUT.
  function refresh() {
    if (animating) return;
    fetchAvail().then(function (dates) {
      var fresh = group(dates);
      if (!cur) { deps = fresh; cur = fresh[0] || null; sel = firstBookable(cur); render(); return; }
      var same = fresh.filter(function (d) { return d.date === cur.date; })[0];
      if (!same) { deps = fresh; playSoldOut(fresh.filter(function (d) { return d.date !== cur.date; })[0] || null); return; }
      cur.packages = same.packages;
      if (!cur.packages.some(function (p) { return p.spotsLeft > 0; })) {
        deps = fresh;
        playSoldOut(fresh.filter(function (d) { return d.date !== cur.date; })[0] || null);
      } else {
        var selPkg = cur.packages.filter(function (p) { return p.key === sel; })[0];
        if (!selPkg || selPkg.spotsLeft <= 0) sel = firstBookable(cur); // el elegido se agotó → re-elegir
        paint();
      }
    }).catch(function () {});
  }

  function playSoldOut(next) {
    animating = true;
    clearInterval(tick);
    mini.classList.remove('is-shown');
    var t = STR[lang()];
    var stamp = document.createElement('div');
    stamp.className = 'cd__soldout';
    stamp.innerHTML = '<span>' + esc(t.soldout) + '</span>';
    root.appendChild(stamp);
    root.classList.add('is-sellingout');
    setTimeout(function () {
      animating = false;
      cur = next;
      sel = firstBookable(cur);
      render();
    }, 2800);
  }

  new MutationObserver(function () { if (cur) render(); else renderNone(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  load();
  poll = setInterval(refresh, 30000);
})();
