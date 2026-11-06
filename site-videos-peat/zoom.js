/* zoom.js (versão 2) — zoom para vídeos, apresentações (PPTX) e PDFs do site "Vídeos Peat".
   Instalação: deixe este arquivo na mesma pasta do index.html e, no index.html, antes de </body>:
       <script src="zoom.js?v=2"></script>
   Onde aparece: botões − 100% + Ajustar no CANTO SUPERIOR DIREITO da imagem (vídeo, PPTX e PDF).
   Como usar: roda do mouse (sobre a imagem), pinça com dois dedos, toque duplo, botões e teclas + − 0.
   Com zoom, arraste a imagem para mover. */
(() => {
  "use strict";
  const ZMAX = 6, PASSO = 1.4, q = s => document.querySelector(s);
  const P = () => { try { return ppt; } catch { return null; } };
  const LW = () => { try { return LARGURA_SLIDE; } catch { return 960; } };

  function iniciar() {
    const caixa = q("#caixa"), stageV = q("#stageV"), v = q("#v");
    if (!caixa || !stageV || !v) { console.warn("zoom.js: não achei #caixa, #stageV ou #v no index.html."); return; }
    if (q("#zwrap")) return;

    const ZOV = `<div class="zov"><button class="zb" type="button" data-z="menos" aria-label="Diminuir zoom" title="Diminuir zoom">−</button><output class="zv" aria-live="polite">100%</output><button class="zb" type="button" data-z="mais" aria-label="Aumentar zoom" title="Aumentar zoom">+</button><button type="button" data-z="reset" title="Voltar ao tamanho normal">Ajustar</button></div>`;
    const css = document.createElement("style");
    css.textContent = `
#zwrap,#vcaixa{position:relative;overflow:hidden;touch-action:pan-y}
#zwrap{margin:auto;width:fit-content;max-width:100%}
#zwrap #caixa{margin:0;transform-origin:0 0}
#vcaixa{aspect-ratio:16/9;background:#000}
#vcaixa video{transform-origin:0 0}
#zwrap.zoomed,#vcaixa.zoomed{touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none}
#stageV{aspect-ratio:auto;display:flex;flex-direction:column}
#stageV:fullscreen{justify-content:center}
#stageV:fullscreen #vcaixa{flex:1;aspect-ratio:auto;min-height:0}
.zov{position:absolute;top:8px;right:8px;z-index:4;display:flex;align-items:center;gap:4px;padding:4px;border-radius:10px;background:rgba(0,0,0,.65);color:#fff}
.zov button{min-width:36px;height:36px;padding:0 8px;border:0;border-radius:8px;background:rgba(255,255,255,.2);color:#fff;font-family:inherit;font-size:.8rem;cursor:pointer}
.zov .zb{font-size:1.2rem;font-weight:800;line-height:1}
.zov button:disabled{opacity:.35;cursor:default}
.zov output{min-width:4ch;text-align:center;font-size:.8rem;font-variant-numeric:tabular-nums}
.vctl{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px 12px;padding:8px;background:#111;color:#fff}
.vctl button{white-space:nowrap;background:#2a2a2a;color:#fff;border:1px solid #444;border-radius:8px;padding:6px 14px;cursor:pointer}
.vctl output{min-width:5ch;text-align:center;font-variant-numeric:tabular-nums}
.vctl #vt{min-width:11ch}
.vctl input[type=range]{flex:1 1 140px;min-width:100px;padding:0;border:0;background:none;accent-color:var(--green)}
#zdica{margin:6px 0 0;font-size:.9rem}`;
    document.head.append(css);

    const zw = document.createElement("div"); zw.id = "zwrap"; caixa.before(zw); zw.append(caixa); zw.insertAdjacentHTML("beforeend", ZOV);
    const vc = document.createElement("div"); vc.id = "vcaixa"; v.before(vc); vc.append(v); vc.insertAdjacentHTML("beforeend", ZOV);
    v.controls = false; v.removeAttribute("controls");
    const barra = document.createElement("div"); barra.className = "vctl";
    barra.innerHTML = `<button id="vpl" type="button" aria-label="Reproduzir">▶</button><input id="vsk" type="range" min="0" max="1000" value="0" step="1" aria-label="Posição no vídeo"><output id="vt">0:00 / 0:00</output><button id="vve" type="button" aria-label="Velocidade" title="Velocidade">1x</button><button id="vmu" type="button" aria-label="Som" title="Som">🔊</button><button id="vtela" type="button">Tela cheia</button>`;
    stageV.append(barra);
    q("#dica")?.insertAdjacentHTML("afterend", `<p class="mute" id="zdica">Zoom: roda do mouse sobre a imagem, pinça com dois dedos ou toque duplo. Com zoom, arraste para mover.</p>`);

    function zoomavel(cx, camada) {
      const o = { Z: 1, X: 0, Y: 0, aoMudar: null, aoToque: null }, pts = new Map(), bar = cx.querySelector(".zov");
      const ui = { v: bar.querySelector(".zv"), m: bar.querySelector('[data-z="menos"]'), p: bar.querySelector('[data-z="mais"]'), r: bar.querySelector('[data-z="reset"]') };
      let g = null, tap = { t: 0, x: 0, y: 0, h: 0 };
      const meio = () => { const [a, b] = [...pts.values()]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) || 1 }; };
      o.aplicar = () => {
        const w = cx.clientWidth, h = cx.clientHeight;
        o.X = o.Z <= 1 ? 0 : Math.min(0, Math.max(w - w * o.Z, o.X));
        o.Y = o.Z <= 1 ? 0 : Math.min(0, Math.max(h - h * o.Z, o.Y));
        camada.style.transform = o.Z <= 1 ? "" : `translate(${o.X}px,${o.Y}px) scale(${o.Z})`;
        cx.classList.toggle("zoomed", o.Z > 1);
        ui.v.textContent = Math.round(o.Z * 100) + "%";
        ui.m.disabled = ui.r.disabled = o.Z <= 1; ui.p.disabled = o.Z >= ZMAX;
        if (o.aoMudar) o.aoMudar();
      };
      o.em = (nz, ox = cx.clientWidth / 2, oy = cx.clientHeight / 2) => {
        nz = Math.min(ZMAX, Math.max(1, nz)); if (nz < o.Z && nz < 1.03) nz = 1;
        o.X = ox - (ox - o.X) * nz / o.Z; o.Y = oy - (oy - o.Y) * nz / o.Z; o.Z = nz; o.aplicar();
      };
      o.reset = () => { o.Z = 1; o.X = o.Y = 0; pts.clear(); g = null; clearTimeout(tap.h); o.aplicar(); };
      bar.querySelectorAll("[data-z]").forEach(b => { b.onclick = () => o.em(b.dataset.z === "mais" ? o.Z * PASSO : b.dataset.z === "menos" ? o.Z / PASSO : 1); });

      // Roda do mouse: para cima aproxima, para baixo afasta (sem zoom, para baixo continua rolando a página).
      cx.addEventListener("wheel", e => {
        const dy = e.deltaY * (e.deltaMode ? 16 : 1), r = cx.getBoundingClientRect();
        if (dy < 0 || o.Z > 1 || e.ctrlKey) { e.preventDefault(); o.em(o.Z * Math.exp(-dy * 0.0015), e.clientX - r.left, e.clientY - r.top); }
      }, { passive: false });

      cx.addEventListener("pointerdown", e => {
        if (e.target.closest(".zov") || (e.pointerType === "mouse" && e.button !== 0)) return;
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: Date.now() });
        if (pts.size === 2) {
          const m = meio(); clearTimeout(tap.h);
          g = { d: m.d, z: o.Z, mx: m.x, my: m.y, px: o.X, py: o.Y, mov: true };
          pts.forEach((_, id) => { try { cx.setPointerCapture(id); } catch {} });
        } else if (pts.size === 1) g = { px: o.X, py: o.Y, mov: false };
      });
      cx.addEventListener("pointermove", e => {
        const p = pts.get(e.pointerId); if (!p || !g) return;
        p.x = e.clientX; p.y = e.clientY;
        const r = cx.getBoundingClientRect();
        if (pts.size >= 2) {
          const m = meio(), nz = Math.min(ZMAX, Math.max(1, g.z * m.d / g.d));
          const ax = (g.mx - r.left - g.px) / g.z, ay = (g.my - r.top - g.py) / g.z;
          o.Z = nz; o.X = m.x - r.left - ax * nz; o.Y = m.y - r.top - ay * nz; o.aplicar();
        } else if (o.Z > 1) {
          if (!g.mov) {
            if (Math.hypot(p.x - p.x0, p.y - p.y0) < 6) return;
            g.mov = true; clearTimeout(tap.h);
            try { cx.setPointerCapture(e.pointerId); } catch {}
          }
          o.X = g.px + p.x - p.x0; o.Y = g.py + p.y - p.y0; o.aplicar();
        }
      });
      const solta = e => {
        const p = pts.get(e.pointerId); if (!p) return;
        pts.delete(e.pointerId);
        const toque = e.type === "pointerup" && g && !g.mov && Date.now() - p.t < 400 && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 10;
        if (pts.size === 1) { const [s] = [...pts.values()]; s.x0 = s.x; s.y0 = s.y; g = { px: o.X, py: o.Y, mov: true }; }
        else if (!pts.size) g = null;
        if (!toque) return;
        const n = Date.now(), r = cx.getBoundingClientRect();
        if (n - tap.t < 350 && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 30) {
          clearTimeout(tap.h); tap.t = 0;
          o.em(o.Z > 1 ? 1 : 2.5, e.clientX - r.left, e.clientY - r.top);
        } else tap = { t: n, x: e.clientX, y: e.clientY, h: o.aoToque ? setTimeout(o.aoToque, 280) : 0 };
      };
      cx.addEventListener("pointerup", solta);
      cx.addEventListener("pointercancel", solta);
      return o;
    }

    const zd = zoomavel(zw, caixa), zv = zoomavel(vc, v);
    new ResizeObserver(() => zd.aplicar()).observe(zw);
    new ResizeObserver(() => zv.aplicar()).observe(vc);

    // ---------- controles do vídeo (os nativos sairiam da tela com o zoom) ----------
    const fmt = s => isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00";
    const vpl = q("#vpl"), vsk = q("#vsk"), vt = q("#vt"), vmu = q("#vmu"), vve = q("#vve"), VEL = [1, 1.25, 1.5, 2];
    let arrasta = false;
    const vUI = () => {
      vpl.textContent = v.paused ? "▶" : "⏸"; vpl.setAttribute("aria-label", v.paused ? "Reproduzir" : "Pausar");
      vt.textContent = `${fmt(v.currentTime)} / ${fmt(v.duration)}`;
      if (!arrasta) vsk.value = v.duration ? 1000 * v.currentTime / v.duration : 0;
      vmu.textContent = v.muted || !v.volume ? "🔇" : "🔊";
      vve.textContent = v.playbackRate + "x";
    };
    ["play", "pause", "ended", "timeupdate", "durationchange", "loadedmetadata", "emptied", "volumechange", "ratechange"].forEach(ev => v.addEventListener(ev, vUI));
    vpl.onclick = () => (v.paused ? v.play().catch(() => {}) : v.pause());
    vsk.oninput = () => { arrasta = true; if (v.duration) v.currentTime = vsk.value / 1000 * v.duration; };
    vsk.onchange = () => { arrasta = false; vUI(); };
    vmu.onclick = () => { v.muted = !v.muted; };
    vve.onclick = () => { v.playbackRate = VEL[(VEL.indexOf(v.playbackRate) + 1) % VEL.length]; };
    zv.aoToque = () => vpl.click();
    q("#vtela").onclick = () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else if (stageV.requestFullscreen) stageV.requestFullscreen().catch(() => {});
      else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
    };
    document.addEventListener("fullscreenchange", () => { q("#vtela").textContent = document.fullscreenElement === stageV ? "Sair da tela cheia" : "Tela cheia"; });
    vUI();

    document.addEventListener("keydown", e => {
      if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName || "") || q("#app")?.hidden) return;
      const o = !q("#stageP")?.hidden ? (P() && zd) : (!stageV.hidden && zv);
      if (!o) return;
      if (e.key === "+" || e.key === "=") o.em(o.Z * PASSO);
      else if (e.key === "-" || e.key === "_") o.em(o.Z / PASSO);
      else if (e.key === "0") o.em(1);
      else return;
      e.preventDefault();
    });

    // ---------- ligação com o index.html ----------
    const gancho = (nome, fn) => { const f = window[nome]; if (typeof f === "function") window[nome] = fn(f); };
    gancho("limparVideo", f => () => { f(); zv.reset(); });
    gancho("limparPpt", f => () => { f(); zd.reset(); });
    gancho("irSlide", f => i => { f(i); const p = P(); if (p) { p.q = 1; zd.Y = 0; zd.aplicar(); } });
    gancho("adaptadorPdf", f => pdf => {   // PDF é imagem: ao ampliar, redesenha em resolução maior
      const a = f(pdf), cv = a.dom.querySelector("canvas"), fim = a.destroy; let tk = 0;
      a.pdf = true;
      a.destroy = () => { tk++; fim(); };
      a.renderSingleSlide = async (i, qual = 1) => {
        const eu = ++tk, pg = await pdf.getPage(i + 1), v1 = pg.getViewport({ scale: 1 });
        const vp = pg.getViewport({ scale: Math.min(2 * qual * LW() / v1.width, Math.sqrt(1.2e7 / (v1.width * v1.height)), 8192 / Math.max(v1.width, v1.height)) });
        const c = document.createElement("canvas"); c.width = vp.width; c.height = vp.height;
        await pg.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
        if (eu !== tk) return;
        cv.width = c.width; cv.height = c.height; cv.getContext("2d").drawImage(c, 0, 0);
      };
      return a;
    });
    let tn = 0;
    zd.aoMudar = () => {
      clearTimeout(tn);
      tn = setTimeout(() => {
        const p = P(); if (!p || !p.pv || !p.pv.pdf) return;
        const nit = Math.max(1, (caixa.clientWidth / LW()) * zd.Z * (devicePixelRatio || 1) / 2);
        if (Math.abs(nit - (p.q || 1)) < 0.15) return;
        p.q = nit; Promise.resolve(p.pv.renderSingleSlide(p.idx, nit)).catch(() => {});
      }, 250);
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
