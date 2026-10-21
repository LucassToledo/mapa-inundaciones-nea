#!/usr/bin/env python3
"""Toma las capturas del documento a partir de la herramienta real (servidor en :8765). Uso: python -X utf8 capturas.py"""
import os
from playwright.sync_api import sync_playwright

U = "http://localhost:8765/"
ITATI = "#z=-27.270,-58.240,10&n=Itat%C3%AD"
ZONA = "#z=-28.980,-56.920,10&n=Zona%20del%20r%C3%ADo%20Uruguay%20(Corrientes)"
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with sync_playwright() as p:
    b = p.chromium.launch()
    c = b.new_context(viewport={"width": 1440, "height": 900}, color_scheme="light")
    nuevo = c.new_page()                      # primer ingreso: muestra el recorrido guiado
    nuevo.goto(U); nuevo.wait_for_timeout(5000); nuevo.screenshot(path="img/01-recorrido.png"); nuevo.close()
    c.add_init_script("localStorage.setItem('tour-ok','1')")
    pg = c.new_page(); pg.goto(U); pg.wait_for_timeout(7000); pg.screenshot(path="img/02-inicio.png")
    for n, f in (("Ríos", "04-rios"), ("Prensa", "05-prensa"), ("Alertas", "06-alertas"), ("Videos", "07-videos"), ("Enviar", "08-enviar")):
        pg.get_by_role("tab", name=n).click(); pg.wait_for_timeout(1500); pg.screenshot(path=f"img/{f}.png")
    pg.click("#btn-aviso"); pg.wait_for_timeout(1000); pg.screenshot(path="img/09-aviso.png")
    pg2 = c.new_page(); pg2.goto(U + ZONA); pg2.reload(); pg2.wait_for_timeout(40000); pg2.screenshot(path="img/03-zona.png")
    pg3 = c.new_page(); pg3.goto(U + ITATI); pg3.reload(); pg3.wait_for_timeout(30000); pg3.screenshot(path="img/11-fotos.png")
    pg3.locator("#c-prev").scroll_into_view_if_needed(); pg3.wait_for_timeout(800); pg3.screenshot(path="img/12-pronostico.png")
    m = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    m.add_init_script("localStorage.setItem('tour-ok','1')")
    q = m.new_page(); q.goto(U + ZONA); q.reload(); q.wait_for_timeout(40000); q.screenshot(path="img/10-celular.png")
    b.close()
