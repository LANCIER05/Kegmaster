// api/products.js — CRUD товаров через Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

async function query(method, body = null, filter = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products${filter}`, {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal',
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (method === 'DELETE' || method === 'PATCH') return { ok: true };
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const data = await query('GET', null, '?order=expiry.asc');
      return res.json(data);
    }

    if (req.method === 'POST') {
      const data = await query('POST', req.body);
      return res.json(data);
    }

    if (req.method === 'PATCH') {
      const { id, ...fields } = req.body;
      await query('PATCH', fields, `?id=eq.${id}`);
      return res.json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      await query('DELETE', null, `?id=eq.${id}`);
      return res.json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
