/* FINORA · utilidades compartidas */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => 'S/ ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ---------- Configuración (EDITA AQUÍ) ---------- */
const CONFIG = {
  whatsapp: '51999999999',     // tu WhatsApp con código de país, sin + ni espacios
  yape: '999 999 999',
  plin: '999 999 999',
  payee: 'FINORA',
  freeShippingFrom: 150,
  shippingCost: 12
};

/* ---------- "API" local: lee el catálogo de js/data.js (sin servidor) ---------- */
async function api(url) {
  const u = new URL(url, 'http://x');
  const p = u.pathname, q = u.searchParams;
  const fail = (m, s) => { const e = new Error(m); e.status = s; throw e; };
  const live = PRODUCTS.filter(x => x.stock !== undefined);
  if (p === '/api/categories') {
    const m = {}; live.forEach(x => m[x.category] = (m[x.category] || 0) + 1);
    return Object.keys(m).sort().map(n => ({ name: n, count: m[n] }));
  }
  if (p === '/api/products') {
    const cat = q.get('category'), s = (q.get('q') || '').toLowerCase(), feat = q.get('featured'), sort = q.get('sort');
    let r = live.filter(x => (!cat || x.category === cat) && (!feat || x.featured) && (!s || (x.name + ' ' + x.description).toLowerCase().includes(s)));
    const by = {
      precio_asc: (a, b) => a.price - b.price, precio_desc: (a, b) => b.price - a.price,
      populares: (a, b) => b.reviews - a.reviews, nuevos: (a, b) => b.id - a.id
    }[sort] || (feat ? (a, b) => a.id - b.id : (a, b) => b.featured - a.featured || b.reviews - a.reviews);
    return r.sort(by);
  }
  const m = p.match(/^\/api\/products\/(\d+)$/);
  if (m) { const x = live.find(y => y.id === Number(m[1])); return x || fail('Producto no encontrado.', 404); }
  return fail('No disponible en la versión HTML.', 404);
}

function waLink(text) { return 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(text); }

/* ---------- Carrito (guardado en el navegador) ---------- */
const Cart = {
  get() { try { return JSON.parse(localStorage.getItem('finora_cart')) || []; } catch { return []; } },
  save(c) { localStorage.setItem('finora_cart', JSON.stringify(c)); Cart.updateBadge(); },
  count() { return Cart.get().reduce((a, i) => a + i.qty, 0); },
  add(id, qty = 1, max = 20) {
    const c = Cart.get(); const it = c.find(i => i.id === id);
    if (it) it.qty = Math.min(max, it.qty + qty); else c.push({ id, qty: Math.min(max, qty) });
    Cart.save(c);
  },
  set(id, qty) { let c = Cart.get(); c = qty <= 0 ? c.filter(i => i.id !== id) : c.map(i => i.id === id ? { ...i, qty } : i); Cart.save(c); },
  clear() { Cart.save([]); },
  updateBadge() { const b = $('#cartCount'); if (b) { const n = Cart.count(); b.textContent = n; b.hidden = n === 0; } }
};

function toast(msg) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2400);
}

function stars(r, n) {
  const full = Math.round(r);
  return `<div class="stars" aria-label="${r} de 5">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= full ? 'on' : ''}">★</i>`).join('')}<small>(${n})</small></div>`;
}
const CART_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2.5l2.2 10.5h9.6L20 7H6.3"/><circle cx="9" cy="19" r="1.3"/><circle cx="17" cy="19" r="1.3"/></svg>';

function productCard(p) {
  const out = p.stock <= 0;
  return `<article class="card">
    <a class="ph" href="producto.html?id=${p.id}">${p.badge ? `<span class="tag">${esc(p.badge)}</span>` : ''}${out ? '<span class="tag out">Agotado</span>' : ''}<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy"></a>
    <h3><a href="producto.html?id=${p.id}">${esc(p.name)}</a></h3>
    <div class="row"><div><div class="price">${money(p.price)}</div>${stars(p.rating, p.reviews)}</div>
    <button class="add" data-add="${p.id}" data-stock="${p.stock}" aria-label="Agregar ${esc(p.name)} al carrito" ${out ? 'disabled' : ''}>${CART_SVG}</button></div>
  </article>`;
}
// Delegación: cualquier botón .add funciona en toda la web
document.addEventListener('click', e => {
  const b = e.target.closest('[data-add]'); if (!b || b.disabled) return;
  Cart.add(Number(b.dataset.add), 1, Number(b.dataset.stock) || 20);
  b.classList.add('done'); setTimeout(() => b.classList.remove('done'), 700);
  toast('Producto agregado al carrito');
});

/* ---------- Cabecera y pie ---------- */
const LOGO = '<span class="logo-txt"><b>FIN</b>ORA</span>';

function renderChrome(user) {
  const page = location.pathname.replace(/\/$/, '').replace('.html', '') || 'index.html';
  const act = (...p) => p.includes(page) ? 'active' : '';
  $('#site-header').innerHTML = `
  <div class="topbar"><div class="wrap"><span>Envíos a todo el Perú</span><span>Compra segura</span><span>Envío gratis desde S/ 150</span></div></div>
  <header class="site"><div class="wrap">
    <a href="index.html" class="logo" aria-label="FINORA inicio">${LOGO}</a>
    <nav class="main" id="nav">
      <a href="index.html" class="${act('index.html', 'index.html')}">Inicio</a>
      <a href="tienda.html" class="${act('tienda.html', 'producto.html')}">Tienda</a>
      <a href="nosotros.html" class="${act('nosotros.html')}">Nosotros</a>
      <a href="contacto.html" class="${act('contacto.html')}">Contacto</a>
    </nav>
    <div class="tools">
      <form class="search" action="tienda.html" role="search">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input type="search" name="q" placeholder="Buscar productos..." aria-label="Buscar productos">
      </form>
      <a class="icon-btn" href="carrito.html" aria-label="Carrito"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2.5l2.2 10.5h9.6L20 7H6.3"/><circle cx="9" cy="19" r="1.3"/><circle cx="17" cy="19" r="1.3"/></svg><span class="badge" id="cartCount">0</span></a>
      <button class="icon-btn burger" id="burger" aria-label="Menú"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
    </div></div></header>`;

  $('#site-footer').innerHTML = `
  <footer class="site"><div class="wrap">
    <div class="foot">
      <div><a href="index.html" class="logo">${LOGO}</a><p class="lema">Más que productos, es una forma de vida.</p>
        <div class="social">
          <a href="#" aria-label="Instagram"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r=".8" fill="currentColor"/></svg></a>
          <a href="#" aria-label="TikTok"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3v11.5a3.5 3.5 0 11-3.5-3.5"/><path d="M14 3c.4 2.6 2 4.2 5 4.5"/></svg></a>
          <a href="#" aria-label="YouTube"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M21.6 7.2a2.5 2.5 0 00-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 002.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 001.8 1.8C5.800 19 12 19 12 19s6.200 0 7.800-.4a2.500 2.500 0 001.800-1.800c.4-1.600.4-4.800.4-4.800s0-3.200-.4-4.800zM10 15V9l5.200 3z"/></svg></a>
        </div></div>
      <div><h4>Enlaces rápidos</h4><ul><li><a href="index.html">Inicio</a></li><li><a href="tienda.html">Tienda</a></li><li><a href="nosotros.html">Nosotros</a></li><li><a href="contacto.html">Contacto</a></li></ul></div>
      <div><h4>Categorías</h4><ul>${['Setup', 'Tecnología', 'Estudio', 'Trabajo', 'Finanzas', 'Accesorios'].map(c => `<li><a href="tienda.html?cat=${encodeURIComponent(c)}">${c}</a></li>`).join('')}</ul></div>
      <div class="news"><h4>Suscríbete a nuestro newsletter</h4><p>Sé el primero en enterarte de nuevos lanzamientos, ofertas y más.</p>
        <form id="newsForm"><input type="email" placeholder="Tu correo electrónico" aria-label="Tu correo electrónico" required><button type="submit" aria-label="Suscribirme"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16M14 6l6 6-6 6"/></svg></button></form></div>
    </div>
    <div class="legal"><span>© ${new Date().getFullYear()} FINORA. Todos los derechos reservados.</span><span>Términos y condiciones · Política de privacidad</span></div>
  </div></footer>`;

  $('#burger').addEventListener('click', () => $('#nav').classList.toggle('open'));
  $('#newsForm').addEventListener('submit', e => {
    e.preventDefault();
    const email = e.target.querySelector('input').value;
    window.open(waLink('Hola FINORA, quiero suscribirme al newsletter con este correo: ' + email), '_blank');
    e.target.innerHTML = '<p style="margin:0;color:#d9b483">¡Gracias por suscribirte!</p>';
  });
  Cart.updateBadge();
}

/* Cada página espera a Finora.ready para conocer al usuario */
const Finora = { user: null, config: CONFIG };
Finora.ready = Promise.resolve().then(() => renderChrome(null));
