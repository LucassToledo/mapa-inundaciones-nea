#!/usr/bin/env python3
"""Genera explicativo.mp4 (~1 min) capturando la herramienta real (servidor en :8765) + voz es-MX (SAPI) + ffmpeg.
Requisitos: Windows (voz Sabina), playwright, ffmpeg. Uso: python -X utf8 hacer_video.py [rate]   (rate SAPI -10..10, def. 1)
ponytail: capturas estáticas con zoom lento, no grabación de pantalla; alcanza para mostrar la herramienta y no depende de tiempos de red al reproducir."""
import base64, json, os, subprocess, sys
from playwright.sync_api import sync_playwright

U = "http://localhost:8765/"
ZONA = "#z=-28.980,-56.920,10&n=Zona%20del%20r%C3%ADo%20Uruguay%20(Corrientes)"
RATE = sys.argv[1] if len(sys.argv) > 1 else "1"
AQUI = os.path.dirname(os.path.abspath(__file__))
os.chdir(AQUI); os.makedirs("f", exist_ok=True)

# (id, narración, [(frame, leyenda)])
ESC = [
 ("1", "Cuando hay una inundación, la información está repartida en muchos lugares. Esta herramienta la reúne en un solo mapa abierto, pensado para el público, los municipios y Defensa Civil.",
  [("s1", "Un solo mapa con todas las fuentes")]),
 ("2", "Cualquier persona escribe su localidad y el mapa se centra ahí. Con un radio de diez kilómetros, calcula cuánta agua detectó el satélite Sentinel uno de Copernicus, y de qué día es esa pasada.",
  [("s2", "Elegí tu zona: kilómetros cuadrados de agua y fecha de la pasada")]),
 ("3", "Con el reproductor se ve cómo el agua avanzó o retrocedió, pasada por pasada.",
  [("s3a", "Pasada anterior"), ("s3b", "Última pasada")]),
 ("4", "Suma las alturas de los ríos contra sus cotas de alerta, las alertas del Servicio Meteorológico y las noticias de prensa, ubicadas por localidad. La prensa se publica sola, con un aviso bien visible.",
  [("s4a", "Ríos del INA contra sus cotas de alerta"), ("s4b", "Prensa automática, con aviso de que no está verificada")]),
 ("5", "Los videos que circulan se muestran con su fecha, y solo después de que una persona los revisa. Los reportes de los vecinos nunca se publican solos.",
  [("s5a", "Videos con fecha, revisados a mano"), ("s5b", "Los envíos pasan por revisión antes de publicarse")]),
 ("6", "Es liviano, funciona en el celular, no pide registro y se carga en un subdominio del ICCTI. Es información automática y no oficial: no reemplaza a Defensa Civil.",
  [("s6", "")]),
]

CAP = """(t)=>{let d=document.getElementById('cap');if(!d){d=document.createElement('div');d.id='cap';
d.style.cssText='position:fixed;left:50%;bottom:34px;transform:translateX(-50%);z-index:99999;background:rgba(12,22,40,.88);color:#fff;font:600 34px Inter,system-ui;padding:16px 30px;border-radius:16px;max-width:1000px;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.35)';document.body.appendChild(d)}
d.textContent=t;d.style.display=t?'block':'none'}"""

def final(c):
    h = c.new_page()
    h.set_content(f"""<body style='margin:0;width:1920px;height:1080px;background:linear-gradient(135deg,#0a63c9,#06305f);font-family:Inter,system-ui;color:#fff;display:flex;align-items:center;justify-content:center;gap:90px'>
<div style='border:10px solid #0b1220;border-radius:56px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.5);height:940px'><img src='data:image/png;base64,{base64.b64encode(open("f/movil.png","rb").read()).decode()}' style='height:940px;display:block'></div>
<div style='font-size:54px;font-weight:700;line-height:1.35'>Liviano<br>Sin registro<br>Funciona en el celular<br>Subdominio del ICCTI<div style='font-size:34px;font-weight:500;margin-top:40px;opacity:.9;max-width:760px'>Información automática y NO oficial.<br>Ante una emergencia: 911 y Defensa Civil.</div><div style='font-size:40px;font-weight:600;margin-top:46px'>Creado por @eltiolucas.ia<br><span style="font-size:28px;font-weight:400;opacity:.85">instagram.com/eltiolucas.ia</span></div></div></body>""")
    h.wait_for_timeout(800); h.screenshot(path="f/s6.png")

def capturar():
    with sync_playwright() as p:
        b = p.chromium.launch()
        c = b.new_context(viewport={"width": 1920, "height": 1080})
        c.add_init_script("localStorage.setItem('tour-ok','1')")
        pg = c.new_page()
        leyenda = {f: t for _, _, fr in ESC for f, t in fr}
        def foto(n, espera=0):
            pg.wait_for_timeout(espera); pg.evaluate(CAP, leyenda[n]); pg.screenshot(path=f"f/{n}.png")
        pg.goto(U); foto("s1", 9000)
        pg.goto(U + ZONA); pg.reload(); pg.wait_for_timeout(38000)
        foto("s2")
        setv = "v=>{const r=document.querySelector('#gfm-r');r.value=v;r.dispatchEvent(new Event('input',{bubbles:true}))}"
        mx = int(pg.evaluate("document.querySelector('#gfm-r').max"))
        pg.evaluate(setv, mx - 4); foto("s3a", 30000)
        pg.evaluate(setv, mx); foto("s3b", 30000)
        pg.goto(U); pg.reload(); pg.wait_for_timeout(8000)
        pg.get_by_role("tab", name="Ríos").click(); foto("s4a", 1500)
        pg.get_by_role("tab", name="Prensa").click(); foto("s4b", 1500)
        pg.get_by_role("tab", name="Videos").click(); foto("s5a", 1500)
        pg.get_by_role("tab", name="Enviar").click(); foto("s5b", 1500)
        # celular
        m = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        m.add_init_script("localStorage.setItem('tour-ok','1')")
        q = m.new_page(); q.goto(U + ZONA); q.reload(); q.wait_for_timeout(38000); q.screenshot(path="f/movil.png")
        final(c)
        b.close()

def dur(f):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], text=True))

def voz():
    ps = ("Add-Type -AssemblyName System.Speech;$s=New-Object System.Speech.Synthesis.SpeechSynthesizer;"
          f"$s.SelectVoice('Microsoft Sabina Desktop');$s.Rate={RATE};")
    for i, t, _ in ESC:
        tx = os.path.join(AQUI, "f", f"n{i}.txt"); wv = os.path.join(AQUI, "f", f"n{i}.wav")
        open(tx, "w", encoding="utf-8").write(t)
        ps += f"$s.SetOutputToWaveFile('{wv}');$s.Speak([IO.File]::ReadAllText('{tx}',[Text.Encoding]::UTF8));"
    ps += "$s.Dispose()"
    open("f/voz.ps1", "w", encoding="utf-8-sig").write(ps)
    subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", os.path.join(AQUI, "f", "voz.ps1")], check=True)

def montar():
    clips, aud, total = [], [], 0
    for i, _, fr in ESC:
        d = dur(f"f/n{i}.wav") + 0.6
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", f"f/n{i}.wav", "-af", f"apad=whole_dur={d}", "-ar", "44100", "-ac", "1", f"f/a{i}.wav"], check=True)
        aud.append(f"f/a{i}.wav"); total += d
        for k, (f, _) in enumerate(fr):
            dd = d / len(fr); n = round(dd * 30)
            z = f"zoompan=z='1+0.05*on/{n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={n}:s=1920x1080:fps=30,fade=t=in:d=0.25,fade=t=out:st={dd-0.25:.2f}:d=0.25"
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", f"f/{f}.png", "-vf", z, "-t", f"{dd:.3f}", "-c:v", "libx264", "-pix_fmt", "yuv420p", f"f/c_{f}.mp4"], check=True)
            clips.append(f"f/c_{f}.mp4")
    open("f/v.txt", "w").write("".join(f"file '{c[2:]}'\n" for c in clips))
    open("f/a.txt", "w").write("".join(f"file '{a[2:]}'\n" for a in aud))
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-i", "f/v.txt", "-f", "concat", "-i", "f/a.txt", "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", "explicativo.mp4"], check=True)
    print("duración", round(dur("explicativo.mp4"), 1), "s")

if __name__ == "__main__":
    if not os.path.exists("f/s6.png") or "--recapturar" in sys.argv: capturar()
    elif "--final" in sys.argv:
        with sync_playwright() as p:
            b = p.chromium.launch(); final(b.new_context(viewport={"width": 1920, "height": 1080})); b.close()
    voz(); montar()
