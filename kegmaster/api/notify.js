// api/notify.js — Автоматические уведомления в Telegram
// Запускается каждый день в 6:00 UTC = 9:00 МСК (через vercel.json crons)

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const TG_TOKEN    = process.env.TG_TOKEN;
const TG_CHAT_ID  = process.env.TG_CHAT_ID;
const DAYS_WARN   = parseInt(process.env.DAYS_WARN || '3');

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

function daysLeft(expiryStr) {
  const now = new Date(); now.setHours(0,0,0,0);
  const exp = new Date(expiryStr); exp.setHours(0,0,0,0);
  return Math.round((exp - now) / 86400000);
}

function formatDate(str) {
  const [y,m,d] = str.split('-');
  return `${d}.${m}.${y}`;
}

async function sendTg(text) {
  const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT_ID, text, parse_mode: 'HTML' }),
  });
  return res.json();
}

export default async function handler(req, res) {
  // Защита: только Vercel cron или GET запрос
  try {
    // Загрузить все товары из Supabase
    const r = await fetch(`${SUPABASE_URL}/rest/v1/products?order=expiry.asc`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    });
    const products = await r.json();

    const expired  = products.filter(p => daysLeft(p.expiry) < 0);
    const expiring = products.filter(p => { const d = daysLeft(p.expiry); return d >= 0 && d <= DAYS_WARN; });

    if (!expired.length && !expiring.length) {
      await sendTg('🍺 <b>Ocean-Победа — КегМастер</b>\n\n✅ Всё в порядке! Товаров с истекающим сроком нет.');
      return res.json({ ok: true, message: 'No expiring products' });
    }

    let msg = '🍺 <b>Ocean-Победа — КегМастер</b>\n<b>Ежедневный отчёт по срокам</b>\n\n';

    if (expired.length) {
      msg += `🚨 <b>СРОК ИСТЁК — ${expired.length} позиц${expired.length === 1 ? 'ия' : 'ий'}:</b>\n`;
      expired.forEach(p => {
        const icon = CAT_ICONS[p.category] || '📦';
        msg += `${icon} <b>${p.name}</b>\n`;
        msg += `   📦 ${p.qty} шт. · до ${formatDate(p.expiry)}`;
        if (p.location) msg += ` · 📍 ${p.location}`;
        msg += '\n';
      });
      msg += '\n';
    }

    if (expiring.length) {
      msg += `⚠️ <b>СКОРО ИСТЕКАЕТ — ${expiring.length} позиц${expiring.length === 1 ? 'ия' : 'ий'}:</b>\n`;
      expiring.forEach(p => {
        const icon = CAT_ICONS[p.category] || '📦';
        const d = daysLeft(p.expiry);
        const dayStr = d === 0 ? '❗ СЕГОДНЯ' : `${d} дн.`;
        msg += `${icon} <b>${p.name}</b>\n`;
        msg += `   📦 ${p.qty} шт. · осталось ${dayStr} · до ${formatDate(p.expiry)}`;
        if (p.location) msg += ` · 📍 ${p.location}`;
        msg += '\n';
      });
    }

    const tgRes = await sendTg(msg);
    return res.json({ ok: true, telegram: tgRes, expired: expired.length, expiring: expiring.length });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
