/* TUL - DÁ — interacciones */
(function () {
  'use strict';

  /* ---- Nav: fondo al hacer scroll ---- */
  var nav = document.querySelector('.nav');
  function onScroll() {
    if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 40);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---- Drawer móvil ---- */
  var toggle = document.getElementById('navToggle');
  var drawer = document.getElementById('navDrawer');
  var backdrop = document.getElementById('navBackdrop');
  var closeBtn = document.getElementById('navClose');

  function openDrawer() {
    drawer.classList.add('open'); backdrop.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    drawer.classList.remove('open'); backdrop.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  if (toggle) toggle.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);
  if (drawer) drawer.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeDrawer); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });

  /* ---- Reveal on scroll ---- */
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var reveals = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('visible'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---- Tarjeta dual Cenote / Laguna ----
     Gira sola entre las dos sedes; al hacer clic en uno de los dos nombres
     el usuario elige y el giro automático se detiene. */
  document.querySelectorAll('.exp--dual').forEach(function (card) {
    var timer = null, chosen = false;

    function setFace(showB) {
      card.classList.toggle('is-face-b', showB);
      card.querySelectorAll('[data-face]').forEach(function (btn) {
        btn.setAttribute('aria-pressed', String((btn.getAttribute('data-face') === 'b') === showB));
      });
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function start() {
      if (reduce || chosen || timer) return;
      timer = setInterval(function () { setFace(!card.classList.contains('is-face-b')); }, 5500);
    }

    card.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-face]');
      if (!btn) return;
      chosen = true;
      stop();
      setFace(btn.getAttribute('data-face') === 'b');
    });
    card.addEventListener('mouseenter', stop);
    card.addEventListener('mouseleave', start);

    start();
  });

  /* ---- Parallax sutil de la luna ---- */
  var moon = document.querySelector('[data-parallax]');
  if (moon && !reduce) {
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      if (y < window.innerHeight) moon.style.transform = 'translateY(' + (y * 0.18) + 'px)';
    }, { passive: true });
  }
})();
