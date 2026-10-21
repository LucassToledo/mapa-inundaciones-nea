#!/usr/bin/env python3
"""Capturas 13 (Foto HD a nivel de calle) y 14 (modo Mapa, sin paneles). Servidor en :8765. Uso: python -X utf8 capturas_hd.py"""
import os
from playwright.sync_api import sync_playwright

U = "http://localhost:8765/#z=-27.270,-58.240,10&n=Itat%C3%AD"
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with sync_playwright() as p:
    b = p.chromium.launch()
    c = b.new_context(viewport={"width": 1440, "height": 900}, color_scheme="light")
    c.add_init_script("localStorage.setItem('tour-ok','1')")
    pg = c.new_page(); pg.goto(U); pg.reload(); pg.wait_for_timeout(6000)
    pg.click('.dk[data-l="hd"]'); pg.wait_for_timeout(1500)
    bb = pg.locator('.yo').bounding_box(); pg.mouse.move(bb['x'] + 8, bb['y'] + 8)   # punto elegido (el pueblo)
    for _ in range(13):
        pg.mouse.wheel(0, -120); pg.wait_for_timeout(250)
    pg.wait_for_timeout(5000); pg.screenshot(path="img/13-foto-hd.png")
    pg.click("#min-panel"); pg.click("#min-top"); pg.wait_for_timeout(1000); pg.screenshot(path="img/14-minimizado.png")
    pg.click("#solo"); pg.mouse.move(700, 300); pg.wait_for_timeout(1500); pg.screenshot(path="img/15-solo-mapa.png")
    b.close()
