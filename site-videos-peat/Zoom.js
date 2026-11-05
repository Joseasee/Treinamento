/* zoom.js — zoom para vídeos, apresentações (PPTX) e PDFs do site "Vídeos Peat".
   Instalação: deixe este arquivo na mesma pasta do index.html e, no index.html,
   logo ANTES de </body> (depois do <script> grande), acrescente a linha:
       <script src="zoom.js"></script>
   Como usar: botões − / + / Ajustar, Ctrl + roda do mouse, pinça com dois dedos,
   toque duplo, teclas + − 0. Com zoom, arraste a imagem para mover. */
(() => {
  "use strict";
  const ZMAX = 5, PASSO = 1.4, q = s => document.querySelector(s);
  const caixa = q("#caixa"), stageV = q("#stageV"), v = q("#v"), ctlP = q("#stageP .ctl");
  if (!caixa || !stageV || !v || !ctlP) { console.warn("zoom.js: elementos da página não encontrados."); return; }

  const ZHTML = `<button class="zb" type="button" data-z="menos" aria-label="Diminuir zoom" title="Diminuir zoom (tecla −)">−</button><output class="zv" aria-live="polite">100%</output><button class="zb" type="button" data-z="mais" aria-label="Aumentar zoom" title="Aumentar zoom (tecla +)">+</button><button type="button" data-z="reset" title="Voltar ao tamanho normal (tecla 0)">Ajustar</button>`;

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
.zb{min-width:44px;font-weight:800;font-size:1.1rem;line-height:1}
.vctl{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px 12px;padding:8px;background:#111;color:#fff}
.vctl button{white-space:nowrap;background:#2a2a2a;color:#fff;border:1px solid #444;border-radius:8px;padding:6px 14px;cursor:pointer}
.vctl button:disabled{opacity:.4;cursor:default}
.vctl output{min-width:5ch;text-align:center;font-variant-numeric:tabular-nums}
.vctl #vt{min-width:11ch}
.vctl input[type=range]{flex:1 1 140px;min-width:100px;padding:0;border:0;background:none;accent-color:var(--green)}
#zdica{margin:6px 0 0;font-size:.9rem}`;
  document.head.append(css);

  // Apresentações e PDFs: a "caixa" ganha um quadro recortado por fora, e é ela que recebe o zoom.
  const zw = document.createElement("div"); zw.id = "zwrap"; caixa.before(zw); zw.append(caixa);
  ctlP.querySelector("#tela").insertAdjacentHTML("beforebegin", ZHTML);

  // Vídeo: controles próprios (os nativos também seriam ampliados e sairiam da tela).
  const vc = document.createElement("div"); vc.id = "vcaixa"; v.before(vc); vc.append(v);
  v.controls = false; v.removeAttribute("controls");
  const barra = document.createElement("div"); barra.className = "vctl";
  barra.innerHTML = `<button id="vpl" type="button" aria-label="Reproduzir">▶</button><input id="vsk" type="range" min="0" max="1000" value="0" step="1" aria-label="Posição no vídeo"><output id="vt">0:00 / 0:00</output><button id="vve" type="button" aria-label="Velocidade de reprodução" title="Velocidade">1x</button><button id="vmu" type="button" aria-label="Ligar ou desligar o som" title="Som">🔊</button>${ZHTML}<button id="vtela" type="button">Tela cheia</button>`;
  stageV.append(barra);
  q("#dica")?.insertAdjacentHTML("afterend", `<p class="mute" id="zdica">Zoom: botões − e +, pinça com dois dedos, Ctrl + roda do mouse ou toque duplo. Com zoom, arraste para mover.</p>`);

  // ---------- zoom com arrastar, pinça, roda e toque duplo ----------
  function zoomavel(cx, camada, bar) {
    const o = { Z: 1, X: 0, Y: 0, aoMudar: null, aoToque: null }, pts = new Map();
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

    cx.addEventListener("wheel", e => {
      const k = e.deltaMode ? 16 : 1, dx = e.deltaX * k, dy = e.deltaY * k, r = cx.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) { e.preventDefault(); o.em(o.Z * Math.exp(-dy * 0.002), e.clientX - r.left, e.clientY - r.top); return; }
      if (o.Z <= 1) return;                      // sem zoom, a roda continua rolando a página
      const x = o.X, y = o.Y;
      o.X -= e.shiftKey ? dy : dx; o.Y -= e.shiftKey ? 0 : dy; o.aplicar();
      if (o.X !== x || o.Y !== y) e.preventDefault();
    }, { passive: false });

    cx.addEventListener("pointerdown", e => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
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
      if (pts.size >= 2) {                       // pinça: o ponto sob os dedos acompanha os dedos
        const m = meio(), nz = Math.min(ZMAX, Math.max(1, g.z * m.d / g.d));
        const ax = (g.mx - r.left - g.px) / g.z, ay = (g.my - r.top - g.py) / g.z;
        o.Z = nz; o.X = m.x - r.left - ax * nz; o.Y = m.y - r.top - ay * nz; o.aplicar();
      } else if (o.Z > 1) {                      // um dedo (ou mouse) arrasta a imagem ampliada
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
      if (n - tap.t < 350 && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 30) {   // toque duplo
        clearTimeout(tap.h); tap.t = 0;
        o.em(o.Z > 1 ? 1 : 2.5, e.clientX - r.left, e.clientY - r.top);
      } else tap = { t: n, x: e.clientX, y: e.clientY, h: o.aoToque ? setTimeout(o.aoToque, 280) : 0 };
    };
    cx.addEventListener("pointerup", solta);
    cx.addEventListener("pointercancel", solta);
    return o;
  }

  const zd = zoomavel(zw, caixa, ctlP), zv = zoomavel(vc, v, barra);
  new ResizeObserver(() => zd.aplicar()).observe(zw);
  new ResizeObserver(() => zv.aplicar()).observe(vc);

  // ---------- controles do vídeo ----------
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
  zv.aoToque = () => vpl.click();                // toque simples no vídeo = reproduzir/pausar
  q("#vtela").onclick = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else if (stageV.requestFullscreen) stageV.requestFullscreen().catch(() => {});
    else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();   // iPhone
  };
  document.addEventListener("fullscreenchange", () => { q("#vtela").textContent = document.fullscreenElement === stageV ? "Sair da tela cheia" : "Tela cheia"; });
  vUI();

  // ---------- teclado: + − 0 ----------
  document.addEventListener("keydown", e => {
    if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName || "") || q("#app").hidden) return;
    const o = !q("#stageP").hidden ? (ppt && zd) : (!q("#stageV").hidden && zv);
    if (!o) return;
    if (e.key === "+" || e.key === "=") o.em(o.Z * PASSO);
    else if (e.key === "-" || e.key === "_") o.em(o.Z / PASSO);
    else if (e.key === "0") o.em(1);
    else return;
    e.preventDefault();
  });

  // ---------- ligação com o index.html ----------
  const gancho = (nome, fn) => { const f = window[nome]; if (typeof f === "function") window[nome] = fn(f); };
  gancho("limparVideo", f => () => { f(); zv.reset(); });             // trocou de item: zoom volta ao normal
  gancho("limparPpt", f => () => { f(); zd.reset(); });
  gancho("irSlide", f => i => { f(i); if (ppt) { ppt.q = 1; zd.Y = 0; zd.aplicar(); } });   // página nova abre no topo, com o mesmo zoom

  // PDF é imagem: ao ampliar, redesenha em resolução maior para o texto não ficar borrado.
  gancho("adaptadorPdf", f => pdf => {
    const a = f(pdf), cv = a.dom.querySelector("canvas"), fim = a.destroy; let tk = 0;
    a.pdf = true;
    a.destroy = () => { tk++; fim(); };
    a.renderSingleSlide = async (i, qual = 1) => {
      const eu = ++tk, pg = await pdf.getPage(i + 1), v1 = pg.getViewport({ scale: 1 });
      const vp = pg.getViewport({ scale: Math.min(2 * qual * LARGURA_SLIDE / v1.width, Math.sqrt(1.2e7 / (v1.width * v1.height)), 8192 / Math.max(v1.width, v1.height)) });
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
      if (!ppt || !ppt.pv || !ppt.pv.pdf) return;
      const nit = Math.max(1, (caixa.clientWidth / LARGURA_SLIDE) * zd.Z * (devicePixelRatio || 1) / 2);
      if (Math.abs(nit - (ppt.q || 1)) < 0.15) return;
      ppt.q = nit; Promise.resolve(ppt.pv.renderSingleSlide(ppt.idx, nit)).catch(() => {});
    }, 250);
  };
})();
