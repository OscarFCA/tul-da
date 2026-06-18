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

  /* ---- Parallax sutil de la luna ---- */
  var moon = document.querySelector('[data-parallax]');
  if (moon && !reduce) {
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      if (y < window.innerHeight) moon.style.transform = 'translateY(' + (y * 0.18) + 'px)';
    }, { passive: true });
  }
})();
