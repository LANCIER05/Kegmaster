/* ===================================================
   js/app.js — Главная логика фронтенда
   Фото загружаются в Supabase Storage
   =================================================== */

const SUPABASE_URL = 'https://wbztjvisnaeqpobojtxf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndienRqdmlzbmFlcXBvYm9qdHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTUyMDIsImV4cCI6MjA5NzA5MTIwMn0.Gwe-MxA8Zza-eQTZUUc0-aagGvdB0pZoqyfl0Y793GA';

const CAT_ICONS = {
  'Пиво фасовка':        '🍺',
  'Пиво розлив':         '🍻',
  'Вода и напитки':      '💧',
  'Сухарики':            '🥨',
  'Чипсы':               '🥔',
  'Сладкое':             '🍬',
  'Снеки и закуски':     '🥜',
  'Рыба и морепродукты': '🐟',
  'Слабоалкогольные':    '🍹',
  'Безалкогольное пиво': '🥛',
  'Другое':              '📦',
};

// ── HELPERS ──────────────────────────────────────────
function daysLeft(expiryStr) {
  const now = new Date(); now.setHours(0,0,0,0);
  const exp = new Date(expiryStr); exp.setHours(0,0,0,0);
  return Math.round((exp - now) / 86400000);
}
function formatDate(str) {
  if (!str) return '—';
  const [y,m,d] = str.split('-');
  return `${d}.${m}.${y}`;
}
function getStatus(days) {
  if (days < 0)  return 'expired';
  if (days <= 3) return 'warning';
  return 'ok';
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,6);
}

// ── TOAST ─────────────────────────────────────────────
function toast(msg, type = 'ok') {
  const icons = { ok: '✅', err: '❌', info: '🍺' };
  const el = document.createElement('div');
  el.className = `toast t-${type}`;
  el.innerHTML = `<span>${icons[type]}</span> ${msg}`;
  document.getElementById('toastWrap').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── ЗАГРУЗКА ФОТО В SUPABASE STORAGE ─────────────────
async function uploadPhoto(file) {
  if (!file) return null;
  const ext = file.name.split('.').pop();
  const fileName = `${uid()}.${ext}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/photos/${fileName}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': file.type,
    },
    body: file,
  });
  if (!res.ok) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/photos/${fileName}`;
}

// ── API ───────────────────────────────────────────────
async function apiGet() {
  const r = await fetch('/api/products');
  return r.json();
}
async function apiPost(body) {
  const r = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}
async function apiPatch(body) {
  await fetch('/api/products', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
async function apiDelete(id) {
  await fetch('/api/products', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
}

// ── STATE ─────────────────────────────────────────────
let products = [];
let editingId = null;
let activeCategory = 'Все';
let selectedFile = null; // текущий выбранный файл фото

// ── RENDER ────────────────────────────────────────────
function renderStats() {
  const total   = products.length;
  const expired = products.filter(p => daysLeft(p.expiry) < 0).length;
  const warning = products.filter(p => { const d = daysLeft(p.expiry); return d >= 0 && d <= 3; }).length;
  const ok      = products.filter(p => daysLeft(p.expiry) > 3).length;
  document.getElementById('statsRow').innerHTML = `
    <div class="stat-card">
      <div class="stat-num">${total}</div>
      <div class="stat-lbl">Всего позиций</div>
    </div>
    <div class="stat-card s-danger">
      <div class="stat-num">${expired}</div>
      <div class="stat-lbl">Срок истёк</div>
    </div>
    <div class="stat-card s-warn">
      <div class="stat-num">${warning}</div>
      <div class="stat-lbl">До 3 дней</div>
    </div>
    <div class="stat-card s-ok">
      <div class="stat-num">${ok}</div>
      <div class="stat-lbl">В норме</div>
    </div>`;
}

function renderAlertBanner() {
  const expired = products.filter(p => daysLeft(p.expiry) < 0);
  const banner = document.getElementById('alertBanner');
  if (!expired.length) { banner.style.display = 'none'; return; }
  banner.style.display = 'block';
  banner.innerHTML = `<strong>🚨 Истёк срок у ${expired.length} позиций:</strong> ` +
    expired.map(p => `<b>${p.name}</b>`).join(' · ');
}

function renderCatTabs() {
  const cats = ['Все', ...new Set(products.map(p => p.category))];
  document.getElementById('catTabs').innerHTML = cats.map(c => {
    const icon = c === 'Все' ? '🏷️' : (CAT_ICONS[c] || '📦');
    const count = c === 'Все' ? products.length : products.filter(p => p.category === c).length;
    return `<div class="cat-tab ${activeCategory === c ? 'active' : ''}" data-cat="${c}">${icon} ${c} <span style="opacity:.55;font-size:11px">(${count})</span></div>`;
  }).join('');
  document.querySelectorAll('.cat-tab').forEach(el => {
    el.addEventListener('click', () => { activeCategory = el.dataset.cat; renderAll(); });
  });
}

function statusBadge(days) {
  if (days < 0)  return `<span class="badge badge-danger">⚠️ Истёк</span>`;
  if (days <= 3) return `<span class="badge badge-warn">⏳ ${days === 0 ? 'Сегодня' : days + ' дн.'}</span>`;
  return `<span class="badge badge-ok">✅ ${days} дн.</span>`;
}

function cardHtml(p) {
  const days   = daysLeft(p.expiry);
  const status = getStatus(days);
  const cls    = status === 'expired' ? 'c-expired' : status === 'warning' ? 'c-warn' : 'c-ok';
  const img    = p.photo
    ? `<img class="card-img" src="${p.photo}" alt="${p.name}" loading="lazy">`
    : `<div class="card-img-placeholder">${CAT_ICONS[p.category] || '🛒'}</div>`;
  return `
    <div class="card ${cls}">
      <div class="card-img-wrap">
        ${img}
        <div class="card-ribbon">
          ${statusBadge(days)}
          ${p.storage ? `<span class="badge badge-storage">${p.storage}</span>` : ''}
        </div>
      </div>
      <div class="card-body">
        <div class="card-cat">${CAT_ICONS[p.category] || ''} ${p.category}</div>
        <div class="card-name">${p.name}</div>
        <div class="card-meta">
          <div class="meta-row">
            <span class="meta-lbl">📅 До</span>
            <span class="meta-val${days < 0 ? ' red' : ''}">${formatDate(p.expiry)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-lbl">📦 Кол-во</span>
            <span class="meta-val">${p.qty} шт.</span>
          </div>
          ${p.price ? `<div class="meta-row"><span class="meta-lbl">💰 Цена</span><span class="meta-val">${p.price} ₽</span></div>` : ''}
          ${p.location ? `<div class="meta-row"><span class="meta-lbl">📍 Место</span><span class="meta-val">${p.location}</span></div>` : ''}
          ${p.note ? `<div class="meta-note">${p.note}</div>` : ''}
        </div>
      </div>
      <div class="card-foot">
        <button class="btn btn-ghost btn-sm" style="flex:1" onclick="editProduct('${p.id}')">✏️ Изменить</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">🗑️</button>
      </div>
    </div>`;
}

function renderAll() {
  renderStats();
  renderAlertBanner();
  renderCatTabs();

  let list = [...products];
  if (activeCategory !== 'Все') list = list.filter(p => p.category === activeCategory);

  const q = document.getElementById('searchInput').value.toLowerCase();
  if (q) list = list.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q) ||
    (p.note && p.note.toLowerCase().includes(q)) ||
    (p.location && p.location.toLowerCase().includes(q))
  );

  const st = document.getElementById('filterStatus').value;
  if (st !== 'all') list = list.filter(p => getStatus(daysLeft(p.expiry)) === st);

  const sort = document.getElementById('sortBy').value;
  if (sort === 'expiry')   list.sort((a,b) => new Date(a.expiry) - new Date(b.expiry));
  if (sort === 'name')     list.sort((a,b) => a.name.localeCompare(b.name, 'ru'));
  if (sort === 'category') list.sort((a,b) => a.category.localeCompare(b.category, 'ru'));
  if (sort === 'qty')      list.sort((a,b) => b.qty - a.qty);

  const grid = document.getElementById('productGrid');
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🍺</div><h3>Товаров не найдено</h3><p>Добавьте первый товар или измените фильтры</p></div>`;
  } else {
    grid.innerHTML = list.map(cardHtml).join('');
  }
}

// ── MODAL ─────────────────────────────────────────────
function openModal()  { document.getElementById('modal').classList.add('open'); }
function closeModal() { document.getElementById('modal').classList.remove('open'); }

function resetModal() {
  editingId = null;
  selectedFile = null;
  document.getElementById('modalTitle').textContent = 'Добавить товар';
  ['fName','fCategory','fStorage','fExpiry','fQty','fPrice','fLocation','fNote'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const prev = document.getElementById('photoPreview');
  prev.src = ''; prev.style.display = 'none';
  document.getElementById('photoInput').value = '';
}

function editProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  editingId = id;
  selectedFile = null;
  document.getElementById('modalTitle').textContent = 'Редактировать товар';
  document.getElementById('fName').value     = p.name;
  document.getElementById('fCategory').value = p.category;
  document.getElementById('fStorage').value  = p.storage || 'Полка';
  document.getElementById('fExpiry').value   = p.expiry;
  document.getElementById('fQty').value      = p.qty;
  document.getElementById('fPrice').value    = p.price || '';
  document.getElementById('fLocation').value = p.location || '';
  document.getElementById('fNote').value     = p.note || '';
  const prev = document.getElementById('photoPreview');
  if (p.photo) { prev.src = p.photo; prev.style.display = 'block'; }
  else { prev.src = ''; prev.style.display = 'none'; }
  openModal();
}

async function deleteProduct(id) {
  if (!confirm('Удалить товар?')) return;
  await apiDelete(id);
  products = products.filter(p => p.id !== id);
  renderAll();
  toast('Товар удалён');
}

async function saveProduct() {
  const name     = document.getElementById('fName').value.trim();
  const category = document.getElementById('fCategory').value;
  const storage  = document.getElementById('fStorage').value;
  const expiry   = document.getElementById('fExpiry').value;
  const qty      = parseInt(document.getElementById('fQty').value) || 0;
  const price    = document.getElementById('fPrice').value || null;
  const location = document.getElementById('fLocation').value.trim();
  const note     = document.getElementById('fNote').value.trim();

  if (!name)     { toast('Введите название', 'err'); return; }
  if (!category) { toast('Выберите категорию', 'err'); return; }
  if (!qty)      { toast('Укажите количество', 'err'); return; }
  if (!expiry)   { toast('Укажите срок годности', 'err'); return; }

  // Показываем что идёт загрузка
  const btnSave = document.getElementById('btnSaveProduct');
  btnSave.textContent = '⏳ Сохранение...';
  btnSave.disabled = true;

  // Загружаем фото в Storage если выбрано новое
  let photo = null;
  if (selectedFile) {
    toast('Загружаю фото...', 'info');
    photo = await uploadPhoto(selectedFile);
    if (!photo) { toast('Ошибка загрузки фото', 'err'); }
  } else if (editingId) {
    // Оставляем старое фото
    const existing = products.find(p => p.id === editingId);
    photo = existing ? existing.photo : null;
  }

  const data = { name, category, storage, expiry, qty, price, location, note, photo };

  if (editingId) {
    await apiPatch({ id: editingId, ...data });
    const idx = products.findIndex(p => p.id === editingId);
    if (idx !== -1) products[idx] = { ...products[idx], ...data };
    toast('Товар обновлён');
  } else {
    const newProduct = { id: uid(), ...data, added_at: Date.now() };
    await apiPost(newProduct);
    products.push(newProduct);
    toast('Товар добавлен 🍺');
  }

  btnSave.textContent = 'Сохранить';
  btnSave.disabled = false;
  closeModal();
  renderAll();
}

// ── INIT ──────────────────────────────────────────────
async function init() {
  try {
    products = await apiGet();
  } catch(e) {
    document.getElementById('productGrid').innerHTML = `<div class="loading">❌ Ошибка загрузки. Проверьте настройки.</div>`;
    return;
  }
  renderAll();

  document.getElementById('btnAddProduct').addEventListener('click', () => { resetModal(); openModal(); });
  document.getElementById('btnCloseModal').addEventListener('click', closeModal);
  document.getElementById('btnCancelModal').addEventListener('click', closeModal);
  document.getElementById('btnSaveProduct').addEventListener('click', saveProduct);
  document.getElementById('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
  document.getElementById('searchInput').addEventListener('input', renderAll);
  document.getElementById('filterStatus').addEventListener('change', renderAll);
  document.getElementById('sortBy').addEventListener('change', renderAll);

  document.getElementById('btnNotifyNow').addEventListener('click', async () => {
    toast('Отправка уведомления…', 'info');
    try {
      const r = await fetch('/api/notify');
      const d = await r.json();
      if (d.ok) toast('Уведомление отправлено в Telegram ✅');
      else toast('Ошибка отправки', 'err');
    } catch { toast('Ошибка отправки', 'err'); }
  });

  // Фото — сохраняем файл, показываем превью
  document.getElementById('photoInput').addEventListener('change', function() {
    const file = this.files[0];
    if (!file) return;
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = e => {
      const prev = document.getElementById('photoPreview');
      prev.src = e.target.result;
      prev.style.display = 'block';
    };
    reader.readAsDataURL(file);
  });
}

document.addEventListener('DOMContentLoaded', init);
