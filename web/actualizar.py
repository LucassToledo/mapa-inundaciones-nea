#!/usr/bin/env python3
"""Genera data/*.json para el mapa. Solo biblioteca estándar.
Uso: python actualizar.py [fuente ...]   (estaciones gfm alertas prensa lugares; sin argumentos actualiza todo; una fuente que falla conserva su archivo anterior)
     python actualizar.py --test   (chequeo sin red)
Fuentes: INA (niveles), Copernicus GFM vía EODC (satélite), prensa por RSS, SMN CAP (alertas), Georef (lugares)."""
import json, re, ssl, sys, unicodedata, urllib.request, urllib.parse, xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

OUT = Path(__file__).parent / "data"
UA = {"User-Agent": "mapa-inundaciones-chaco/0.1 (OSINT; contacto en README)"}
HOY = datetime.now(timezone.utc)
# caja de trabajo: Chaco + márgenes (Paraná/Paraguay/Bermejo/Pilcomayo)
S, N, O, E = -29.1, -23.9, -62.9, -57.2


# ponytail: INA, SMN y algunos diarios sirven cadenas de certificados vencidas/incompletas y Python las rechaza (curl y navegadores no).
# Son datos públicos de solo lectura: se reintenta sin verificar el certificado. Techo: un atacante en la red podría falsear datos. Mejora: fijar la CA correcta.
SIN_VERIF = ssl.create_default_context()
SIN_VERIF.check_hostname, SIN_VERIF.verify_mode = False, ssl.CERT_NONE


def get(url, data=None):
    req = urllib.request.Request(url, data=data, headers={**UA, **({"Content-Type": "application/json"} if data else {})})
    for ctx in (None, SIN_VERIF):
        try:
            return urllib.request.urlopen(req, timeout=40, context=ctx).read()
        except ssl.SSLError as e:
            err = e
        except urllib.error.URLError as e:
            if not isinstance(e.reason, ssl.SSLError):
                raise
            err = e
    raise err


def jget(url, data=None):
    return json.loads(get(url, data))


def norm(s):
    return re.sub(r"\s+", " ", unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode())


# ---------- prensa: clasificación + geocodificación por reglas ----------
# ponytail: reglas por palabras clave, sin LLM. Techo: ironías/negaciones y lugares fuera del padrón. Mejora: LLM sobre titulares.
FLOOD = re.compile(r"inunda|anega|crecida|creciente|desborde|evacu|damnific|emergencia hidric|bajo agua|ruta.{0,30}(cortad|intransitable)|cota |altura del rio|riacho|el nino")
TIPOS = [  # el orden manda: lo más grave primero
    ("evacuacion", r"evacu|damnific|asistid|sin hogar"),
    ("ruta", r"ruta|camino|puente|intransitable|cortad|transit"),
    ("anegamiento", r"anega|inunda|bajo agua|calles?"),
    ("rio", r"crecida|creciente|altura del rio|\bcota\b|desborde|rio parana|rio paraguay|rio negro|bermejo|pilcomayo"),
    ("alerta", r"alerta|pronostic|aviso|smn|el nino"),
    ("prevencion", r"obra|prevenir|prevencion|limpieza|desagu|plan "),
]
EXTRA = {  # fuera de Chaco pero parte del mismo evento (Paraná/Paraguay); (lat, lon, provincia)
    "corrientes": (-27.47, -58.83, "Corrientes"), "itati": (-27.27, -58.24, "Corrientes"),
    "paso de la patria": (-27.32, -58.58, "Corrientes"), "empedrado": (-27.95, -58.81, "Corrientes"),
    "bella vista": (-28.51, -59.05, "Corrientes"), "formosa": (-26.18, -58.17, "Formosa"),
    "puerto bermejo": (-26.93, -58.51, "Chaco"),
}
CHACO_CENTRO = (-26.3, -60.8)


def tipo(txt):
    t = norm(txt)
    return next((k for k, rx in TIPOS if re.search(rx, t)), "general")


def geocode(txt, gaz):
    """gaz = {nombre_normalizado: (lat, lon, provincia, nivel)}. Devuelve (lat, lon, lugar, nivel) o None."""
    t = " " + norm(txt) + " "
    for nombre in sorted(gaz, key=len, reverse=True):
        if re.search(rf"(?<![a-z0-9]){re.escape(nombre)}(?![a-z0-9])", t):
            lat, lon, prov, nivel = gaz[nombre]
            return lat, lon, f"{nombre.title()} ({prov})", nivel
    if re.search(r"\bchaco\b", t):
        return CHACO_CENTRO[0], CHACO_CENTRO[1], "Chaco (sin localidad)", "provincia"
    return None


def gazetteer():
    g = {k: (a, b, p, "localidad") for k, (a, b, p) in EXTRA.items()}
    base = "https://apis.datos.gob.ar/georef/api/"
    for l in jget(base + "localidades?provincia=22&max=500&campos=nombre,centroide&formato=json")["localidades"]:
        g[norm(l["nombre"])] = (l["centroide"]["lat"], l["centroide"]["lon"], "Chaco", "localidad")
    # departamentos: solo si dicen "departamento X" (nombres como Libertad o Independencia son ambiguos)
    for d in jget(base + "departamentos?provincia=22&max=100&campos=nombre,centroide&formato=json")["departamentos"]:
        g.setdefault("departamento " + norm(d["nombre"]), (d["centroide"]["lat"], d["centroide"]["lon"], "Chaco", "departamento"))
    return g


QUERIES = ["inundaciones Chaco", "anegamiento Resistencia Chaco", "evacuados Chaco crecida", "crecida río Paraná Corrientes Barranqueras",
           "El Niño inundaciones Chaco", "temporal lluvia Chaco rutas cortadas"]
FEEDS = ["https://www.diarionorte.com/rss", "https://www.chacodiapordia.com/rss"]


def parse_rss(raw, fuente=None):
    out = []
    for it in ET.fromstring(raw).iter("item"):
        titulo = (it.findtext("title") or "").strip()
        src = it.find("source")
        medio = (src.text if src is not None else None) or fuente or ""
        if src is not None and titulo.endswith(" - " + medio):
            titulo = titulo[: -len(medio) - 3]
        try:
            fecha = parsedate_to_datetime(it.findtext("pubDate")).astimezone(timezone.utc)
        except Exception:
            continue
        out.append({"titulo": titulo, "url": (it.findtext("link") or "").strip(), "medio": medio,
                    "fecha": fecha.isoformat(timespec="minutes"), "_txt": titulo})  # solo titular: las descripciones de RSS generan falsos positivos
    return out


def prensa(gaz):
    items = []
    urls = [("https://news.google.com/rss/search?" + urllib.parse.urlencode({"q": q + " when:14d", "hl": "es-419", "gl": "AR", "ceid": "AR:es-419"}), None) for q in QUERIES]
    urls += [(u, urllib.parse.urlparse(u).netloc.replace("www.", "")) for u in FEEDS]
    for u, f in urls:
        try:
            items += parse_rss(get(u), f)
        except Exception as e:
            print("prensa: falla", u[:70], e)
    ev = {}
    try:
        ev = {e["url"]: e for e in json.load(open(OUT / "prensa.json", encoding="utf-8"))["eventos"]}  # conserva historial
    except Exception:
        pass
    for it in items:
        if not FLOOD.search(norm(it["_txt"])) or it["url"] in ev:
            continue
        g = geocode(it["_txt"], gaz)
        if not g:
            continue
        ev[it["url"]] = {k: it[k] for k in ("titulo", "url", "medio", "fecha")} | {
            "tipo": tipo(it["_txt"]), "lat": g[0], "lon": g[1], "lugar": g[2], "precision": g[3]}
    corte = (HOY - timedelta(days=60)).isoformat()
    vistos, res = set(), []
    for e in sorted(ev.values(), key=lambda e: e["fecha"], reverse=True):
        k = norm(e["titulo"])[:60]  # ponytail: dedupe por prefijo de título; mejora: agrupar por lugar+fecha+tipo
        if e["fecha"] >= corte and k not in vistos:
            vistos.add(k)
            res.append(e)
    return {"actualizado": HOY.isoformat(timespec="minutes"), "eventos": res[:300]}


# ---------- INA: niveles de río ----------
INA = "https://alerta.ina.gob.ar/pub/datos/"  # los parámetros van con & justo después del endpoint (con ? se ignoran)


def lecturas(sc):
    ini, fin = (HOY - timedelta(days=10)).strftime("%Y-%m-%d"), (HOY + timedelta(days=1)).strftime("%Y-%m-%d")
    try:
        d = jget(f"{INA}datos&siteCode={sc}&varId=2&timeStart={ini}&timeEnd={fin}&format=json")["data"]
    except Exception:
        return []
    return [(x["timestart"], x["valor"]) for x in d if x.get("valor") is not None]


def estado(v, alerta, evac):
    if evac is not None and v >= evac:
        return "evacuacion"
    if alerta is not None and v >= alerta:
        return "alerta"
    return "normal" if alerta is not None else "sin_cota"


def ina():
    est = jget(INA + "estaciones&format=json")["data"]
    cand = [e for e in est if e["lat"] and e["lon"] and S < e["lat"] < N and O < e["lon"] < E
            and e.get("var") != "P" and "INTA" not in (e.get("nombre_red") or "")]
    with ThreadPoolExecutor(8) as ex:
        lect = list(ex.map(lambda e: lecturas(e["sitecode"]), cand))
    res = []
    for e, l in zip(cand, lect):
        if not l:
            continue
        dia = {}
        for t, v in l:
            dia[t[:10]] = v  # último valor de cada día
        serie = sorted(dia.items())[-8:]
        v, t = l[-1][1], l[-1][0]
        lim = (datetime.fromisoformat(t) - timedelta(days=3)).strftime("%Y-%m-%d")
        ref = [x for x in serie if x[0] <= lim]
        a, ev = e.get("nivel_de_alerta"), e.get("nivel_de_evacuacion")
        res.append({"id": e["sitecode"], "n": e["nombre"], "r": e.get("rio"), "d": e.get("distrito"), "lat": e["lat"], "lon": e["lon"],
                    "red": e.get("nombre_red"), "alerta": a, "evac": ev, "v": v, "t": t,
                    "d3": round(v - ref[-1][1], 2) if ref else None, "estado": estado(v, a, ev), "serie": serie})
    # ponytail: la misma escala aparece en varias redes; me quedo con una por cluster de ~2 km (prefiero la que tiene cotas)
    res.sort(key=lambda s: s["alerta"] is None)
    out = []
    for s in res:
        if not any(abs(s["lat"] - o["lat"]) < .02 and abs(s["lon"] - o["lon"]) < .02 for o in out):
            out.append(s)
    return {"actualizado": HOY.isoformat(timespec="minutes"), "estaciones": out}


# ---------- Copernicus GFM (Sentinel-1) ----------
STAC = "https://stac.eodc.eu/api/v1/search"


def escena(f):
    try:
        tj = jget(f["assets"]["tilejson"]["href"])
        return {"id": f["id"], "fecha": f["properties"]["datetime"][:10], "hora": f["properties"]["datetime"][11:16],
                "bounds": tj["bounds"], "min": tj["minzoom"], "max": tj["maxzoom"], "tiles": re.sub(r"&colormap=[^&]*", "", tj["tiles"][0]).replace("http://", "https://")}  # el colormap lo pone el cliente (ver app.js)
    except Exception as e:
        print("gfm: escena", f.get("id"), e)


def gfm():
    q = {"collections": ["GFM"], "bbox": [O, S, E, N], "limit": 200,
         "datetime": f"{(HOY - timedelta(days=30)).strftime('%Y-%m-%d')}T00:00:00Z/{HOY.strftime('%Y-%m-%d')}T23:59:59Z"}
    feats = jget(STAC, json.dumps(q).encode())["features"]
    with ThreadPoolExecutor(8) as ex:
        esc = [e for e in ex.map(escena, feats) if e]
    return {"actualizado": HOY.isoformat(timespec="minutes"), "escenas": sorted(esc, key=lambda e: (e["fecha"], e["id"]))}


# ---------- SMN: alertas CAP ----------
CAP = "{urn:oasis:names:tc:emergency:cap:1.2}"


def alerta_cap(url):
    try:
        r = ET.fromstring(get(url))
        i = r.find(CAP + "info")
        polys = [[[float(c) for c in p.split(",")] for p in (a.findtext(CAP + "polygon") or "").split()] for a in i.findall(CAP + "area")]
        polys = [p for p in polys if p]
        if not polys or not any(S < la < N and O < lo < E for p in polys for la, lo in p):
            return None
        if datetime.fromisoformat(i.findtext(CAP + "expires")) < HOY:
            return None
        g = lambda k: i.findtext(CAP + k)
        return {"evento": g("event"), "severidad": g("severity"), "desde": g("onset"), "hasta": g("expires"),
                "texto": g("description"), "url": g("web"), "poligonos": polys}
    except Exception as e:
        print("smn:", url[-40:], e)


def smn():
    links = [it.findtext("link") for it in ET.fromstring(get("https://ssl.smn.gob.ar/CAP/AR.php")).iter("item")]
    with ThreadPoolExecutor(8) as ex:
        al = [a for a in ex.map(alerta_cap, links) if a]
    return {"actualizado": HOY.isoformat(timespec="minutes"), "alertas": al}


# ---------- lugares para el buscador de zona (sin red en el cliente) ----------
def lugares():
    base = "https://apis.datos.gob.ar/georef/api/"
    out = [[n, a, b, p, "localidad"] for n, (a, b, p) in ((k.title(), v) for k, v in EXTRA.items())]
    for tipo_, clave in (("localidades", "localidad"), ("departamentos", "departamento")):
        for l in jget(f"{base}{tipo_}?provincia=22&max=500&campos=nombre,centroide&formato=json")[tipo_]:
            out.append([l["nombre"].title(), round(l["centroide"]["lat"], 4), round(l["centroide"]["lon"], 4), "Chaco", clave])
    return {"actualizado": HOY.isoformat(timespec="minutes"), "lugares": out}


def test():
    gaz ={"resistencia": (-27.45, -58.98, "Chaco", "localidad"), "corrientes": (-27.47, -58.83, "Corrientes", "localidad"),
           "barranqueras": (-27.48, -58.93, "Chaco", "localidad")}
    assert geocode("Evacuaron 40 familias en Barranqueras por la crecida", gaz)[2].startswith("Barranqueras")
    assert geocode("Inundaciones en el Chaco profundo", gaz)[3] == "provincia"
    assert geocode("Lluvia en Mendoza", gaz) is None
    assert tipo("Evacuaron familias y cortaron la ruta 11") == "evacuacion" and tipo("Cortaron la ruta 11") == "ruta"
    assert FLOOD.search(norm("Anegamiento en barrios")) and not FLOOD.search(norm("Caso Loan: citan al exintendente"))
    assert estado(7.27, 6.5, 7) == "evacuacion" and estado(6.6, 6.5, 7) == "alerta"
    assert estado(3, 6.5, 7) == "normal" and estado(3, None, None) == "sin_cota"
    rss = (b'<rss><channel><item><title>Anegados en Resistencia - Diario X</title><link>http://x/1</link><source url="u">Diario X</source>'
           b'<pubDate>Wed, 21 Oct 2026 12:00:00 GMT</pubDate></item></channel></rss>')
    r = parse_rss(rss)[0]
    assert r["titulo"] == "Anegados en Resistencia" and r["medio"] == "Diario X"
    assert "colormap" not in re.sub(r"&colormap=[^&]*", "", "https://t/{z}?url=a&return_mask=True&colormap=%5B1%5D")
    print("ok")


if __name__ == "__main__":
    if "--test" in sys.argv:
        test()
        sys.exit()
    OUT.mkdir(exist_ok=True)
    for nombre in sys.argv[1:] or ("estaciones", "gfm", "alertas", "prensa", "lugares"):
        try:
            datos = prensa(gazetteer()) if nombre == "prensa" else {"estaciones": ina, "gfm": gfm, "alertas": smn, "lugares": lugares}[nombre]()
            (OUT / f"{nombre}.json").write_text(json.dumps(datos, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
            print(nombre, "ok", len(next(v for v in datos.values() if isinstance(v, list))))
        except Exception as e:
            print(nombre, "FALLÓ (se conserva el archivo anterior):", e)
