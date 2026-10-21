"use strict";
/* Mapa de inundaciones – Chaco y NEA. Sin compilación: Leaflet + Motion (opcional) + JSON de data/.
   ?test en la URL corre el autochequeo de la lógica de cálculo y lo imprime en consola. */
(() => {
const CFG = {
  formEndpoint: "",            // servicio externo de formularios (hosting estático); si queda vacío se usa api/envios (servidor.py)
  email: "",                   // alternativa: abre el correo del usuario
  api: "api/envios",
  bounds: [[-29.1, -62.9], [-23.9, -57.2]],
};
const M = window.Motion;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const mov = !!(M && M.animate) && !reduce;
const TZ = "America/Argentina/Buenos_Aires";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safe = u => /^https?:\/\//i.test(u) ? u : "#";
const J = u => fetch(u, { cache: "no-cache" }).then(r => { if (!r.ok) throw Error(r.status); return r.json(); });
const nf = (v, d = 0) => v.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });
const P = s => { s = String(s); if (s.length === 10) s += "T12:00:00"; return new Date(/(Z|[+-]\d\d:?\d\d)$/.test(s) ? s : s + "-03:00"); };
const fmt = s => P(s).toLocaleString("es-AR", { timeZone: TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const fdia = s => P(s).toLocaleDateString("es-AR", { timeZone: TZ, day: "2-digit", month: "2-digit" });
const rel = s => { const h = (Date.now() - P(s)) / 36e5; return h < 1 ? "hace minutos" : h < 48 ? `hace ${Math.round(h)} h` : `hace ${Math.round(h / 24)} días`; };
const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const lugar = s => s.replace(/(?<=\s)(De|Del|La|Las|Los|Y|El)(?=\s)/g, m => m.toLowerCase());
const medio = m => /^https?:/.test(m) ? new URL(m).hostname.replace(/^www\./, "") : m;
const deb = (f, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };
const toast = (t, ms = 3800) => { const el = $("#toast"); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, ms); };
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { } } };

/* ——— animación (Motion) con degradación: si no cargó, todo queda estático ——— */
function entra(els, d = 0, blur = true) {
  const l = [...els].filter(Boolean);
  if (!mov || !l.length) return;
  try {
    const kf = { opacity: [0, 1], transform: ["translateY(10px)", "translateY(0px)"] };
    if (blur) kf.filter = ["blur(6px)", "blur(0px)"];
    M.animate(l, kf, { duration: .45, delay: M.stagger(.05, { startDelay: d }), ease: [.22, 1, .36, 1] })
      .then(() => l.forEach(e => { e.style.filter = ""; e.style.transform = ""; e.style.opacity = ""; }));
  } catch { }
}
function tick(el, to, dec = 0) {
  el.textContent = nf(to, dec);
  if (!mov || !to) return;
  try { M.animate(0, to, { duration: .9, ease: "easeOut", onUpdate: v => el.textContent = nf(v, dec) }); } catch { }
}
function fade(ls, a, b, done) {
  if (!mov) { ls.forEach(l => l.setOpacity(b)); done && done(); return; }
  M.animate(a, b, { duration: .5, onUpdate: v => ls.forEach(l => l.setOpacity(v)), onComplete: () => { ls.forEach(l => l.setOpacity(b)); done && done(); } });
}
document.addEventListener("pointermove", e => {            // Spotlight: el brillo sigue al cursor
  const c = e.target.closest && e.target.closest(".card");
  if (c) { const r = c.getBoundingClientRect(); c.style.setProperty("--mx", e.clientX - r.left + "px"); c.style.setProperty("--my", e.clientY - r.top + "px"); }
});

/* ——— geometría ——— */
const hav = (a, b, c, d) => { const t = Math.PI / 180, x = Math.sin((c - a) * t / 2) ** 2 + Math.cos(a * t) * Math.cos(c * t) * Math.sin((d - b) * t / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
const pip = (lat, lon, ring) => { let d = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [yi, xi] = ring[i], [yj, xj] = ring[j]; if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) d = !d; } return d; };
const ll2px = (lat, lon, z) => { const n = 256 * 2 ** z, s = Math.sin(lat * Math.PI / 180); return [(lon + 180) / 360 * n, (.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n]; };
const tile2ll = (x, y, z) => [Math.atan(Math.sinh(Math.PI * (1 - 2 * y / 2 ** z))) * 180 / Math.PI, x / 2 ** z * 360 - 180];
// cuenta píxeles dentro del círculo: g[i] 0 = sin dato, 1 = tierra, 2 = agua
function contar(g, W, H, cx, cy, rpx) {
  let N = 0, V = 0, F = 0; const r2 = rpx * rpx;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x + .5 - cx, dy = y + .5 - cy; if (dx * dx + dy * dy > r2) continue;
    N++; const v = g[y * W + x]; if (v) { V++; if (v === 2) F++; }
  }
  return { N, V, F };
}

/* ——— estado y mapa ——— */
const D = { est: [], gfm: [], pre: [], ale: [], vid: [], lug: [] };
const EST = { evacuacion: { c: "#D55E00", g: "▲", t: "Sobre cota de evacuación", o: 0 }, alerta: { c: "#F0E442", g: "■", t: "Sobre cota de alerta", o: 1 }, normal: { c: "#009E73", g: "●", t: "Bajo cota de alerta", o: 2 }, sin_cota: { c: "#bbb", g: "○", t: "Sin cota cargada", o: 3 } };
const SEV = { Extreme: ["#b2182b", "Extrema"], Severe: ["#D55E00", "Severa"], Moderate: ["#E69F00", "Moderada"], Minor: ["#56B4E9", "Menor"] };
const SEVO = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3 };
const TIPO = { evacuacion: ["Evacuación", "#D55E00", "#fff"], ruta: ["Ruta", "#CC79A7", "#111"], anegamiento: ["Anegamiento", "#0072B2", "#fff"], rio: ["Río", "#56B4E9", "#111"], alerta: ["Alerta", "#E69F00", "#111"], prevencion: ["Prevención", "#009E73", "#fff"], general: ["General", "#666", "#fff"] };
const TORD = Object.keys(TIPO);
const tipoPill = t => { const [n, c, f] = TIPO[t] || TIPO.general; return `<span class="tipo" style="background:${c};color:${f}">${n}</span>`; };

const map = L.map("map", { preferCanvas: true, zoomControl: false, attributionControl: true });
map.attributionControl.setPrefix(false);
L.control.zoom({ position: "bottomright", zoomInTitle: "Acercar", zoomOutTitle: "Alejar" }).addTo(map);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
map.createPane("gfm").style.zIndex = 250;
const G = {}; ["est", "gfm", "pre", "ale", "vid", "zona"].forEach(k => G[k] = L.layerGroup().addTo(map));
map.removeLayer(G.ale);
const sheetPx = () => document.body.classList.contains("sheet-open") ? Math.min(innerHeight * .52, 460) : 92;
const BC = document.body.classList;
const pad = () => {
  const so = BC.contains("solo"), tm = BC.contains("top-min");
  if (innerWidth > 800) return { paddingTopLeft: [16, so ? 70 : tm ? 120 : 190], paddingBottomRight: [so || BC.contains("panel-min") ? 16 : 440, 100] };
  return { paddingTopLeft: [10, so ? 70 : tm ? 110 : 170], paddingBottomRight: [10, so ? 100 : sheetPx() + (BC.contains("sheet-open") ? 24 : 150)] };
};
const fit = (b, mz = 14) => (reduce ? map.fitBounds(b, { ...pad(), maxZoom: mz }) : map.flyToBounds(b, { ...pad(), maxZoom: mz, duration: .9 }));
const ir = (lat, lon, r = 3) => fit(L.latLng(lat, lon).toBounds(r * 1000));
map.fitBounds(CFG.bounds, pad());   // el arranque (inicio) acerca a Resistencia–Corrientes

/* ——— pestañas y panel ——— */
function tab(p, abrir = true) {
  $$("#tabs [role=tab]").forEach(b => b.setAttribute("aria-selected", b.dataset.p === p));
  $$(".panel").forEach(s => s.hidden = s.id !== "p-" + p);
  if (abrir) { document.body.classList.add("sheet-open"); document.body.classList.remove("panel-min"); }
  entra($$(`#p-${p} .card`).slice(0, 12), 0, false);
}
$("#tabs").addEventListener("click", e => { const b = e.target.closest("[role=tab]"); if (b) tab(b.dataset.p); });
$("#tabs").addEventListener("keydown", e => {
  const t = $$("#tabs [role=tab]"), i = t.indexOf(document.activeElement); if (i < 0) return;
  const n = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null; if (n === null) return;
  const b = t[(n + t.length) % t.length]; b.focus(); tab(b.dataset.p, false);
});
$("#grip").addEventListener("click", () => document.body.classList.toggle("sheet-open"));
$("#btn-aviso").addEventListener("click", () => $("#d-aviso").showModal());
document.addEventListener("click", e => {
  const g = e.target.closest("[data-go]"); if (g) { const [la, lo, z] = g.dataset.go.split(",").map(Number); ir(la, lo, z || 3); if (innerWidth <= 800) document.body.classList.remove("sheet-open"); return; }
  const s = e.target.closest(".est[data-id]"); if (s) { const x = D.est.find(v => v.id == s.dataset.id); if (x) { ir(x.lat, x.lon, 4); x._m && setTimeout(() => x._m.openPopup(), 400); if (innerWidth <= 800) document.body.classList.remove("sheet-open"); } }
});
document.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches(".est[data-id]")) { e.preventDefault(); e.target.click(); } });

/* ——— capas (dock) ——— */
const on = { est: 1, gfm: 1, pre: 1, ale: 0, vid: 1, cam: 1 };   // las alertas SMN arrancan apagadas
$$(".dk[data-l]").forEach(b => b.addEventListener("click", () => {
  const l = b.dataset.l; on[l] = !on[l]; b.setAttribute("aria-pressed", !!on[l]);
  if (G[l]) on[l] ? map.addLayer(G[l]) : map.removeLayer(G[l]);
  if (l === "gfm") $("#player").hidden = !on.gfm || !D.gfm.length;
  if (l === "cam") camEstado();
}));
{ // minimizar encabezado y panel, y modo solo mapa
  const alt = (id, cls) => $(id).addEventListener("click", e => { const v = BC.toggle(cls); e.currentTarget.setAttribute("aria-expanded", !v); e.currentTarget.title = v ? "Mostrar" : "Minimizar"; });
  alt("#min-top", "top-min"); alt("#min-panel", "panel-min");
  const solo = v => { BC.toggle("solo", v); $("#solo").setAttribute("aria-pressed", v); $("#solo-x").hidden = !v; if (v) BC.remove("sheet-open"); };
  $("#solo").addEventListener("click", () => solo(!BC.contains("solo"))); $("#solo-x").addEventListener("click", () => solo(false));
}
const stamp = (id, iso) => {
  const el = $("#" + id); if (!el || !iso) return;
  const s = document.createElement("p"); s.className = "stamp" + ((Date.now() - P(iso)) > 12 * 36e5 ? " viejo" : "");
  s.textContent = "Datos actualizados " + fmt(iso); el.prepend(s);
};
const fail = (id, t) => { $("#" + id).innerHTML = `<div class="vacio">No se pudo cargar ${t}. Probá de nuevo en unos minutos.</div>`; };

/* ——— ríos (INA y otras redes) ——— */
const spark = (s, w = 84, h = 26) => {
  if (!s || s.length < 2) return "";
  const v = s.map(x => x[1]), lo = Math.min(...v), hi = Math.max(...v), k = hi - lo || 1;
  const pts = v.map((y, i) => `${(i / (v.length - 1) * (w - 6) + 3).toFixed(1)},${(h - 3 - (y - lo) / k * (h - 6)).toFixed(1)}`);
  const l = pts[pts.length - 1].split(",");
  return `<svg class="sp" width="${w}" height="${h}" role="img" aria-label="Altura de los últimos ${v.length} días"><polyline points="${pts.join(" ")}" fill="none" stroke="#0072B2" stroke-width="2" stroke-linejoin="round"/><circle cx="${l[0]}" cy="${l[1]}" r="3" fill="#0072B2"/></svg>`;
};
const trend = e => e.d3 == null ? "" : e.d3 > .05 ? `↑ sube ${nf(e.d3, 2)} m en 3 días` : e.d3 < -.05 ? `↓ baja ${nf(-e.d3, 2)} m en 3 días` : "→ estable en 3 días";
const estIcon = e => {
  const s = EST[e.estado] || EST.sin_cota, big = e.estado === "evacuacion", z = big ? 26 : e.estado === "sin_cota" ? 12 : 18;
  const f = big ? `<svg viewBox="0 0 24 24" width="${z}" height="${z}"><path d="M12 2L23 21H1z" fill="${s.c}" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>` : `<span class="mk${e.estado === "alerta" ? " sq" : ""}" style="width:${z}px;height:${z}px;background:${s.c}"></span>`;
  return L.divIcon({ className: "", html: (big ? '<span class="rp"></span>' : "") + f, iconSize: [z, z] });
};
const estCard = (e, d) => {
  const s = EST[e.estado] || EST.sin_cota;
  return `<div class="card est" data-s="${e.estado}" data-id="${e.id}" tabindex="0" role="button"><div class="row"><div><h4>${esc(e.n)}</h4><small>${esc([e.r, e.d, d != null && `a ${nf(d)} km`].filter(Boolean).join(" · "))}</small></div>${spark(e.serie)}</div>
  <p><b>${e.v != null ? nf(e.v, 2) + " m" : "sin lectura"}</b> <span class="est-tag"><span style="color:${s.c};-webkit-text-stroke:.6px #0006">${s.g}</span> ${s.t}</span></p>
  <small>${trend(e)}${trend(e) ? " · " : ""}${e.t ? fmt(e.t) : ""}${e.alerta ? ` · alerta ${nf(e.alerta, 2)} m / evac. ${nf(e.evac, 2)} m` : ""}</small></div>`;
};
function renderRios(j) {
  D.est = j.estaciones.sort((a, b) => (EST[a.estado]?.o ?? 9) - (EST[b.estado]?.o ?? 9) || a.n.localeCompare(b.n));
  D.est.forEach(e => {
    e._m = L.marker([e.lat, e.lon], { icon: estIcon(e), title: e.n, keyboard: false, zIndexOffset: e.estado === "evacuacion" ? 500 : e.estado === "alerta" ? 300 : 0 })
      .bindPopup(`<h4>${esc(e.n)}</h4><small>${esc([e.r, e.d, e.red].filter(Boolean).join(" · "))}</small><p><b>${e.v != null ? nf(e.v, 2) + " m" : "sin lectura"}</b> · ${EST[e.estado]?.t || ""}</p><p>${trend(e)}</p>${spark(e.serie, 160, 40)}<p><small>${e.t ? fmt(e.t) : ""}</small></p>`).addTo(G.est);
  });
  const con = D.est.filter(e => e.estado !== "sin_cota"), sin = D.est.filter(e => e.estado === "sin_cota");
  $("#rios").innerHTML = con.map(e => estCard(e)).join("") + (sin.length ? `<details class="card"><summary><b>${sin.length} estaciones sin cota cargada</b><br><small>Miden la altura pero no sabemos desde qué altura hay riesgo. Gris no significa “bien”.</small></summary><div style="margin-top:8px">${sin.map(e => estCard(e)).join("")}</div></details>` : "");
  stamp("rios", j.actualizado);
  $("#t-est").textContent = `Ríos: ${D.est.length} estaciones, ${con.filter(e => e.estado !== "normal").length} sobre alerta`;
}

/* ——— alertas SMN ——— */
function renderAlertas(j) {
  D.ale = j.alertas.sort((a, b) => (SEVO[a.severidad] ?? 9) - (SEVO[b.severidad] ?? 9));
  D.ale.forEach(a => {
    const [c, n] = SEV[a.severidad] || ["#666", a.severidad];
    if (a.poligonos?.length) a._l = L.polygon(a.poligonos, { color: c, weight: 2, dashArray: "6 4", fillOpacity: .1, fillColor: c }).bindPopup(`<h4>${esc(a.evento)} · ${n}</h4><small>hasta ${fmt(a.hasta)}</small>`).addTo(G.ale);
  });
  $("#alertas").innerHTML = D.ale.length ? D.ale.map((a, i) => {
    const [, n] = SEV[a.severidad] || ["", a.severidad];
    return `<div class="card al" data-sev="${a.severidad}"><h4>${esc(a.evento)} · ${n}</h4><small>Vigente hasta ${fmt(a.hasta)}</small>
    <details><summary>Leer el aviso</summary><p>${esc(a.texto)}</p></details>${a._l ? `<p><a href="#" data-al="${i}">Ver el área en el mapa</a></p>` : ""}<small><a href="${safe(a.url)}" target="_blank" rel="noopener">Fuente: SMN</a></small></div>`;
  }).join("") : '<div class="vacio">No hay alertas vigentes del SMN para esta zona.</div>';
  stamp("alertas", j.actualizado);
  $("#t-ale").textContent = `Alertas SMN: ${D.ale.length} vigentes`;
}
$("#alertas").addEventListener("click", e => { const a = e.target.closest("[data-al]"); if (a) { e.preventDefault(); fit(D.ale[a.dataset.al]._l.getBounds(), 9); if (innerWidth <= 800) document.body.classList.remove("sheet-open"); } });

/* ——— prensa (se publica sin revisar; el aviso lo dice) ——— */
let fTipo = null, pMax = 30;
const preGrupos = () => {
  const g = new Map();
  D.pre.filter(x => x.precision === "localidad").forEach(x => { const k = x.lat.toFixed(2) + "," + x.lon.toFixed(2); (g.get(k) || g.set(k, []).get(k)).push(x); });
  return [...g.values()];
};
function renderPrensa(j) {
  D.pre = j.eventos.sort((a, b) => P(b.fecha) - P(a.fecha));
  preGrupos().forEach(g => {
    const t = g.map(x => x.tipo).sort((a, b) => TORD.indexOf(a) - TORD.indexOf(b))[0], c = (TIPO[t] || TIPO.general)[1], s = g.length > 1 ? 28 : 20;
    L.marker([g[0].lat, g[0].lon], { icon: L.divIcon({ className: "", html: `<div class="mk" style="width:${s}px;height:${s}px;background:${c}">${g.length > 1 ? g.length : ""}</div>`, iconSize: [s, s] }), keyboard: false })
      .bindPopup(`<h4>${esc(g[0].lugar)}</h4>` + g.slice(0, 5).map(x => `<p>${tipoPill(x.tipo)}<a href="${safe(x.url)}" target="_blank" rel="noopener">${esc(x.titulo)}</a><br><small>${esc(medio(x.medio))} · ${fmt(x.fecha)}</small></p>`).join("") + (g.length > 5 ? `<small>y ${g.length - 5} más (ver pestaña Prensa)</small>` : "")).addTo(G.pre);
  });
  listaPrensa();
  stamp("prensa", j.actualizado);
  const n = D.pre.filter(x => Date.now() - P(x.fecha) < 72 * 36e5).length;
  $("#t-pre").textContent = `Prensa: ${D.pre.length} notas, ${n} en 72 h`;
}
function listaPrensa() {
  const cnt = {}; D.pre.forEach(x => cnt[x.tipo] = (cnt[x.tipo] || 0) + 1);
  const ch = `<div class="fil"><button type="button" class="chip" data-t="" aria-pressed="${!fTipo}">Todas ${D.pre.length}</button>${TORD.filter(t => cnt[t]).map(t => `<button type="button" class="chip" data-t="${t}" aria-pressed="${fTipo === t}">${TIPO[t][0]} ${cnt[t]}</button>`).join("")}</div>`;
  const l = D.pre.filter(x => !fTipo || x.tipo === fTipo);
  const el = $("#prensa"), st = $(".stamp", el);
  el.innerHTML = ch + l.slice(0, pMax).map(x => `<div class="card">${tipoPill(x.tipo)}<a href="${safe(x.url)}" target="_blank" rel="noopener">${esc(x.titulo)}</a>
   <p><small>${esc(medio(x.medio))} · ${rel(x.fecha)} · ${esc(x.lugar || "sin ubicar")}${x.precision !== "localidad" ? " (aprox.)" : ""}</small></p>${x.precision === "localidad" ? `<p><a href="#" data-go="${x.lat},${x.lon},3" role="button">Ver en el mapa</a></p>` : ""}</div>`).join("")
    + (l.length > pMax ? `<button type="button" class="btn sec" id="mas">Mostrar más (${l.length - pMax})</button>` : "") + (l.length ? "" : '<div class="vacio">No hay notas de este tipo.</div>');
  if (st) el.prepend(st);
}
$("#prensa").addEventListener("click", e => {
  const c = e.target.closest("[data-t]"); if (c) { fTipo = c.dataset.t || null; pMax = 30; listaPrensa(); return; }
  if (e.target.id === "mas") { pMax += 30; listaPrensa(); }
  const g = e.target.closest("[data-go]"); if (g) e.preventDefault();
});

/* ——— videos con fecha (solo los que revisamos a mano) ——— */
function renderVideos(j) {
  D.vid = j.videos.sort((a, b) => P(b.fecha) - P(a.fecha));
  D.vid.forEach(v => { if (v.lat != null && v.lon != null) L.marker([v.lat, v.lon], { icon: L.divIcon({ className: "", html: '<div class="mk sq" style="width:22px;height:22px;background:#222">▶</div>', iconSize: [22, 22] }), keyboard: false }).bindPopup(`<h4>${esc(v.titulo)}</h4><small>Publicado ${fdia(v.fecha)} · ${esc(v.fuente || "")}</small><p><a href="${safe(v.url)}" target="_blank" rel="noopener">Ver el original</a></p>`).addTo(G.vid); });
  const q = encodeURIComponent("inundación Chaco"), bus = `<div class="buscar-vid"><a class="btn sec" href="https://www.youtube.com/results?search_query=${q}&sp=CAI%253D" target="_blank" rel="noopener">Buscar en YouTube</a><a class="btn sec" href="https://x.com/search?q=${q}&f=live" target="_blank" rel="noopener">En X</a><a class="btn sec" href="https://www.tiktok.com/search?q=${q}" target="_blank" rel="noopener">En TikTok</a></div>`;
  $("#videos").innerHTML = bus + (D.vid.length ? D.vid.map((v, i) => `<div class="card vid"><h4>${esc(v.titulo)}</h4><small>Publicado el ${P(v.fecha).toLocaleDateString("es-AR", { timeZone: TZ })} · ${esc(v.fuente || "")}${v.lugar ? " · " + esc(v.lugar) : ""}</small>${v.nota ? `<p>${esc(v.nota)}</p>` : ""}
   <p><a href="${safe(v.url)}" target="_blank" rel="noopener">Ver el original</a>${/^[\w-]{11}$/.test(v.yt || "") ? ` · <a href="#" data-yt="${i}">Reproducir aquí</a>` : ""}${v.lat != null ? ` · <a href="#" data-go="${v.lat},${v.lon},3">Ver en el mapa</a>` : ""}</p></div>`).join("")
    : '<div class="vacio"><b>Todavía no hay videos verificados.</b><br>Cargamos solo los que revisamos a mano, con su fecha. Si viste uno, mandalo desde “Enviar”.</div>');
  $("#t-vid") && 0;
}
$("#videos").addEventListener("click", e => {
  const a = e.target.closest("[data-yt]"); if (!a) return; e.preventDefault();
  const v = D.vid[a.dataset.yt]; if (a.closest(".vid").querySelector("iframe")) return;
  a.closest(".vid").insertAdjacentHTML("beforeend", `<iframe src="https://www.youtube-nocookie.com/embed/${v.yt}" title="${esc(v.titulo)}" allow="encrypted-media;picture-in-picture" allowfullscreen loading="lazy"></iframe>`);
});

/* ——— satélite: una pasada por vez, con línea de tiempo ——— */
const CM = "&colormap=" + encodeURIComponent(JSON.stringify({ 0: [0, 0, 0, 0], 1: [0, 114, 178, 230] }));
const VACIO = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
let fechas = [], idx = -1, cur = [], saliendo = [], timer = null;
const mkScene = (s, op) => L.tileLayer(s.tiles + CM, { pane: "gfm", bounds: [[s.bounds[1], s.bounds[0]], [s.bounds[3], s.bounds[2]]], minZoom: Math.max(7, s.min - 2), minNativeZoom: s.min, maxNativeZoom: s.max, maxZoom: 19, opacity: op, errorTileUrl: VACIO, attribution: "Inundación: Copernicus GFM" });
function etiqueta() {
  const f = fechas[idx]; if (!f) return;
  const z = Math.min(...f.e.map(s => Math.max(7, s.min - 2)));
  $("#gfm-l").innerHTML = `<b>Pasada del ${fdia(f.f)}</b> · ${[...new Set(f.e.map(s => s.hora.slice(0, 5)))].slice(0, 3).join(", ")} h · ${f.e.length} escena${f.e.length > 1 ? "s" : ""}${map.getZoom() < z ? "<br>Acercá el mapa para ver el agua detectada." : ""}`;
  $("#gfm-r").setAttribute("aria-valuetext", "Pasada del " + fdia(f.f));
  $("#t-gfm").textContent = `Agua detectada: pasada del ${fdia(f.f)}`;
}
function ver(i, animar = true) {
  if (i === idx || !fechas[i]) return;
  saliendo.forEach(l => G.gfm.removeLayer(l)); saliendo = [];
  const old = cur; idx = i; $("#gfm-r").value = i;
  cur = fechas[i].e.map(s => mkScene(s, 0)); cur.forEach(l => G.gfm.addLayer(l));
  fade(cur, 0, .85); animar ? 0 : 0;
  if (old.length) { saliendo = old; fade(old, .85, 0, () => { old.forEach(l => G.gfm.removeLayer(l)); saliendo = []; }); }
  etiqueta();
}
function play(v) {
  const i = $("#play-i"), b = $("#play");
  clearInterval(timer); timer = null;
  if (v) {
    if (idx >= fechas.length - 1) ver(0);
    timer = setInterval(() => { if (idx >= fechas.length - 1) return play(false); ver(idx + 1); }, 1500);
  }
  i.setAttribute("d", v ? "M7 5h4v14H7zM13 5h4v14h-4z" : "M8 5l11 7-11 7z");
  b.setAttribute("aria-label", v ? "Pausar la línea de tiempo" : "Reproducir la línea de tiempo");
}
$("#play").addEventListener("click", () => play(!timer));
$("#gfm-r").addEventListener("input", e => { play(false); ver(+e.target.value); });
map.on("zoomend", etiqueta);
function renderGfm(j) {
  const m = new Map(); j.escenas.forEach(s => (m.get(s.fecha) || m.set(s.fecha, []).get(s.fecha)).push(s));
  D.gfm = j.escenas; fechas = [...m].sort((a, b) => a[0] < b[0] ? -1 : 1).map(([f, e]) => ({ f, e }));
  if (!fechas.length) return;
  const r = $("#gfm-r"); r.max = fechas.length - 1; $("#player").hidden = false;
  ver(fechas.length - 1);
}

/* ——— cálculo del agua detectada en una zona (cuenta píxeles de los tiles del satélite) ——— */
const cv = document.createElement("canvas"); cv.width = cv.height = 256;
const c2 = cv.getContext("2d", { willReadFrequently: true });
const cache = new Map();
async function tileAlfa(url) {
  try {
    const r = await fetch(url); if (!r.ok) return null;
    const b = await createImageBitmap(await r.blob());
    c2.clearRect(0, 0, 256, 256); c2.drawImage(b, 0, 0); b.close && b.close();
    return c2.getImageData(0, 0, 256, 256).data;           // sin await entre dibujar y leer: el canvas compartido es seguro (RGBA)
  } catch { return null; }
}
async function pool(jobs, n, fn) { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < jobs.length) await fn(jobs[i++]); })); }
async function medir(esc_, lat, lon, r) {
  const z = Math.min(13, Math.max(...esc_.map(s => s.min)));
  const res = 156543.03392 * Math.cos(lat * Math.PI / 180) / 2 ** z, rpx = r * 1000 / res, [cx, cy] = ll2px(lat, lon, z);
  const x0 = Math.floor((cx - rpx) / 256), x1 = Math.floor((cx + rpx) / 256), y0 = Math.floor((cy - rpx) / 256), y1 = Math.floor((cy + rpx) / 256);
  const W = (x1 - x0 + 1) * 256, H = (y1 - y0 + 1) * 256, g = new Uint8Array(W * H), jobs = [];
  for (const s of esc_) for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const [n, w] = tile2ll(tx, ty, z), [sS, e] = tile2ll(tx + 1, ty + 1, z);
    if (e < s.bounds[0] || w > s.bounds[2] || n < s.bounds[1] || sS > s.bounds[3]) continue;
    jobs.push({ s, tx, ty });
  }
  if (!jobs.length) return null;
  await pool(jobs, 6, async ({ s, tx, ty }) => {
    // tile crudo (sin colormap): alfa 255 = dato válido, 0 = sin dato; rojo 1 = agua, 0 = tierra. Verificado en escenas de 01/10 y 13/10.
    const a = await tileAlfa(s.tiles.replace("{z}", z).replace("{x}", tx).replace("{y}", ty)); if (!a) return;
    const ox = (tx - x0) * 256, oy = (ty - y0) * 256;
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const i = (y * 256 + x) * 4, v = a[i + 3] < 128 ? 0 : a[i] > 0 ? 2 : 1, k = (oy + y) * W + ox + x; if (v > g[k]) g[k] = v; }
  });
  const c = contar(g, W, H, cx - x0 * 256, cy - y0 * 256, rpx);
  return { ...c, km2: c.F * res * res / 1e6, cob: c.N ? c.V / c.N : 0, agua: c.N ? c.F / c.N : 0 };
}
// ponytail: mide hasta 8 fechas hacia atrás y se queda con 2 pasadas que cubran ≥10 % de la zona. Con r=25 km son ~40 tiles por escena; si pesa, bajar el tope de radio.
async function analizar(lat, lon, r, ok, tok) {
  const bb = L.latLng(lat, lon).toBounds(r * 2000), out = [];
  const [s, w, n, e] = [bb.getSouth(), bb.getWest(), bb.getNorth(), bb.getEast()];
  let probadas = 0;
  for (const f of [...fechas].reverse()) {
    const es = f.e.filter(x => !(e < x.bounds[0] || w > x.bounds[2] || n < x.bounds[1] || s > x.bounds[3])); if (!es.length) continue;
    if (++probadas > 8) break;
    const key = `${f.f}|${lat.toFixed(3)}|${lon.toFixed(3)}|${r}`;
    let m = cache.get(key); if (!m) { m = await medir(es, lat, lon, r); cache.set(key, m); }
    if (tok !== ok.tok) return;
    if (m && m.cob >= .1) { out.push({ f: f.f, ...m }); ok.cb(out); if (out.length === 2) break; }
  }
  if (!out.length) ok.cb([]);
}

/* ——— zona: búsqueda, resumen y compartir ——— */
const Z = { lat: null, lon: null, r: 10, n: "" };
let tokZ = 0;
const pillCob = c => c < .6 ? `<span class="pill w">Cobertura parcial</span>` : "";
function nearby() {
  const e = D.est.map(x => ({ x, d: hav(Z.lat, Z.lon, x.lat, x.lon) })).filter(o => o.d <= Math.max(30, Z.r + 10)).sort((a, b) => a.d - b.d).slice(0, 4);
  const al = D.ale.filter(a => a.poligonos?.some(p => pip(Z.lat, Z.lon, p) || p.some(([la, lo]) => hav(Z.lat, Z.lon, la, lo) <= Z.r)));
  const pr = D.pre.filter(x => x.precision === "localidad" && hav(Z.lat, Z.lon, x.lat, x.lon) <= Z.r && Date.now() - P(x.fecha) < 14 * 864e5);
  const sinU = D.pre.filter(x => x.precision !== "localidad").length;
  return `<h3 class="sec">Ríos cercanos</h3>${e.length ? e.map(o => estCard(o.x, o.d)).join("") : '<p class="mut">No hay estaciones de medición en ese radio.</p>'}
  <h3 class="sec">Alertas del SMN que alcanzan la zona</h3>${al.length ? al.map(a => `<div class="card al" data-sev="${a.severidad}"><h4>${esc(a.evento)} · ${(SEV[a.severidad] || ["", a.severidad])[1]}</h4><small>hasta ${fmt(a.hasta)}</small></div>`).join("") : '<p class="mut">Ninguna alerta vigente toca esta zona.</p>'}
  <h3 class="sec">Prensa en los últimos 14 días</h3>${pr.length ? pr.slice(0, 5).map(x => `<div class="card">${tipoPill(x.tipo)}<a href="${safe(x.url)}" target="_blank" rel="noopener">${esc(x.titulo)}</a><p><small>${esc(medio(x.medio))} · ${rel(x.fecha)} · ${esc(x.lugar)}</small></p></div>`).join("") + (pr.length > 5 ? `<p class="mut">Y ${pr.length - 5} más en la pestaña Prensa.</p>` : "") : '<p class="mut">No hay notas ubicadas en esta zona. Eso no significa que no haya pasado nada.</p>'}
  ${sinU ? `<p class="nota">Otras ${sinU} notas hablan de la provincia o región en general y no se pueden ubicar.</p>` : ""}`;
}
function pintaSat(res) {
  const el = $("#z-sat"); if (!el) return;
  if (!res.length) { el.innerHTML = `<p class="nota"><b>Ninguna pasada reciente del satélite cubre esta zona.</b> El satélite no ve todo y la zona de datos es el norte argentino. Sin dato no significa sin agua.</p>`; return; }
  const a = res[0], b = res[1], hay = a.km2 >= .5;
  const dif = b ? a.km2 - b.km2 : null;
  el.innerHTML = `<span class="pill${hay ? " w" : ""}">${hay ? "Hay agua detectada en la zona" : "Sin agua detectada en esta pasada"}</span> ${pillCob(a.cob)}
  <div class="big" style="margin-top:8px"><span id="z-km">0</span> <small>km² con agua</small></div>
  <div class="bar" aria-hidden="true"><i id="z-bar"></i></div><small class="mut">${nf(a.agua * 100, a.agua < .1 ? 1 : 0)} % de la zona (círculo de ${Z.r} km)</small>
  <div class="kv"><span>Pasada del satélite</span><span>${fdia(a.f)}</span><span>Zona cubierta por esa pasada</span><span>${nf(a.cob * 100)} %</span>
  <span>${b ? "Cambio desde la pasada del " + fdia(b.f) : "Pasada anterior"}</span><span>${b ? `${dif > 0 ? "+" : dif < 0 ? "−" : ""}${nf(Math.abs(dif), 1)} km²` : "midiendo…"}</span></div>
  ${b && Math.abs(a.cob - b.cob) > .3 ? '<p class="nota">Las dos pasadas cubrieron partes distintas de la zona: el cambio puede ser falso.</p>' : ""}
  <p class="nota">Muestra hasta dónde llegó el agua, no su profundidad. No ve bien bajo vegetación densa ni entre edificios. Es una estimación automática.</p>`;
  tick($("#z-km"), a.km2, a.km2 < 10 ? 1 : 0);
  const bar = $("#z-bar"), w = Math.min(100, a.agua * 100) + "%";
  if (mov) { try { M.animate(bar, { width: ["0%", w] }, { duration: .8, ease: [.22, 1, .36, 1] }); } catch { } } bar.style.width = w;
  const i = fechas.findIndex(f => f.f === a.f); if (i >= 0) ver(i);
}
const compartir = async () => {
  const u = location.href;
  try { if (navigator.share) { await navigator.share({ title: "Inundaciones: " + Z.n, url: u }); return; } await navigator.clipboard.writeText(u); toast("Enlace copiado."); } catch { toast("Copiá el enlace desde la barra del navegador."); }
};
function setZona(lat, lon, nombre, r = Z.r, ap = false) {   // ap: punto privado (casa o GPS); el enlace guarda solo una zona aproximada
  Object.assign(Z, { lat, lon, r, ap, n: nombre || "Punto en el mapa" });
  const t = ++tokZ;
  G.zona.clearLayers();
  L.circle([lat, lon], { radius: r * 1000, color: "#0a63c9", weight: 2, dashArray: "6 6", fillOpacity: .04, interactive: false }).addTo(G.zona);
  L.marker([lat, lon], { icon: L.divIcon({ className: "", html: '<div class="yo"></div>', iconSize: [16, 16] }), interactive: false, keyboard: false }).addTo(G.zona);
  history.replaceState(null, "", ap ? `#z=${lat.toFixed(2)},${lon.toFixed(2)},${r}&ap=1&n=${encodeURIComponent("Mi dirección")}` : `#z=${lat.toFixed(3)},${lon.toFixed(3)},${r}&n=${encodeURIComponent(Z.n)}`);
  $$("#radio .chip").forEach(b => b.setAttribute("aria-pressed", +b.dataset.r === r));
  tab("resumen"); if (innerWidth <= 800) document.body.classList.add("sheet-open");
  $("#zona").innerHTML = `<div class="card beam"><div class="zh"><div><h2>${esc(Z.n)}</h2><span class="mut">Radio ${r} km · ${lat.toFixed(3)}, ${lon.toFixed(3)}</span></div><button type="button" class="btn sec" id="z-share">Compartir</button></div>
   <h3 class="sec" style="margin-top:12px">¿Hay agua en tu punto?</h3><div id="c-ahora"><div class="skel" style="width:60%"></div><div class="skel"></div><p class="mut">Consultando las últimas fotos del satélite…</p></div></div>
   <h3 class="sec">Fotos del satélite, fecha por fecha</h3><div class="card" id="c-fotos"><div class="skel"></div><div class="skel" style="width:70%"></div></div>
   <h3 class="sec">Qué se espera en los próximos meses</h3><div class="card" id="c-prev"><div class="skel" style="width:70%"></div><div class="skel"></div><p class="mut">Consultando el pronóstico de caudales…</p></div>
   <h3 class="sec">Agua detectada por radar en el radio de ${r} km</h3><div class="card" id="z-sat"><div class="skel" style="width:60%"></div><div class="skel"></div><div class="skel" style="width:80%"></div><p class="mut">Midiendo el agua detectada por el satélite…</p></div>${nearby()}`;
  $("#z-share").onclick = compartir; entra($$("#zona > *"), 0, false);
  fit(L.latLng(lat, lon).toBounds(r * 2000), 14);
  casa(lat, lon, t);
  if (!fechas.length) return pintaSat([]);
  const ok = { tok: t, cb: res => t === tokZ && pintaSat(res) };
  Object.defineProperty(ok, "tok", { get: () => tokZ });
  analizar(lat, lon, r, ok, t).catch(() => t === tokZ && pintaSat([]));
}
$("#radio").addEventListener("click", e => { const b = e.target.closest("[data-r]"); if (!b) return; const r = +b.dataset.r; $$("#radio .chip").forEach(x => x.setAttribute("aria-pressed", x === b)); Z.r = r; if (Z.lat != null) setZona(Z.lat, Z.lon, Z.n, r, Z.ap); });

/* búsqueda: lugares locales + Georef al escribir; Nominatim (barrios y calles) al apretar Enter */
const q = $("#q"), sug = $("#sug"); let items = [], sel = -1, tokQ = 0;
function muestra(l) {
  items = l; sel = -1;
  sug.innerHTML = l.map((x, i) => `<li role="option" id="s${i}" data-i="${i}">${esc(x.n)}<small>${esc(x.sub)}</small></li>`).join("");
  sug.hidden = !l.length; q.setAttribute("aria-expanded", !!l.length);
}
const local = t => { const n = norm(t); return D.lug.filter(l => l[5].includes(n)).sort((a, b) => a[5].indexOf(n) - b[5].indexOf(n) || a[0].length - b[0].length).slice(0, 5).map(l => ({ n: l[0], lat: l[1], lon: l[2], sub: l[3] })); };
async function georef(t) {
  const j = await fetch("https://apis.datos.gob.ar/georef/api/localidades?max=6&campos=nombre,centroide,provincia.nombre&aplanar=true&nombre=" + encodeURIComponent(t)).then(r => r.json());
  return j.localidades.map(l => ({ n: lugar(l.nombre.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase())), lat: l.centroide_lat, lon: l.centroide_lon, sub: l.provincia_nombre }));
}
async function nominatim(t) {
  const j = await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=ar&accept-language=es&q=" + encodeURIComponent(t)).then(r => r.json());
  return j.map(x => { const p = x.display_name.split(", "); return { n: p.slice(0, 2).join(", "), lat: +x.lat, lon: +x.lon, sub: p.slice(-2, -1)[0] || "", ap: true }; });
}
const sugiere = deb(async t => {
  const k = ++tokQ, l = local(t); muestra(l.concat(t.length >= 3 ? dir(t) : []));
  if (t.length < 3) return;
  try { const g = await georef(t); if (k !== tokQ) return; const vistos = new Set(l.map(x => norm(x.n))); muestra([...l, ...g.filter(x => !vistos.has(norm(x.n)))].slice(0, 6).concat(dir(t))); } catch { }
}, 250);
q.addEventListener("input", () => q.value.trim().length >= 2 ? sugiere(q.value.trim()) : muestra([]));
const dir = t => [{ n: "Buscar «" + t + "» como dirección", sub: "Calle y número, con la ciudad", dir: true }];
const elige = x => { if (x.dir) return buscaDir(q.value.trim()); muestra([]); q.value = x.n; setZona(x.lat, x.lon, x.n, Z.r, !!x.ap); q.blur(); };
sug.addEventListener("mousedown", e => { const li = e.target.closest("li"); if (li) { e.preventDefault(); elige(items[li.dataset.i]); } });
q.addEventListener("keydown", e => {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (!items.length) return; sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length; $$("#sug li").forEach((li, i) => li.setAttribute("aria-selected", i === sel)); q.setAttribute("aria-activedescendant", "s" + sel); }
  if (e.key === "Escape") muestra([]);
});
q.addEventListener("blur", () => setTimeout(() => muestra([]), 150));
async function buscaDir(t) {
  toast("Buscando…", 1500);
  try { const l = await nominatim(t); if (!l.length) return toast("No encontramos ese lugar. Probá con calle, número, ciudad y provincia."); l.length === 1 ? elige(l[0]) : (muestra(l), q.focus()); } catch { toast("No pudimos buscar ahora. Probá con el nombre de la localidad."); }
}
$("#buscar").addEventListener("submit", e => {
  e.preventDefault(); const t = q.value.trim(); if (t.length < 2) return;
  if (sel >= 0) return elige(items[sel]);
  if (items.length && norm(items[0].n) === norm(t)) return elige(items[0]);
  buscaDir(t);
});
$("#gps").addEventListener("click", () => {
  if (!navigator.geolocation) return toast("Tu navegador no permite usar la ubicación.");
  toast("Buscando tu ubicación…", 2500);
  navigator.geolocation.getCurrentPosition(p => setZona(p.coords.latitude, p.coords.longitude, "Mi ubicación", Z.r, true),   // punto exacto solo en memoria; el enlace lo redondea a ~1 km
    () => toast("No pudimos ubicarte. Revisá el permiso de ubicación o buscá tu localidad."), { timeout: 10000, maximumAge: 60000 });
});
const pickBtn = $("#pick");
const pick = v => { document.body.classList.toggle("pick", v); pickBtn.setAttribute("aria-pressed", v); if (v) { toast("Tocá el mapa donde quieras mirar. Esc para cancelar.", 5000); if (innerWidth <= 800) document.body.classList.remove("sheet-open"); } };
pickBtn.addEventListener("click", () => pick(!document.body.classList.contains("pick")));
map.on("click", e => { if (document.body.classList.contains("pick")) { pick(false); setZona(+e.latlng.lat.toFixed(3), +e.latlng.lng.toFixed(3), "Punto en el mapa"); } });
document.addEventListener("keydown", e => { if (e.key === "Escape" && document.body.classList.contains("pick")) pick(false); });

/* ——— tu casa: fotos reales Sentinel-2 por fecha, comparación y pronóstico ——— */
const PC = "https://planetarycomputer.microsoft.com/api/";
const OM = ["https://flood-api.open-meteo.com/v1/flood", "https://seasonal-api.open-meteo.com/v1/seasonal"];
const ESTF = { agua: ["Agua", "r"], cerca: ["Agua cerca", "w"], seco: ["Sin agua", "ok"], nube: ["Nubes", ""], nd: ["Sin dato", ""], nm: ["Sin medir", ""] };
const MESL = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const ART = d => d.toLocaleDateString("sv-SE", { timeZone: TZ });          // AAAA-MM-DD en hora argentina
const ext = u => fetch(u).then(r => { if (!r.ok) throw Error(r.status); return r.json(); });   // sin cache:"no-cache": evita una consulta previa (CORS) a terceros
const mem = {}, una = (k, f) => mem[k] ??= f().catch(e => { delete mem[k]; throw e; });
const medido = {};                                                          // id de foto + punto -> { e, pct }
const C = { fotos: [], A: 0, B: 0, v: 50, capas: [null, null], agua: null, n: 0, toco: false, mide: false, key: "" };
map.createPane("fotoA").style.zIndex = 240; map.createPane("fotoB").style.zIndex = 241; map.createPane("agua").style.zIndex = 246;
const BOX = { type: "Polygon", coordinates: [[[-62.9, -29.1], [-57.2, -29.1], [-57.2, -23.9], [-62.9, -23.9], [-62.9, -29.1]]] };
const V0 = () => innerWidth > 800 ? 22 : 30;                                                    // la línea arranca a la izquierda: casi todo el mapa muestra el "después" con el agua nueva
const MOS = {};                                                                                  // fecha -> id de mosaico (todas las pasadas de ese día, toda la región)
const mosaico = dia => MOS[dia] ??= fetch(PC + "data/v1/mosaic/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
  collections: ["sentinel-2-l2a"], "filter-lang": "cql2-json", metadata: { name: "s2-" + dia },
  filter: { op: "and", args: [{ op: "s_intersects", args: [{ property: "geometry" }, BOX] }, { op: "anyinteracts", args: [{ property: "datetime" }, { interval: [dia + "T00:00:00Z", dia + "T23:59:59Z"] }] }] } }) })
  .then(r => { if (!r.ok) throw Error(r.status); return r.json(); }).then(j => j.searchid).catch(e => { delete MOS[dia]; throw e; });
const MT = id => `${PC}data/v1/mosaic/${id}/tiles/WebMercatorQuad/`;
const NDWI = "&assets=B03&assets=B08&assets=B02&expression=(B03-B08)/(B03%2BB08);B02;B08&asset_as_band=true&rescale=-1,1&rescale=0,4000&rescale=0,6000";   // R = NDWI, G = azul (nubes), B = infrarrojo

/* clases SCL de Sentinel-2: 6 agua, 3 sombra, 8-10 nube, 0 sin dato. c = clases de un cuadrado n×n (n impar) centrado en el punto */
function clasifica(c, n) {
  const m = n >> 1, cuenta = (f, r) => { let a = 0, t = 0; for (let y = m - r; y <= m + r; y++) for (let x = m - r; x <= m + r; x++) { t++; if (f(c[y * n + x])) a++; } return [a, t]; };
  const nube = k => k === 3 || k === 8 || k === 9 || k === 10;
  const [c0, ct] = cuenta(k => k === 0, 1), [cn] = cuenta(nube, 1), [cw] = cuenta(k => k === 6, 1), [aw, at] = cuenta(k => k === 6, m);
  const e = c0 >= ct / 2 ? "nd" : cn >= ct / 2 ? "nube" : cw >= ct / 2 ? "agua" : aw / at >= .1 ? "cerca" : "seco";
  return { e, pct: Math.round(aw / at * 100) };
}
async function sclEn(lat, lon, id) {
  const n = 31, dy = 150 / 110574, dx = 150 / (111320 * Math.cos(lat * Math.PI / 180));          // cuadrado de 300 m
  const u = `${PC}data/v1/item/bbox/${(lon - dx).toFixed(6)},${(lat - dy).toFixed(6)},${(lon + dx).toFixed(6)},${(lat + dy).toFixed(6)}/${n}x${n}.png?collection=sentinel-2-l2a&item=${id}&assets=SCL&asset_bidx=SCL%7C1`;
  const r = await fetch(u); if (!r.ok) throw Error(r.status);
  const b = await createImageBitmap(await r.blob()), cv = document.createElement("canvas"); cv.width = cv.height = n;
  const x = cv.getContext("2d", { willReadFrequently: true }); x.drawImage(b, 0, 0);
  const d = x.getImageData(0, 0, n, n).data, k = new Uint8Array(n * n);
  for (let i = 0; i < k.length; i++) k[i] = d[i * 4 + 3] ? d[i * 4] : 0;                         // gris = clase SCL; transparente = sin dato
  return clasifica(k, n);
}
async function fotos(lat, lon) {
  const d0 = ART(new Date(Date.now() - 75 * 864e5));
  const j = await fetch(PC + "stac/v1/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
    collections: ["sentinel-2-l2a"], intersects: { type: "Point", coordinates: [lon, lat] }, datetime: d0 + "T00:00:00Z/..", limit: 100,
    sortby: [{ field: "datetime", direction: "desc" }] }) }).then(r => { if (!r.ok) throw Error(r.status); return r.json(); });
  const d = new Map();                                                                          // un cuadrante por fecha: el menos nublado
  for (const f of j.features) { const dia = f.properties.datetime.slice(0, 10), nub = Math.round(f.properties["eo:cloud_cover"] ?? 100); if (!d.has(dia) || d.get(dia).nub > nub) d.set(dia, { f: dia, id: f.id, nub }); }
  return [...d.values()].sort((a, b) => b.f.localeCompare(a.f));
}
const claro = f => f.e ? f.e !== "nube" && f.e !== "nd" && f.e !== "nm" : f.nub < 65;
function defecto() {
  const ok = C.fotos.map((f, i) => [f, i]).filter(([f]) => claro(f)), B = ok.length ? ok[0][1] : 0;
  const lejos = ok.find(([f, i]) => i > B && P(C.fotos[B].f) - P(f.f) >= 14 * 864e5), sig = ok.find(([, i]) => i > B);
  return [(lejos || sig || [0, Math.min(1, C.fotos.length - 1)])[1], B];
}
const etq = f => `${fdia(f.f)}${f.e ? " · " + ESTF[f.e][0] : ""} · nubes ${f.nub} %`;

function clip() {
  if (!C.capas[1]) return;
  const s = map.getSize(), x = s.x * C.v / 100, a = map.containerPointToLayerPoint([0, 0]), b = map.containerPointToLayerPoint([s.x, s.y]), m = map.containerPointToLayerPoint([x, 0]);
  for (const n of ["fotoB", "agua"]) map.getPane(n).style.clip = `rect(${a.y}px,${b.x}px,${b.y}px,${m.x}px)`;   // el agua nueva va solo del lado "después"
  const ln = $("#cmp-line"); ln.style.left = x + "px"; ln.setAttribute("aria-valuenow", Math.round(C.v));
}
map.on("move zoom viewreset resize", clip);
function marca() {
  $$("#c-fotos .ft").forEach(b => b.classList.toggle("sel", +b.dataset.i === C.A || +b.dataset.i === C.B));
  if (C.capas[1]) { $("#cmp-a").value = C.A; $("#cmp-b").value = C.B; }
}
/* ——— agua nueva: NDWI de Sentinel-2 (10 m) en la fecha "después" contra la fecha "antes", calculado en el navegador ——— */
const lim = (() => { let n = 0; const q = []; const sig = () => { if (n < 6 && q.length) { n++; q.shift()(); } }; return f => new Promise((ok, no) => { q.push(() => f().then(ok, no).finally(() => { n--; sig(); })); sig(); }); })();
async function pix(id, c, k = 0) {                                                               // 256×256 RGBA del NDWI de ese día en ese tile
  try {
    const r = await lim(() => fetch(`${MT(id)}${c.z}/${c.x}/${c.y}@1x.png?collection=sentinel-2-l2a${NDWI}`)); if (!r.ok) throw Error(r.status);
    const b = await createImageBitmap(await r.blob()), cv = new OffscreenCanvas(256, 256), x = cv.getContext("2d", { willReadFrequently: true }); x.drawImage(b, 0, 0);
    return x.getImageData(0, 0, 256, 256).data;
  } catch (e) { if (k < 2) { await new Promise(f => setTimeout(f, 700 * (k + 1))); return pix(id, c, k + 1); } return null; }
}
// clases: 0 sin dato, 1 tierra, 2 agua, 3 nube o bruma. NDWI > 0,05 y no brillante en azul
const clase = (d, i) => !d[i + 3] ? 0 : d[i + 1] * 4000 / 255 > 1800 && d[i] / 127.5 - 1 < .1 ? 3 : d[i] / 127.5 - 1 > .05 ? 2 : 1;
function pinta(a, b, out) {                                                                      // a = antes, b = después (RGBA del NDWI); out = RGBA de salida
  for (let y = 0, i = 0; y < 256; y++) for (let x = 0; x < 256; x++, i += 4) {
    const cb = b ? clase(b, i) : 0, ca = a ? clase(a, i) : 0; let r, g, bl, al = 0;
    if (cb === 2) {
      const nuevo = ca === 1 && b[i] - a[i] > 13;                                                // 13 ≈ 0,1 de NDWI
      [r, g, bl, al] = nuevo ? [0, 70, 255, 190] : ca === 2 ? [90, 170, 255, 90] : ca === 1 ? [90, 170, 255, 90] : [60, 130, 255, 130];
    } else if (cb === 0 || cb === 3) { if (((x + y) >> 2) & 1) [r, g, bl, al] = [90, 90, 90, 90]; }   // rayado gris: sin dato
    const o = i; out[o] = r; out[o + 1] = g; out[o + 2] = bl; out[o + 3] = al;
  }
}
const Agua = L.GridLayer.extend({
  createTile(c, listo) {
    const cv = document.createElement("canvas"); cv.width = cv.height = 256; const o = this.options;
    Promise.all([pix(o.a, c), pix(o.b, c)]).then(([a, b]) => {
      if (!this._map) return; const im = new ImageData(256, 256); pinta(a, b, im.data); cv.getContext("2d").putImageData(im, 0, 0); listo(null, cv);
    }).catch(() => listo(null, cv));
    return cv;
  }
});
async function mostrar() {
  const n = ++C.n; let ida, idb;
  try { [ida, idb] = await Promise.all([mosaico(C.fotos[C.A].f), mosaico(C.fotos[C.B].f)]); } catch { toast("No se pudieron preparar las fotos del satélite. Probá de nuevo en unos minutos."); return; }
  if (n !== C.n) return;
  C.capas.forEach(l => l && map.removeLayer(l)); C.agua && map.removeLayer(C.agua);
  C.capas = [ida, idb].map((id, k) => L.tileLayer(`${MT(id)}{z}/{x}/{y}@1x.png?collection=sentinel-2-l2a&assets=visual&asset_bidx=visual%7C1,2,3`,
    { pane: k ? "fotoB" : "fotoA", minNativeZoom: 9, maxNativeZoom: 14, maxZoom: 19, errorTileUrl: VACIO, attribution: k ? "" : "Sentinel-2 © ESA/Copernicus, vía Microsoft Planetary Computer" }).addTo(map));
  C.agua = new Agua({ pane: "agua", a: ida, b: idb, minZoom: 9, minNativeZoom: 9, maxNativeZoom: 14, maxZoom: 19, attribution: "Agua nueva: cálculo propio sobre Sentinel-2" });
  if (on.cam) C.agua.addTo(map);
  const ln = $("#cmp-line"); $("#cmp").hidden = ln.hidden = false; document.body.classList.add("fotos");
  $(".l", ln).textContent = "Antes · " + fdia(C.fotos[C.A].f); $(".r", ln).textContent = "Después · " + fdia(C.fotos[C.B].f);
  $("#leyenda-f").textContent = `Agua nueva: aparece el ${fdia(C.fotos[C.B].f)} y no estaba el ${fdia(C.fotos[C.A].f)}`;
  marca(); clip();
}
function camEstado() { if (C.agua) on.cam ? C.agua.addTo(map) : map.removeLayer(C.agua); $("#leyenda").hidden = !on.cam; }
function cerrar() {
  C.n++; C.capas.forEach(l => l && map.removeLayer(l)); C.capas = [null, null]; C.agua && map.removeLayer(C.agua); C.agua = null;
  $("#cmp").hidden = $("#cmp-line").hidden = true; document.body.classList.remove("fotos"); for (const n of ["fotoB", "agua"]) map.getPane(n).style.clip = "";
}
function opciones() { const o = C.fotos.map((f, i) => `<option value="${i}">${etq(f)}</option>`).join(""); $("#cmp-a").innerHTML = $("#cmp-b").innerHTML = o; }
function listaFotos() {
  const el = $("#c-fotos"); if (!el) return;
  el.innerHTML = `<div class="ftl">${C.fotos.map((f, i) => { const [t, c] = f.e ? ESTF[f.e] : ["midiendo…", ""]; return `<button type="button" class="ft" data-i="${i}"><b>${fdia(f.f)}</b><span class="pill ${c}">${t}</span><small>nubes ${f.nub} %</small></button>`; }).join("")}</div>
   <p class="nota">Fotos reales del satélite Sentinel-2 (10 m por píxel), una por fecha. Tocá una fecha para verla en el mapa y arrastrá la línea para compararla con otra. Con nubes el satélite no ve el suelo.</p>`;
  marca();
}
function ahora() {
  const el = $("#c-ahora"); if (!el) return;
  const ap = Z.ap ? '<p class="nota">El enlace guarda una zona aproximada (a ~1 km) para no publicar tu dirección. Para ver tu punto exacto, buscala de nuevo.</p>' : "";
  if (!C.fotos.length) { el.innerHTML = `<span class="pill">Sin fotos recientes</span><p class="nota">El satélite no pasó por este punto en los últimos 75 días, o queda fuera de su cobertura. Sin dato no significa sin agua.</p>${ap}`; return; }
  if (C.mide) { el.innerHTML = `<div class="skel" style="width:70%"></div><div class="skel"></div><p class="mut">Midiendo ${C.fotos.filter(f => f.e).length} de ${C.fotos.length} fotos del satélite sobre tu punto…</p>`; return; }
  const cl = C.fotos.filter(f => claro(f) && f.e);
  if (!cl.length) { el.innerHTML = `<span class="pill">Sin foto clara</span><p class="nota">Todas las fotos de los últimos 75 días tienen nubes sobre tu punto, así que no se puede afirmar nada. Última pasada: ${fdia(C.fotos[0].f)}.</p>${ap}`; return; }
  const a = cl[0], mojado = a.e === "agua" || a.e === "cerca", dias = Math.round((Date.now() - P(a.f)) / 864e5), cam = cl.find(f => (f.e === "agua") !== (a.e === "agua"));
  const t = a.e === "agua" ? "Hay agua sobre tu punto" : a.e === "cerca" ? "Hay agua a menos de 150 m" : "Sin agua en tu punto";
  const h = a.e === "agua" ? (cam ? `El ${fdia(cam.f)} no había: el agua apareció después.` : "Aparece en todas las fotos claras de los últimos 75 días: puede ser un río o una laguna permanente.")
    : cam ? `El ${fdia(cam.f)} había agua sobre el punto y ya no.` : mojado ? "En las fotos claras anteriores tampoco estaba sobre el punto." : "En ninguna foto clara de los últimos 75 días hubo agua sobre el punto.";
  el.innerHTML = `<span class="pill ${ESTF[a.e][1]}">${t}</span> <small class="mut">foto del ${fdia(a.f)}${dias > 10 ? ` (hace ${dias} días)` : ""}</small>
   <p class="big2">${h}</p>${a.e === "cerca" ? `<p class="nota">${a.pct} % del entorno de 150 m aparece con agua.</p>` : ""}
   <p class="nota">El satélite detecta superficie de agua, no su profundidad. Una sombra o un techo oscuro pueden confundirse con agua. Mirá las fotos de abajo para confirmarlo.</p>${ap}`;
}
async function casa(lat, lon, t) {
  cerrar(); C.key = lat + "," + lon; C.toco = false; C.mide = true; C.fotos = [];
  const vivo = () => t === tokZ;
  pronostico(lat, lon, vivo);
  let fs; try { fs = await una("f" + C.key, () => fotos(lat, lon)); } catch { fs = null; }
  if (!vivo()) return;
  if (!fs) { C.mide = false; $("#c-ahora").innerHTML = '<span class="pill">Sin conexión con el satélite</span><p class="nota">No pudimos consultar las fotos ahora. Probá de nuevo en unos minutos.</p>'; $("#c-fotos").innerHTML = '<p class="mut">No disponibles.</p>'; return; }
  const k = f => C.key + f.id;
  C.fotos = fs.map(f => ({ ...f, ...medido[k(f)] }));
  [C.A, C.B] = defecto(); opciones(); listaFotos(); ahora();
  if (C.fotos.length) { C.v = V0(); mostrar(); }
  const cola = C.fotos.slice(0, 24);
  await pool(cola.filter(f => !f.e), 4, async f => {
    try { Object.assign(f, medido[k(f)] = await sclEn(lat, lon, f.id)); } catch { f.e = "nd"; }
    if (vivo()) { listaFotos(); ahora(); }
  });
  if (!vivo()) return;
  C.fotos.slice(24).forEach(f => f.e = "nm"); C.mide = false;
  ahora(); listaFotos(); opciones();
  if (!C.toco && C.fotos.length) { const A = C.A, B = C.B; [C.A, C.B] = defecto(); if (A !== C.A || B !== C.B) mostrar(); else marca(); }
  else marca();
}
$("#zona").addEventListener("click", e => {
  const b = e.target.closest("#c-fotos .ft"); if (!b) return; const i = +b.dataset.i; C.toco = true;
  if (!C.capas[1]) { [C.A, C.B] = defecto(); C.v = V0(); }
  C.B = i; if (C.A <= i) C.A = Math.min(i + 1, C.fotos.length - 1);                             // "antes" siempre es una fecha más vieja que "después"
  mostrar();
});
$("#cmp-a").onchange = e => { C.toco = true; C.A = +e.target.value; mostrar(); };
$("#cmp-b").onchange = e => { C.toco = true; C.B = +e.target.value; mostrar(); };
$("#cmp-x").onclick = cerrar;
{ // arrastrar la línea (o flechas del teclado) para comparar
  const ln = $("#cmp-line"), pon = v => { C.v = Math.max(3, Math.min(97, v)); clip(); };
  ln.addEventListener("pointerdown", e => { ln.setPointerCapture(e.pointerId); ln.dataset.d = 1; });
  ln.addEventListener("pointermove", e => { if (ln.dataset.d) pon(e.clientX / innerWidth * 100); });
  ln.addEventListener("pointerup", () => delete ln.dataset.d);
  ln.addEventListener("keydown", e => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); pon(C.v + (e.key === "ArrowLeft" ? -4 : 4)); } });
}

/* percentil de v dentro de un arreglo (% de valores menores) */
const pct = (a, v) => a.length ? a.filter(x => x < v).length / a.length * 100 : NaN;
const nivel = p => p >= 90 ? ["Muy alto", "r"] : p >= 75 ? ["Alto", "w"] : p >= 25 ? ["Normal", "ok"] : ["Bajo", ""];
async function pronostico(lat, lon, vivo) {
  const q = `latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}`, hoy = ART(new Date()), ayer = ART(new Date(Date.now() - 864e5));
  const [fl, hi, se] = await Promise.allSettled([
    una("p1" + q, () => ext(`${OM[0]}?${q}&daily=river_discharge,river_discharge_median,river_discharge_p75&forecast_days=210&past_days=2`)),
    una("p2" + q, () => ext(`${OM[0]}?${q}&daily=river_discharge&start_date=1984-01-01&end_date=${ayer}`)),
    una("p3" + q, () => ext(`${OM[1]}?${q}&monthly=precipitation_anomaly,precipitation_mean&forecast_days=210`))]);
  const el = $("#c-prev"); if (!el || !vivo()) return;
  const falla = () => { el.innerHTML = '<span class="pill">Sin pronóstico</span><p class="nota">No pudimos consultar el pronóstico de caudales ahora. Probá más tarde o mirá la pestaña Ríos.</p>'; };
  if (fl.status !== "fulfilled" || hi.status !== "fulfilled") return falla();
  try {
    const F = fl.value, H = hi.value, por = Array.from({ length: 12 }, () => ({ d: [], m: new Map() }));
    H.daily.time.forEach((t, i) => { const v = H.daily.river_discharge[i]; if (v == null) return; const o = por[+t.slice(5, 7) - 1], y = t.slice(0, 4), s = o.m.get(y) || [0, 0]; o.d.push(v); s[0] += v; s[1]++; o.m.set(y, s); });
    const medias = por.map(o => [...o.m.values()].filter(s => s[1] >= 20).map(s => s[0] / s[1]));  // caudal medio de ese mes en cada año desde 1984
    const i0 = F.daily.time.findIndex(t => t >= hoy), cen = F.daily.river_discharge_median, alt = F.daily.river_discharge_p75, hoyV = F.daily.river_discharge[i0];
    if (i0 < 0 || hoyV == null) return falla();
    const meses = new Map();                                                                    // ponytail: el mes en curso se promedia desde hoy y se compara con meses completos; alcanza como señal
    for (let i = i0; i < F.daily.time.length; i++) { if (cen[i] == null || alt[i] == null) continue; const k = F.daily.time[i].slice(0, 7), s = meses.get(k) || { c: 0, a: 0, n: 0 }; s.c += cen[i]; s.a += alt[i]; s.n++; meses.set(k, s); }
    const lluvia = new Map(se.status === "fulfilled" ? se.value.monthly.time.map((t, i) => [t.slice(0, 7), se.value.monthly.precipitation_anomaly[i]]) : []);
    const filas = [...meses].filter(([, s]) => s.n >= 10).map(([k, s]) => { const m = +k.slice(5) - 1; return { m, c: pct(medias[m], s.c / s.n), a: pct(medias[m], s.a / s.n), ll: lluvia.get(k) }; });
    const dist = hav(lat, lon, F.latitude, F.longitude), mh = +hoy.slice(5, 7) - 1, pHoy = pct(por[mh].d, hoyV);
    const prox = filas.slice(0, 3), peor = Math.max(...prox.map(f => f.c)), peorA = Math.max(...prox.map(f => f.a));
    const [tit, cls] = peor >= 90 ? ["Se espera un río muy alto para la época", "r"] : peor >= 75 ? ["Se espera un río alto para la época", "w"] : peorA >= 90 ? ["Río normal, pero alto si llueve más de lo normal", "w"] : ["No se espera un río fuera de lo normal", "ok"];
    const lej = dist > 10 ? `<p class="nota"><b>El punto del río modelado está a ${nf(dist, 0)} km de tu dirección.</b> Puede ser otra cuenca: tomalo como referencia regional.</p>` : "";
    el.innerHTML = `<span class="pill ${cls}">${tit}</span> <small class="mut">próximos 3 meses</small>
     <p class="big2">Hoy el río modelado lleva ${nf(hoyV, 0)} m³/s, más que el ${nf(pHoy, 0)} % de los días de ${MESL[mh]} desde 1984.</p>
     <div class="mtab" role="table" aria-label="Pronóstico por mes">${filas.map(f => { const [n, c] = nivel(f.c), [na] = nivel(f.a); return `<div class="mrow" role="row"><b>${MESL[f.m]}</b><span class="pill ${c}">Río ${n.toLowerCase()}</span><small>si llueve más: ${na.toLowerCase()}</small>${f.ll != null ? `<small class="ll">lluvia ${f.ll > 0 ? "+" : f.ll < 0 ? "−" : ""}${nf(Math.abs(f.ll), 0)} mm</small>` : ""}</div>`; }).join("")}</div>
     ${lej}<p class="nota">Pronóstico regional del modelo GloFAS (caudal del río más cercano, a ${nf(dist, 1)} km de tu punto) y de lluvia estacional. Compara cada mes con ese mismo mes de 1984 a hoy. <b>No dice si el agua llega a tu casa</b>: eso depende de la altura de tu terreno y de las defensas del lugar. Usalo como alerta temprana.</p>`;
  } catch { falla(); }
}

/* ——— resumen global y zonas rápidas ——— */
function renderStats() {
  const ev = D.est.filter(e => e.estado === "evacuacion" || e.estado === "alerta").length;
  const pr = D.pre.filter(x => Date.now() - P(x.fecha) < 72 * 36e5).length;
  $("#stats").innerHTML = `<div class="st evac"><div class="n">0</div><div class="l">ríos sobre cota de alerta</div></div><div class="st"><div class="n">0</div><div class="l">notas de prensa en 72 h</div></div><div class="st"><div class="n">0</div><div class="l">alertas del SMN vigentes</div></div>`;
  [ev, pr, D.ale.length].forEach((v, i) => tick($$("#stats .n")[i], v));
  entra($$("#stats .st"), .2, false);
}
function presets() {
  const nombres = ["Resistencia", "Barranqueras", "Corrientes", "Formosa", "Presidencia Roque Sáenz Peña", "Charata"];
  const l = nombres.map(n => D.lug.find(x => norm(x[0]) === norm(n))).filter(Boolean);
  $("#presets").innerHTML = l.map((x, i) => `<button type="button" class="chip" data-i="${i}">${esc(lugar(x[0]).replace("Presidencia Roque Sáenz Peña", "Sáenz Peña"))}</button>`).join("");
  $("#presets").onclick = e => { const b = e.target.closest("[data-i]"); if (b) { const x = l[b.dataset.i]; q.value = x[0]; setZona(x[1], x[2], lugar(x[0])); } };
}
$("#zona").innerHTML = `<div class="card"><h3>Elegí una zona</h3><p class="mut">Buscá tu localidad arriba, usá tu ubicación o marcá un punto en el mapa. Te mostramos cuánta agua detectó el satélite cerca, los ríos más próximos, las alertas y las noticias.</p></div>`;

/* ——— formulario de envíos ——— */
const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
$("#form [name=fecha]").max = hoy;
$("#form").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target, msg = $("#form-msg"), d = Object.fromEntries(new FormData(f));
  msg.className = ""; if (d.web) { msg.textContent = "Recibido."; return; }                          // campo trampa para bots
  if (!d.lugar.trim() || !d.descripcion.trim() || !d.fecha) { msg.className = "err"; msg.textContent = "Completá lugar, fecha y descripción."; return; }
  if (d.enlace && !/^https?:\/\//i.test(d.enlace)) { msg.className = "err"; msg.textContent = "El enlace tiene que empezar con http:// o https://"; return; }
  delete d.web; msg.textContent = "Enviando…";
  let r = "no";
  try { const x = await fetch(CFG.formEndpoint || CFG.api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }); r = x.ok ? "ok" : x.status === 429 ? "limite" : "no"; } catch { }
  if (r === "no" && CFG.email) { location.href = `mailto:${CFG.email}?subject=${encodeURIComponent("Reporte: " + d.lugar)}&body=${encodeURIComponent(Object.entries(d).map(([k, v]) => k + ": " + v).join("\n"))}`; r = "mail"; }
  msg.className = r === "ok" || r === "mail" ? "ok" : "err";
  msg.textContent = r === "ok" ? "Recibido. Una persona lo revisa antes de publicarlo. Gracias." : r === "mail" ? "Se abrió tu correo con el reporte. Falta que lo envíes." : r === "limite" ? "Mandaste muchos reportes seguidos. Esperá un rato." : "El envío todavía no está habilitado en este sitio.";
  if (r === "ok") f.reset();
});

/* ——— recorrido guiado ——— */
function tour() {
  const m = innerWidth <= 800;
  const pasos = [
    ["#buscar", "Poné tu dirección", "Escribí tu dirección con calle y ciudad y apretá Enter. También podés tocar ◎ para usar tu ubicación o 📍 para marcar un punto en el mapa."],
    ["#radio", "Elegí el radio", "Define cuánto alrededor querés mirar: 5, 10 o 25 km."],
    [m ? "#tabs" : "#panel", "Secciones", "Resumen de tu zona, Prensa, Ríos, Alertas, Videos y Enviar. Cada una tiene un “¿Cómo se lee esto?” arriba."],
    ["#dock", "Capas del mapa", "Prendé y apagá lo que se ve. «Agua nueva» marca en azul lo que se inundó entre las dos fechas. «Mapa» esconde los paneles. En los ríos, el triángulo naranja que late es una estación sobre su cota de evacuación."],
    ["#player", "Línea de tiempo del satélite", "Mové la fecha o apretá ▶ para ver las pasadas. Entre una pasada y otra no hay datos y no se inventa nada."],
    ["#strip", "Aviso permanente", "Es información automática y no oficial. Ante una emergencia, llamá al 911."],
  ].filter(p => { const el = $(p[0]); return el && el.getClientRects().length; });
  if (!pasos.length) return;
  if (m) document.body.classList.remove("sheet-open");
  const ov = document.createElement("div"); ov.className = "tour-ov"; ov.innerHTML = '<div class="tour-hl"></div><div class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tt"></div>';
  document.body.appendChild(ov);
  const hl = $(".tour-hl", ov), card = $(".tour-card", ov); let i = 0;
  const fin = () => { store.set("tour-ok", "1"); ov.remove(); document.removeEventListener("keydown", key, true); };
  const key = e => { if (e.key === "Escape") fin(); else if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); i + 1 < pasos.length ? (i++, dibuja()) : fin(); } else if (e.key === "ArrowLeft" && i) { i--; dibuja(); } };
  function dibuja() {
    const [s, t, d] = pasos[i], r = $(s).getBoundingClientRect(), p = 6;
    Object.assign(hl.style, { left: r.left - p + "px", top: r.top - p + "px", width: r.width + 2 * p + "px", height: r.height + 2 * p + "px" });
    card.innerHTML = `<h3 id="tt">${t}</h3><p>${d}</p><div class="nav"><button type="button" class="btn sec" data-a="x">Saltar</button><span class="sp">${i + 1} de ${pasos.length}</span>${i ? '<button type="button" class="btn sec" data-a="p">Atrás</button>' : ""}<button type="button" class="btn" data-a="n">${i + 1 < pasos.length ? "Siguiente" : "Listo"}</button></div>`;
    const ch = card.offsetHeight, cw = card.offsetWidth;
    const top = r.bottom + p + 12 + ch < innerHeight ? r.bottom + p + 12 : r.top - p - 12 - ch > 8 ? r.top - p - 12 - ch : Math.max(8, (innerHeight - ch) / 2);
    Object.assign(card.style, { top: top + "px", left: Math.min(Math.max(8, r.left), innerWidth - cw - 8) + "px" });
    $("[data-a=n]", card).focus();
  }
  card.addEventListener("click", e => { const a = e.target.dataset.a; if (a === "x") fin(); else if (a === "p") { i--; dibuja(); } else if (a === "n") { i + 1 < pasos.length ? (i++, dibuja()) : fin(); } });
  document.addEventListener("keydown", key, true); dibuja();
}
$("#btn-help").addEventListener("click", tour);

/* ——— autochequeo: abrir con ?test ——— */
function autotest() {
  const g = new Uint8Array(100 * 100).fill(2), c = contar(g, 100, 100, 50, 50, 20);
  console.assert(Math.abs(c.N - Math.PI * 400) < 40 && c.F === c.N && c.V === c.N, "contar: todo agua");
  for (let y = 0; y < 100; y++) for (let x = 0; x < 50; x++) g[y * 100 + x] = 0;
  const h = contar(g, 100, 100, 50, 50, 20);
  console.assert(Math.abs(h.V / h.N - .5) < .05, "contar: mitad sin dato");
  console.assert(Math.abs(hav(-27.4511, -58.9865, -27.4692, -58.8306) - 15.4) < 1, "hav Resistencia–Corrientes");
  console.assert(pip(0, 0, [[-1, -1], [-1, 1], [1, 1], [1, -1]]) && !pip(5, 5, [[-1, -1], [-1, 1], [1, 1], [1, -1]]), "pip");
  const [px, py] = ll2px(0, 0, 1), [la, lo] = tile2ll(px / 256, py / 256, 1);
  console.assert(Math.abs(la) < 1e-9 && Math.abs(lo) < 1e-9, "ll2px/tile2ll");
  const sc = (f, n = 5) => Uint8Array.from({ length: n * n }, (_, i) => f(i % n, i / n | 0));
  console.assert(clasifica(sc(() => 6), 5).e === "agua" && clasifica(sc(() => 4), 5).e === "seco" && clasifica(sc(() => 9), 5).e === "nube" && clasifica(sc(() => 0), 5).e === "nd", "clasifica: casos puros");
  console.assert(clasifica(sc((x, y) => x === 0 ? 6 : 4), 5).e === "cerca" && clasifica(sc((x, y) => x === 0 ? 6 : 4), 5).pct === 20, "clasifica: agua al costado = cerca");
  console.assert(pct([1, 2, 3, 4], 3) === 50 && pct([], 1) !== pct([], 1), "pct");
  console.log("autotest ok"); document.title = "autotest ok";
}
if (location.search === "?test") autotest();

/* ——— arranque ——— */
(async () => {
  const [est, gfm, ale, pre, vid, lug] = await Promise.allSettled(["estaciones", "gfm", "alertas", "prensa", "videos", "lugares"].map(n => J(`data/${n}.json`)));
  if (lug.status === "fulfilled") { D.lug = lug.value.lugares.map(l => [lugar(l[0]), l[1], l[2], l[3], l[4], norm(l[0])]); presets(); }
  est.status === "fulfilled" ? renderRios(est.value) : fail("rios", "los ríos");
  ale.status === "fulfilled" ? renderAlertas(ale.value) : fail("alertas", "las alertas");
  pre.status === "fulfilled" ? renderPrensa(pre.value) : fail("prensa", "la prensa");
  vid.status === "fulfilled" ? renderVideos(vid.value) : fail("videos", "los videos");
  gfm.status === "fulfilled" ? renderGfm(gfm.value) : toast("No se pudo cargar el satélite. El resto del mapa funciona.");
  renderStats();
  if (mov) {
    try {
      M.animate("#top", { opacity: [0, 1], transform: ["translateY(-14px)", "translateY(0px)"] }, { duration: .5, ease: [.22, 1, .36, 1] });
      M.animate("#panel", { opacity: [0, 1], transform: ["translateX(24px)", "translateX(0px)"] }, { duration: .55, delay: .1, ease: [.22, 1, .36, 1] });
      M.animate("#dock .dk", { opacity: [0, 1], transform: ["translateY(14px)", "translateY(0px)"] }, { duration: .4, delay: M.stagger(.06, { startDelay: .25 }) });
    } catch { }
  }
  const h = /z=(-?[\d.]+),(-?[\d.]+),(\d+)(&ap=1)?(?:&n=(.*))?/.exec(location.hash);
  if (h && [5, 10, 25].includes(+h[3])) { let n = "Punto en el mapa"; try { n = decodeURIComponent(h[5] || n).slice(0, 60); } catch { } q.value = ["Punto en el mapa", "Mi ubicación", "Mi dirección"].includes(n) ? "" : n; setZona(+h[1], +h[2], n, +h[3], !!h[4]); }
  else inicio();
  $(".ayuda").open = true; setTimeout(tour, 1200);                                               // el recorrido sale siempre; "Saltar" lo cierra
})();
async function inicio() {                                                                        // arranca en antes y después, sobre Resistencia–Corrientes
  ir(-27.462, -58.87, 14);
  let fs; try { fs = await una("f-inicio", () => fotos(-27.462, -58.87)); } catch { return toast("No se pudo consultar el satélite. Probá recargar en unos minutos."); }
  if (C.key || !fs.length) return;                                                               // el usuario ya eligió una zona
  C.fotos = fs; [C.A, C.B] = defecto(); opciones(); C.v = V0(); mostrar();
}
})();
