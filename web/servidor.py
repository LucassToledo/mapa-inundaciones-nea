#!/usr/bin/env python3
"""Servidor opcional: sirve web/ + cola de moderación de envíos en SQLite (solo biblioteca estándar).

  ADMIN_TOKEN=clave python -X utf8 servidor.py [puerto]     # puerto por defecto 8765
  python -X utf8 servidor.py --test                          # chequeo propio, imprime "ok"

POST /api/envios                  público: guarda un envío como 'pendiente' (nunca se publica solo)
GET  /admin?token=...             revisar: aprobar / rechazar (aprobar un enlace de YouTube lo agrega a data/videos.json)
POST /admin/accion                {id, accion: aprobar|rechazar, token}

ponytail: un solo proceso y un SQLite; límite por IP en memoria (se pierde al reiniciar).
Si hay muchos visitantes escribiendo a la vez, pasar a gunicorn + Postgres.
"""
import hashlib, html, json, os, re, sqlite3, sys, threading, time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

RAIZ = os.path.dirname(os.path.abspath(__file__))
DB = os.environ.get("DB_PATH", os.path.join(RAIZ, "envios.db"))
TOKEN = os.environ.get("ADMIN_TOKEN", "")
LIM = 5        # envíos por IP por hora
MAX = 4000     # bytes máximos del cuerpo
TIPOS = {"Agua / anegamiento", "Evacuación", "Ruta o camino cortado", "Video o foto", "Otro"}
CAMPOS = {"lugar": 150, "descripcion": 800, "enlace": 300, "contacto": 120}
_lock, _visitas = threading.Lock(), {}


def conectar():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    c.execute("""CREATE TABLE IF NOT EXISTS envios(
        id INTEGER PRIMARY KEY, creado TEXT DEFAULT CURRENT_TIMESTAMP, estado TEXT DEFAULT 'pendiente',
        tipo TEXT, lugar TEXT, fecha TEXT, descripcion TEXT, enlace TEXT, contacto TEXT, ip_hash TEXT)""")
    return c


def validar(d):
    """Devuelve (datos limpios, None) o (None, motivo). Es el único borde con datos no confiables."""
    if not isinstance(d, dict):
        return None, "formato"
    if d.get("web"):                      # campo trampa: los bots lo llenan
        return None, "bot"
    o = {k: str(d.get(k) or "").strip() for k in ("tipo", "lugar", "fecha", "descripcion", "enlace", "contacto")}
    if o["tipo"] not in TIPOS:
        o["tipo"] = "Otro"
    for k, n in CAMPOS.items():
        if len(o[k]) > n:
            return None, k
    if not o["lugar"] or not o["descripcion"]:
        return None, "faltan"
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", o["fecha"]):
        return None, "fecha"
    if o["fecha"] > time.strftime("%Y-%m-%d", time.gmtime(time.time() + 86400)):
        return None, "fecha"
    if o["enlace"] and not re.match(r"https?://[^\s]+$", o["enlace"]):
        return None, "enlace"
    return o, None


def limite(ip):
    ahora = time.time()
    with _lock:
        v = [t for t in _visitas.get(ip, []) if ahora - t < 3600]
        ok = len(v) < LIM
        if ok:
            v.append(ahora)
        _visitas[ip] = v
    return ok


def yt_id(url):
    m = re.search(r"(?:youtu\.be/|youtube\.com/(?:watch\?(?:.*&)?v=|shorts/|embed/))([\w-]{11})", url or "")
    return m.group(1) if m else ""


def aprobar(c, i):
    """Marca aprobado. Si trae un video de YouTube, lo publica en data/videos.json (la fecha es la del hecho: revisarla)."""
    r = c.execute("SELECT * FROM envios WHERE id=?", (i,)).fetchone()
    if not r:
        return False
    c.execute("UPDATE envios SET estado='aprobado' WHERE id=?", (i,))
    c.commit()
    y = yt_id(r["enlace"])
    if y:
        ruta = os.path.join(RAIZ, "data", "videos.json")
        j = json.load(open(ruta, encoding="utf-8")) if os.path.exists(ruta) else {"videos": []}
        if not any(v.get("yt") == y for v in j["videos"]):
            j["videos"].append({"titulo": r["lugar"], "fecha": r["fecha"], "fuente": "YouTube", "url": r["enlace"],
                                "yt": y, "lugar": r["lugar"], "nota": "Enviado por un usuario y revisado. " + r["descripcion"][:200]})
            json.dump(j, open(ruta, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    return True


def pagina_admin(c, token):
    e = html.escape
    enlace = lambda u: f'<a href="{e(u)}" rel=noopener target=_blank>{e(u)}</a>' if u else ""
    filas = c.execute("SELECT * FROM envios WHERE estado='pendiente' ORDER BY id").fetchall()
    cuerpo = "".join(
        f"<div class=c><b>#{r['id']} · {e(r['tipo'])}</b> · {e(r['fecha'])}<br><b>{e(r['lugar'])}</b><p>{e(r['descripcion'])}</p>"
        f"<p>{enlace(r['enlace'])}</p>"
        f"<small>Contacto: {e(r['contacto'] or '—')} · {e(r['creado'])}</small><br>"
        f"<button onclick=\"a({r['id']},'aprobar')\">Aprobar</button> <button onclick=\"a({r['id']},'rechazar')\">Rechazar</button></div>"
        for r in filas) or "<p>No hay envíos pendientes.</p>"
    return (f"<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><title>Moderación</title>"
            f"<style>body{{font:15px system-ui;max-width:640px;margin:20px auto;padding:0 12px}}.c{{border:1px solid #ccc;border-radius:10px;padding:10px;margin:10px 0}}button{{padding:8px 14px;margin-top:6px}}</style>"
            f"<h1>Envíos pendientes ({len(filas)})</h1>{cuerpo}"
            f"<script>const T={json.dumps(token)};async function a(id,accion){{await fetch('/admin/accion',{{method:'POST',headers:{{'Content-Type':'application/json'}},body:JSON.stringify({{id,accion,token:T}})}});location.reload()}}</script>").encode()


class H(SimpleHTTPRequestHandler):
    def __init__(s, *a, **k):
        super().__init__(*a, directory=RAIZ, **k)

    def _json(s, code, obj=None):
        b = json.dumps(obj or {}).encode()
        s.send_response(code)
        s.send_header("Content-Type", "application/json")
        s.send_header("Content-Length", str(len(b)))
        s.end_headers()
        s.wfile.write(b)

    def _cuerpo(s):
        n = int(s.headers.get("Content-Length") or 0)
        if n > MAX:
            return None
        try:
            return json.loads(s.rfile.read(n) or b"{}")
        except ValueError:
            return None

    def _ip(s):  # detrás de un proxy inverso conviene confiar en X-Forwarded-For; aquí se usa si existe
        return (s.headers.get("X-Forwarded-For") or s.client_address[0]).split(",")[0].strip()

    def _admin_ok(s, t):
        return bool(TOKEN) and t is not None and hashlib.sha256(t.encode()).digest() == hashlib.sha256(TOKEN.encode()).digest()

    def do_GET(s):
        u = urlparse(s.path)
        if u.path.endswith((".db", ".py")):
            return s.send_error(404)       # no exponer la base ni el código
        if u.path == "/admin":
            if not s._admin_ok(parse_qs(u.query).get("token", [None])[0]):
                return s.send_error(403)
            with conectar() as c:
                b = pagina_admin(c, parse_qs(u.query)["token"][0])
            s.send_response(200)
            s.send_header("Content-Type", "text/html; charset=utf-8")
            s.send_header("Content-Length", str(len(b)))
            s.end_headers()
            return s.wfile.write(b)
        super().do_GET()

    def do_POST(s):
        u = urlparse(s.path).path
        d = s._cuerpo()
        if d is None:
            return s._json(400, {"error": "cuerpo"})
        if u == "/api/envios":
            if not limite(s._ip()):
                return s._json(429, {"error": "limite"})
            o, mal = validar(d)
            if mal == "bot":
                return s._json(200, {"ok": True})      # el bot cree que funcionó
            if mal:
                return s._json(400, {"error": mal})
            with conectar() as c:
                c.execute("INSERT INTO envios(tipo,lugar,fecha,descripcion,enlace,contacto,ip_hash) VALUES(?,?,?,?,?,?,?)",
                          (o["tipo"], o["lugar"], o["fecha"], o["descripcion"], o["enlace"], o["contacto"],
                           hashlib.sha256(s._ip().encode()).hexdigest()[:16]))
            return s._json(200, {"ok": True})
        if u == "/admin/accion":
            if not s._admin_ok(d.get("token")):
                return s._json(403)
            with conectar() as c:
                if d.get("accion") == "aprobar":
                    ok = aprobar(c, int(d.get("id") or 0))
                elif d.get("accion") == "rechazar":
                    ok = c.execute("UPDATE envios SET estado='rechazado' WHERE id=?", (int(d.get("id") or 0),)).rowcount > 0
                else:
                    ok = False
            return s._json(200 if ok else 404)
        s._json(404)


def prueba():
    import tempfile, urllib.request, urllib.error
    global DB, TOKEN, RAIZ
    t = tempfile.mkdtemp()
    DB, TOKEN, RAIZ = os.path.join(t, "t.db"), "abc", t
    os.makedirs(os.path.join(t, "data"))
    open(os.path.join(t, "index.html"), "w").write("hola")
    hoy = time.strftime("%Y-%m-%d")
    base = {"tipo": "Evacuación", "lugar": "Barrio X", "fecha": hoy, "descripcion": "agua", "enlace": ""}
    assert validar(base)[0] and validar({**base, "fecha": "2999-01-01"})[1] == "fecha"
    assert validar({**base, "web": "x"})[1] == "bot" and validar({**base, "enlace": "javascript:alert(1)"})[1] == "enlace"
    assert validar({**base, "lugar": ""})[1] == "faltan" and validar({**base, "descripcion": "x" * 801})[1] == "descripcion"
    assert yt_id("https://youtu.be/dQw4w9WgXcQ") == "dQw4w9WgXcQ" and not yt_id("https://example.com/v")
    srv = ThreadingHTTPServer(("127.0.0.1", 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    u = f"http://127.0.0.1:{srv.server_port}"

    def post(p, o):
        r = urllib.request.Request(u + p, json.dumps(o).encode(), {"Content-Type": "application/json"})
        try:
            return urllib.request.urlopen(r).status
        except urllib.error.HTTPError as e:
            return e.code
    yt = {**base, "enlace": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}
    assert post("/api/envios", yt) == 200 and post("/api/envios", {**base, "fecha": "x"}) == 400
    assert post("/admin/accion", {"id": 1, "accion": "aprobar", "token": "mal"}) == 403
    assert post("/admin/accion", {"id": 1, "accion": "aprobar", "token": "abc"}) == 200
    v = json.load(open(os.path.join(t, "data", "videos.json"), encoding="utf-8"))["videos"]
    assert len(v) == 1 and v[0]["yt"] == "dQw4w9WgXcQ"
    try:
        urllib.request.urlopen(u + "/envios.db")
        raise SystemExit("expuso la base")
    except urllib.error.HTTPError as e:
        assert e.code == 404
    assert [post("/api/envios", base) for _ in range(LIM)][-1] == 429   # ya llevaba 2 envíos: el 4.º de este lote se limita
    srv.shutdown()
    print("ok")


if __name__ == "__main__":
    if "--test" in sys.argv:
        prueba()
    else:
        if not TOKEN:
            print("Aviso: sin ADMIN_TOKEN el panel /admin queda deshabilitado.")
        p = int(next((a for a in sys.argv[1:] if a.isdigit()), 8765))
        print(f"http://localhost:{p}")
        ThreadingHTTPServer(("0.0.0.0", p), H).serve_forever()
