// Rove landing: serves static page + receives orders.
// Orders are saved to D1 (never lost) and forwarded to Google Sheet (Apps Script web app) if SHEET_URL is set.
import ASSETS from './assets.js';

const TIERS = [220, 210, 200, 190, 180];
const SHIP_FEE = 30, FREE_SHIP_FROM = 4;
const PRODUCTS = {
  bunny: 'بينك أرانب Hi', purple: 'تاي داي موف', beige: 'تاي داي بيج',
  birds: 'سيمون عصافير', spider: 'سماوي سبايدر', kitty: 'بينك قطط وأرانب', giraffe: 'أوف وايت زرافة',
};

const json = (o, s = 200) => new Response(JSON.stringify(o), {
  status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});
const clip = (v, n) => String(v ?? '').trim().slice(0, n);

function cairoTime(d = new Date()) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d).replace(',', '');
}

async function handleOrder(req, env, ctx) {
  let b;
  try { b = await req.json(); } catch { return json({ ok: false, error: 'bad json' }, 400); }
  const phone = clip(b.phone, 20).replace(/[^\d+]/g, '');
  const name = clip(b.name, 80), gov = clip(b.gov, 40);
  if (!/^(\+?20)?0?1[0125]\d{8}$/.test(phone)) return json({ ok: false, error: 'phone' }, 400);
  if (name.length < 2 || !gov) return json({ ok: false, error: 'fields' }, 400);
  const items = (Array.isArray(b.items) ? b.items : []).slice(0, 50)
    .map(i => ({ pid: clip(i.pid, 20), size: clip(i.size, 20), qty: Math.max(0, Math.min(50, parseInt(i.qty, 10) || 0)) }))
    .filter(i => PRODUCTS[i.pid] && i.size && i.qty > 0);
  const count = items.reduce((s, i) => s + i.qty, 0);
  if (!count) return json({ ok: false, error: 'empty' }, 400);
  const unit = TIERS[Math.min(count, TIERS.length) - 1];
  const subtotal = unit * count, shipping = count >= FREE_SHIP_FROM ? 0 : SHIP_FEE, total = subtotal + shipping;
  const id = 'R' + Date.now().toString(36).toUpperCase().slice(-5) + Math.random().toString(36).slice(2, 4).toUpperCase();
  const itemsText = items.map(i => `${PRODUCTS[i.pid]} (${i.size}) × ${i.qty}`).join(' | ');
  const order = {
    id, created_at: cairoTime(), name, phone, gov,
    address: clip(b.address, 300), notes: clip(b.notes, 500),
    items: itemsText, count, unit_price: unit, subtotal, shipping, total,
    source: [clip(b.utm_source, 40), clip(b.utm_campaign, 80), clip(b.utm_content, 80), b.fbclid ? 'fb' : ''].filter(Boolean).join(' / '),
  };
  await env.DB.prepare(`INSERT INTO orders (id, created_at, name, phone, gov, address, notes, items, count, unit_price, subtotal, shipping, total, source, items_json)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
    order.id, order.created_at, order.name, order.phone, order.gov, order.address, order.notes,
    order.items, count, unit, subtotal, shipping, total, order.source, JSON.stringify(items)).run();
  if (env.SHEET_URL) ctx.waitUntil(pushToSheet(env, order));
  return json({ ok: true, id, total, count });
}

async function pushToSheet(env, order) {
  let status;
  try {
    const r = await fetch(env.SHEET_URL, {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=utf-8', 'user-agent': 'Mozilla/5.0 (compatible; RoveOrders/1.0)' },
      body: JSON.stringify(order), redirect: 'follow',
    });
    const raw = await r.text();
    const title = (raw.match(/<title>([^<]*)<\/title>/i) || [])[1] || '';
    const body = raw.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const txt = (title ? '[' + title + '] ' : '') + body.slice(0, 400);
    status = r.ok && txt.includes('"ok":true') ? 'sent' : `http ${r.status} @ ${new URL(r.url).host} :: ${txt}`;
  } catch (e) {
    status = 'error :: ' + String(e).slice(0, 200);
  }
  await env.DB.prepare('UPDATE orders SET sheet_status=? WHERE id=?').bind(status, order.id).run();
}

// Retry orders that didn't reach the sheet (runs on cron)
async function retrySheet(env) {
  if (!env.SHEET_URL) return;
  const { results } = await env.DB.prepare(
    "SELECT * FROM orders WHERE sheet_status IS NOT 'sent' ORDER BY rowid LIMIT 20").all();
  for (const o of results) await pushToSheet(env, o);
}

export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(retrySheet(env)); },
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname === '/api/order') {
      if (req.method !== 'POST') return json({ ok: false }, 405);
      try { return await handleOrder(req, env, ctx); }
      catch (e) { return json({ ok: false, error: 'server' }, 500); }
    }
    const path = url.pathname === '/' ? '/index.html' : url.pathname;
    const a = ASSETS[path];
    if (!a) return new Response('Not found', { status: 404 });
    const isHtml = a[1].startsWith('text/html');
    const res = new Response(a[0], { headers: { 'content-type': a[1], 'cache-control': isHtml ? 'no-cache' : 'public, max-age=86400' } });
    const pixel = /^\d{8,20}$/.test(env.FB_PIXEL_ID || '') ? env.FB_PIXEL_ID : '';
    if (pixel && (res.headers.get('content-type') || '').includes('text/html')) {
      const snippet = `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');</script>`;
      return new HTMLRewriter().on('head', { element(el) { el.append(snippet, { html: true }); } }).transform(res);
    }
    return res;
  },
};
