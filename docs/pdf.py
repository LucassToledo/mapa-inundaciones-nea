#!/usr/bin/env python3
"""Genera documento-ICCTI.pdf desde documento.html. Uso: python -X utf8 pdf.py"""
import os
from playwright.sync_api import sync_playwright

os.chdir(os.path.dirname(os.path.abspath(__file__)))
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    pg.goto("file:///" + os.path.abspath("documento.html").replace("\\", "/")); pg.wait_for_timeout(1500)
    pg.pdf(path="documento-ICCTI.pdf", format="A4", print_background=True, display_header_footer=True,
           header_template="<span></span>",
           footer_template='<div style="width:100%;font-size:8px;color:#666;text-align:center;font-family:sans-serif">Mapa de inundaciones Chaco y NEA · <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
           margin={"top": "22mm", "right": "20mm", "bottom": "20mm", "left": "20mm"})
    b.close()
