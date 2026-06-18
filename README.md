# Tul - Dá — Landing

> *More Than a Trip, It's a Vibe* — Experiencias curadas Mérida → Tulum, by Guru Davar.

Landing de conversión para **Tul - Dá**, producto de lifestyle de viajes curados de lujo
en la ruta Mérida → Tulum creado por Ricardo Davar (Guru Davar).

🔗 **GitHub Pages:** https://oscarfca.github.io/tul-da/

## Stack

Sitio 100 % estático — sin frameworks ni build step.

- `index.html` — landing completa (hero, propuesta, paquetes, experiencias, proceso, fechas, Guru Davar, footer)
- `css/styles.css` — sistema de diseño del brandbook (Obsidian + Ritual Gold · Cormorant Garamond + Montserrat)
- `js/i18n.js` — traducción ES / EN con la voz de marca (toggle en el nav, persistente, `?lang=en`)
- `js/main.js` — nav sticky, drawer móvil, reveal on scroll, parallax de la luna
- `assets/img/` — imágenes en `.webp` responsive (`srcset`)
- `assets/video/hero.mp4` — video de fondo del hero (**sin pista de audio**, optimizado)
- `assets/logo/` — logotipo con **fondo transparente** (`.webp` / `.png`) e iconos

## SEO / SEM

- Meta tags, Open Graph y Twitter Cards completos
- `hreflang` ES / EN / x-default
- Datos estructurados JSON-LD (`TravelAgency` + `Offer` por paquete + `Person` Guru Davar)
- `sitemap.xml`, `robots.txt`, `site.webmanifest`, favicons, `404.html`
- HTML semántico con `aria-labelledby` por sección, `alt` descriptivos, navegación por teclado
- Imágenes WebP responsive (~110 MB de PNG → ~2.3 MB), `loading="lazy"`, `width/height`
- Video hero ~2 MB, `prefers-reduced-motion` respetado

## Desarrollo local

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

## Pendiente (handoff a Ricardo / Elías)

- **WhatsApp real:** hoy los CTA de reserva abren `mailto:hola@tulda.mx`. Sustituir por
  `https://wa.me/<número>` cuando exista la línea de Tul - Dá.
- **Instagram / TikTok:** los enlaces sociales apuntan a los dominios genéricos; poner los handles reales.
- **Fechas dinámicas (Fase 2):** la tabla de fechas es estática. Conectar a Airtable + Stripe según `Project.md`.
- **Dominio:** si se publica en `tulda.mx`, actualizar las URLs canónicas y de OG.

---

© 2026 Tul - Dá · by Guru Davar · Mérida → Tulum
