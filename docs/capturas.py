#!/usr/bin/env python3
"""Toma las capturas del documento a partir de la herramienta real (servidor en :8765). Uso: python -X utf8 capturas.py"""
import os
from playwright.sync_api import sync_playwright

U = "http://localhost:8765/"
BELGRANO = "#z=-27.462,-58.868,5&n=Puente%20Belgrano"
ITATI = "#z=-27.270,-58.240,10&n=Itat%C3%AD"
os.chdir(os.path.dirname(os.path.abspath(__file__)))

def abre(c, url, espera):
    pg = c.new_page(); pg.goto(url); pg.wait_for_timeout(2500)
    return pg

def sin_recorrido(pg):                          # el recorrido sale siempre: se cierra con Escape
    pg.keyboard.press("Escape"); pg.wait_for_timeout(500)

with sync_playwright() as p:
    b = p.chromium.launch()
    c = b.new_context(viewport={"width": 1440, "height": 900}, color_scheme="light")
    pg = abre(c, U, 0); pg.screenshot(path="img/01-recorrido.png")
    sin_recorrido(pg); pg.wait_for_timeout(25000); pg.screenshot(path="img/02-inicio.png")
    for n, f in (("Ríos", "04-rios"), ("Prensa", "05-prensa"), ("Alertas", "06-alertas"), ("Videos", "07-videos"), ("Enviar", "08-enviar")):
        pg.get_by_role("tab", name=n).click(); pg.wait_for_timeout(1500); pg.screenshot(path=f"img/{f}.png")
    pg.click("#btn-aviso"); pg.wait_for_timeout(1000); pg.screenshot(path="img/09-aviso.png")
    pg.close()
    z = abre(c, U + BELGRANO, 0); z.reload(); z.wait_for_timeout(2500); sin_recorrido(z)
    z.wait_for_timeout(35000); z.screenshot(path="img/03-agua-nueva.png")
    i = abre(c, U + ITATI, 0); i.reload(); i.wait_for_timeout(2500); sin_recorrido(i)
    i.wait_for_timeout(30000); i.locator("#c-prev").scroll_into_view_if_needed(); i.wait_for_timeout(800); i.screenshot(path="img/12-pronostico.png")
    m = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    q = abre(m, U + BELGRANO, 0); q.reload(); q.wait_for_timeout(2500); sin_recorrido(q)
    q.wait_for_timeout(35000); q.screenshot(path="img/10-celular.png")
    b.close()
