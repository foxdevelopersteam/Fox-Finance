const $ = s => document.querySelector(s), app = $("#app");
const IDX = {
  us: [["^GSPC", "S&P 500"], ["^DJI", "Dow Jones"], ["^IXIC", "Nasdaq"], ["^RUT", "Russell 2000"]],
  eu: [["^FTSE", "FTSE 100"], ["^GDAXI", "DAX"], ["^FCHI", "CAC 40"], ["^STOXX50E", "Euro Stoxx 50"]],
  as: [["^N225", "Nikkei 225"], ["^HSI", "Hang Seng"], ["000001.SS", "Shanghai"], ["^BSESN", "Sensex"]]
};
const REGION = { us: "US", eu: "Europe", as: "Asia" };
const POP = "AAPL,MSFT,GOOGL,AMZN,NVDA,TSLA,META,NFLX,JPM,V,KO,DIS,NKE,UBER,XOM,AMD".split(",");
const CRYPTO = "BTC-USD,ETH-USD,SOL-USD,XRP-USD,BNB-USD,DOGE-USD,ADA-USD,AVAX-USD,LINK-USD,LTC-USD,DOT-USD,TRX-USD".split(",");
const FX = [["EURUSD=X", "EUR"], ["GBPUSD=X", "GBP"], ["JPY=X", "JPY"], ["INR=X", "INR"], ["AUDUSD=X", "AUD"], ["CAD=X", "CAD"], ["CHF=X", "CHF"], ["CNY=X", "CNY"], ["AED=X", "AED"], ["SGD=X", "SGD"]];
const CODES = ["USD", ...FX.map(x => x[1])];
const RANGES = ["1D", "5D", "1M", "6M", "1Y"];
let mk = "us", mv = "g", rg = "1D", timer, usd = { USD: 1 }, cv = { amt: 100, from: "USD", to: "EUR" };

const api = async p => { const r = await fetch("/api?" + new URLSearchParams(p)); if (!r.ok) throw new Error("Request failed (" + r.status + ")"); return r.json(); };
const f = (n, d = 2) => n == null ? "—" : Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const P = (n, s) => n == null ? "—" : f(n, /=X$/.test(s || "") ? (n >= 20 ? 3 : 4) : (n < 1 ? 4 : 2));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const chg = (p, b) => { const a = p - b; return { a, pc: a / b * 100, up: a >= 0 }; };
const pill = c => `<span class="pill ${c.up ? "up" : "dn"}">${c.up ? "▲" : "▼"} ${f(Math.abs(c.pc))}%</span>`;
const getW = () => { try { const w = JSON.parse(localStorage.getItem("fox-watch")); if (Array.isArray(w)) return w; } catch (e) {} return ["AAPL", "MSFT", "BTC-USD", "NVDA"]; };
const putW = w => { try { localStorage.setItem("fox-watch", JSON.stringify(w)); } catch (e) {} };

function path(v, w, h, close) {
  const mn = Math.min(...v), mx = Math.max(...v);
  const d = v.map((y, i) => (i ? "L" : "M") + (i / (v.length - 1 || 1) * w).toFixed(1) + " " + (h - 4 - (y - mn) / (mx - mn || 1) * (h - 8)).toFixed(1)).join("");
  return close ? d + `L${w} ${h}L0 ${h}Z` : d;
}
function spark(v, up, w, h) {
  if (!v || v.length < 2) return "";
  const c = up ? "var(--up)" : "var(--dn)";
  return `<svg viewBox="0 0 ${w} ${h}" height="${h}" preserveAspectRatio="none"><path d="${path(v, w, h, 1)}" fill="${c}" opacity=".14"/><path d="${path(v, w, h)}" fill="none" stroke="${c}" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
}
const row = x => { const c = chg(x.price, x.prev); return `<a class="row" href="#${encodeURIComponent(x.symbol)}"><div class="n"><b>${esc(x.symbol)}</b><small>${esc(x.name)}</small></div><div class="sp">${spark(x.p, c.up, 90, 32)}</div><div class="r"><b>${P(x.price, x.symbol)}</b><br>${pill(c)}</div></a>`; };
const card = (x, label) => { const c = chg(x.price, x.prev); return `<a class="card" href="#${encodeURIComponent(x.symbol)}"><small class="muted">${esc(label || x.name)}</small><b>${P(x.price, x.symbol)}</b>${pill(c)}${spark(x.p, c.up, 200, 44)}</a>`; };
const fail = e => `<div class="err"><b>Couldn’t load market data.</b><br><span class="muted">${esc(e.message)}</span><br><button onclick="route()">Try again</button></div>`;
const stamp = () => `<p class="muted" style="font-size:13px">Updated ${new Date().toLocaleTimeString()} · refreshes every 30 seconds</p>`;
const nav = v => `<nav class="tabs nav">${[["", "Markets"], ["!crypto", "Crypto"], ["!currencies", "Currencies"]].map(x => `<a class="${v === x[0] ? "on" : ""}" href="#${x[0]}">${x[1]}</a>`).join("")}</nav>`;

async function home() {
  const w = getW();
  const [ix, wl, pop] = await Promise.all([
    api({ type: "batch", symbols: IDX[mk].map(x => x[0]).join(",") }),
    w.length ? api({ type: "batch", symbols: w.join(",") }) : [],
    api({ type: "batch", symbols: POP.join(",") })
  ]);
  const sorted = [...pop].sort((a, b) => chg(b.price, b.prev).pc - chg(a.price, a.prev).pc);
  const movers = mv === "g" ? sorted.slice(0, 5) : sorted.slice(-5).reverse();
  const nm = s => (IDX[mk].find(x => x[0] === s) || [])[1];
  return `${nav("")}
<section class="hero"><img src="logo.jpg" alt="Fox Finance logo" width="112" height="112"><div><h1>Smarter money, brighter future</h1><p class="muted">Live stocks, crypto and currencies in one place. Your financial companion from the Fox 🦊 Verse.</p></div></section>
<h2 style="margin-top:4px">Markets</h2>
<div class="tabs">${Object.keys(REGION).map(k => `<button class="${mk === k ? "on" : ""}" data-m="${k}">${REGION[k]}</button>`).join("")}</div>
<div class="grid">${ix.map(x => card(x, nm(x.symbol))).join("")}</div>
${stamp()}
<h2>Your watchlist</h2>${wl.length ? wl.map(row).join("") : '<p class="muted">Your watchlist is empty. Search for an asset and tap the star to add it.</p>'}
<h2>Top movers</h2>
<div class="tabs"><button class="${mv === "g" ? "on" : ""}" data-v="g">Gainers</button><button class="${mv === "l" ? "on" : ""}" data-v="l">Losers</button></div>
${movers.map(row).join("")}
<h2>Popular stocks</h2>${pop.map(row).join("")}`;
}

async function crypto() {
  const d = await api({ type: "batch", symbols: CRYPTO.join(",") });
  return `${nav("!crypto")}<h2 style="margin-top:4px">Crypto</h2>
<div class="grid">${d.slice(0, 4).map(x => card(x)).join("")}</div>${stamp()}
<h2>Top coins</h2>${d.map(row).join("")}
<p class="muted" style="font-size:13px">Prices in US dollars. Crypto trades around the clock.</p>`;
}

function conv() {
  const r = cv.amt * usd[cv.from] / usd[cv.to];
  return isFinite(r) ? `${f(r, r < 1 ? 4 : 2)} ${cv.to}` : "—";
}
async function currencies() {
  const d = await api({ type: "batch", symbols: FX.map(x => x[0]).join(",") });
  usd = { USD: 1 };
  d.forEach(x => { const z = FX.find(q => q[0] === x.symbol); if (z) usd[z[1]] = /^[A-Z]{3}USD=X$/.test(x.symbol) ? x.price : 1 / x.price; });
  const opt = s => CODES.filter(c => usd[c]).map(c => `<option ${c === s ? "selected" : ""}>${c}</option>`).join("");
  return `${nav("!currencies")}<h2 style="margin-top:4px">Currency converter</h2>
<div class="card conv"><input id="amt" type="number" inputmode="decimal" min="0" value="${cv.amt}" aria-label="Amount"><select id="from" aria-label="From">${opt(cv.from)}</select><select id="to" aria-label="To">${opt(cv.to)}</select><button id="swap">Swap currencies</button><div class="out" id="out">${conv()}</div></div>
${stamp()}<h2>Exchange rates</h2>${d.map(row).join("")}`;
}
function bindConv() {
  const a = $("#amt"); if (!a) return;
  const upd = () => { cv.amt = parseFloat(a.value) || 0; cv.from = $("#from").value; cv.to = $("#to").value; $("#out").textContent = conv(); };
  a.oninput = upd; $("#from").onchange = upd; $("#to").onchange = upd;
  $("#swap").onclick = () => { const t = $("#from").value; $("#from").value = $("#to").value; $("#to").value = t; upd(); };
}

async function detail(sym) {
  const [c, d, n] = await Promise.all([
    api({ type: "chart", symbol: sym, range: rg }),
    rg === "1D" ? null : api({ type: "chart", symbol: sym, range: "1D" }),
    api({ type: "search", q: sym.replace(/=X$/, "") }).catch(() => ({ news: [] }))
  ]);
  const day = d || c, base = rg === "1D" ? c.prev : c.p[0], ch = chg(c.price, base), up = ch.up, col = up ? "var(--up)" : "var(--dn)";
  const on = getW().includes(c.symbol), cur = c.currency ? " · " + c.currency : "";
  detail.cur = c;
  const stats = [["Previous close", P(day.prev, sym)], ["Open", P(day.open, sym)], ["Day high", P(day.high, sym)], ["Day low", P(day.low, sym)], ["52-week high", P(c.hi52, sym)], ["52-week low", P(c.lo52, sym)], ["Volume", day.volume ? Number(day.volume).toLocaleString("en-US") : "—"], ["Exchange", esc(c.exchange || "—")]];
  return `<p><a href="#" style="color:var(--ac);text-decoration:none">‹ Markets</a></p>
<div class="top"><div><small class="muted">${esc(c.exchange || "")}${esc(cur)}</small><h1>${esc(c.name)} <span class="muted" style="font-size:16px">${esc(c.symbol)}</span></h1></div><button class="star" id="star" aria-label="Toggle watchlist">${on ? "★" : "☆"}</button></div>
<div style="margin-top:10px"><span class="big" id="px">${P(c.price, sym)}</span> <span class="${up ? "up" : "dn"}">${up ? "+" : "−"}${P(Math.abs(ch.a), sym)} (${f(Math.abs(ch.pc))}%) ${rg}</span></div>
<div class="rg">${RANGES.map(k => `<button class="${k === rg ? "on" : ""}" data-r="${k}">${k}</button>`).join("")}</div>
<svg id="ch" viewBox="0 0 700 260" height="260" preserveAspectRatio="none"><path d="${path(c.p, 700, 260, 1)}" fill="${col}" opacity=".14"/><path d="${path(c.p, 700, 260)}" fill="none" stroke="${col}" stroke-width="2.5" vector-effect="non-scaling-stroke"/><line id="xl" y1="0" y2="260" stroke="var(--muted)" vector-effect="non-scaling-stroke" visibility="hidden"/></svg>
<div id="tip" class="muted" style="height:20px;font-size:13px"></div>
${stamp()}
<h2>Key stats</h2><div class="stats">${stats.map(s => `<div><span class="muted">${s[0]}</span><b>${s[1]}</b></div>`).join("")}</div>
<h2>In the news</h2><div class="news">${(n.news || []).length ? n.news.map(x => `<a href="${esc(x.link)}" target="_blank" rel="noopener"><small>${esc(x.publisher || "")} · ${new Date(x.time * 1000).toLocaleDateString()}</small><br>${esc(x.title)}</a>`).join("") : '<p class="muted">No recent news found.</p>'}</div>`;
}

function bindDetail() {
  const c = detail.cur, svg = $("#ch"); if (!svg) return;
  $("#star").onclick = function () { const w = getW(), i = w.indexOf(c.symbol); i > -1 ? w.splice(i, 1) : w.push(c.symbol); putW(w); this.textContent = i > -1 ? "☆" : "★"; };
  const xl = $("#xl"), px = $("#px"), tip = $("#tip");
  svg.onpointermove = e => {
    const b = svg.getBoundingClientRect(), i = Math.max(0, Math.min(c.p.length - 1, Math.round((e.clientX - b.left) / b.width * (c.p.length - 1)))), x = i / (c.p.length - 1 || 1) * 700;
    xl.setAttribute("x1", x); xl.setAttribute("x2", x); xl.setAttribute("visibility", "visible");
    px.textContent = P(c.p[i], c.symbol);
    const dt = new Date(c.t[i] * 1000); tip.textContent = rg === "1D" || rg === "5D" ? dt.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : dt.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
  };
  svg.onpointerleave = () => { xl.setAttribute("visibility", "hidden"); px.textContent = P(c.price, c.symbol); tip.textContent = ""; };
}

async function route(silent) {
  clearTimeout(timer);
  const el = document.activeElement;
  if (silent && el && /INPUT|SELECT/.test(el.tagName)) { timer = setTimeout(() => route(true), 30000); return; }
  const h = decodeURIComponent(location.hash.slice(1)), y = window.scrollY;
  if (!silent) app.innerHTML = '<p class="muted">Loading live data…</p>';
  try {
    if (h === "!crypto") app.innerHTML = await crypto();
    else if (h === "!currencies") { app.innerHTML = await currencies(); bindConv(); }
    else if (h) { app.innerHTML = await detail(h); bindDetail(); }
    else app.innerHTML = await home();
    window.scrollTo(0, silent ? y : 0);
  } catch (e) { if (!silent) app.innerHTML = fail(e); }
  timer = setTimeout(() => route(true), 30000);
}

app.addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.m) { mk = b.dataset.m; route(); }
  if (b.dataset.v) { mv = b.dataset.v; route(); }
  if (b.dataset.r) { rg = b.dataset.r; route(); }
});
window.addEventListener("hashchange", () => { rg = "1D"; route(); });

const q = $("#q"), res = $("#res"); let st;
q.oninput = () => {
  clearTimeout(st); const t = q.value.trim();
  if (!t) { res.style.display = "none"; return; }
  st = setTimeout(async () => {
    try {
      const r = await api({ type: "search", q: t });
      res.innerHTML = r.quotes.map(x => `<a href="#${encodeURIComponent(x.symbol)}"><span><b>${esc(x.symbol)}</b> ${esc(x.name)}</span><span class="muted">${esc(x.exch)}</span></a>`).join("");
      res.style.display = r.quotes.length ? "block" : "none";
    } catch (e) { res.style.display = "none"; }
  }, 250);
};
res.onclick = () => { q.value = ""; res.style.display = "none"; };
route();
