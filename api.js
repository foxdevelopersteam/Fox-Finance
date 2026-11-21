// Fox 🦊 Finance API: a small proxy to Yahoo Finance's public endpoints (no API key needed).
const UA = { "User-Agent": "Mozilla/5.0 (FoxFinance; +https://github.com/foxdevelopersteam)" };
const RG = { "1D": ["1d", "5m"], "5D": ["5d", "15m"], "1M": ["1mo", "1d"], "6M": ["6mo", "1d"], "1Y": ["1y", "1d"] };

async function chart(sym, rg) {
  const [range, interval] = RG[rg] || RG["1D"];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=${interval}`;
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error("Upstream " + res.status);
  const j = await res.json();
  const c = j.chart && j.chart.result && j.chart.result[0];
  if (!c) throw new Error("No data for " + sym);
  const m = c.meta, q = (c.indicators.quote && c.indicators.quote[0]) || {};
  const t = [], p = [];
  (c.timestamp || []).forEach((ts, i) => { if (q.close && q.close[i] != null) { t.push(ts); p.push(q.close[i]); } });
  const open = (q.open || []).find(v => v != null);
  return {
    symbol: m.symbol, name: m.longName || m.shortName || m.symbol,
    exchange: m.fullExchangeName || m.exchangeName, currency: m.currency,
    price: m.regularMarketPrice, prev: m.chartPreviousClose, open,
    high: m.regularMarketDayHigh, low: m.regularMarketDayLow, volume: m.regularMarketVolume,
    hi52: m.fiftyTwoWeekHigh, lo52: m.fiftyTwoWeekLow, t, p
  };
}

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const headers = { "Content-Type": "application/json", "Cache-Control": "public, max-age=20" };
  try {
    let out;
    if (q.type === "chart") {
      out = await chart(q.symbol, q.range);
    } else if (q.type === "batch") {
      const syms = String(q.symbols || "").split(",").filter(Boolean).slice(0, 25);
      const all = await Promise.allSettled(syms.map(s => chart(s, "1D")));
      out = all.filter(r => r.status === "fulfilled").map(r => r.value);
    } else if (q.type === "search") {
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q.q || "")}&quotesCount=6&newsCount=5`;
      const res = await fetch(url, { headers: UA });
      if (!res.ok) throw new Error("Upstream " + res.status);
      const j = await res.json();
      out = {
        quotes: (j.quotes || []).filter(x => x.symbol).map(x => ({ symbol: x.symbol, name: x.shortname || x.longname || x.symbol, exch: x.exchDisp || "" })),
        news: (j.news || []).map(n => ({ title: n.title, publisher: n.publisher, link: n.link, time: n.providerPublishTime }))
      };
    } else {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Unknown type" }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify(out) };
  } catch (e) {
    return { statusCode: 502, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: String(e.message || e) }) };
  }
};
