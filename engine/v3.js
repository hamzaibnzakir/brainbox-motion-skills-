// BRAINBOX MOTION ENGINE v3 — editorial light + dark pivots. Deterministic: frame = f(t).
(function () {
  const TR = 0.42;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const eo = (p) => 1 - Math.pow(1 - p, 3);
  const eio = (p) => (p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const lerp = (a, b, p) => a + (b - a) * p;
  const icon = (n) => (window.ICONS && window.ICONS[n]) || window.ICONS.sparkles;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const acc = (s) => esc(s).replace(/\*([^*]+)\*/g, '<span class="acc">$1</span>').replace(/\s*\|\s*/g, '<br>');
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const setT = (el, tr, o) => { el.style.transform = tr; if (o != null) el.style.opacity = o; };
  const STAR = '<svg viewBox="0 0 24 24" fill="currentColor" class="ic"><path d="M12 1.5c.6 5.6 4.9 9.9 10.5 10.5-5.6.6-9.9 4.9-10.5 10.5C11.4 16.9 7.1 12.6 1.5 12 7.1 11.4 11.4 7.1 12 1.5z"/></svg>';
  const sentence = (s) => { const x = s.replace(/\*/g, '').toLowerCase(); return x.charAt(0).toUpperCase() + x.slice(1); };
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9%$']/g, '');
  const isDark = (b) => !!(b.bg === 'void' || (b.visual && b.visual.type === 'prompt'));
  const isData = (b) => !!(b.visual && (b.visual.type === 'gauge' || b.visual.type === 'stat'));

  // entrance helpers
  const rise = (t, t0, d = .45, dist = 40) => { const p = clamp((t - t0) / d); return { o: eo(p), y: (1 - eo(p)) * dist, p }; };

  // ---------- visual builders (return {el, update(t), stack?}) ----------
  const V = {
    icon(v) {
      const el = h('div', null); const tile = h('div', 'tile' + (v.tone === 'bad' ? ' bad' : ''), icon(v.icon)); el.append(tile);
      let bd = null; if (v.badge) { bd = h('div', 'tbadge' + (v.badgeTone === 'good' ? ' good' : ''), icon(v.badge)); el.append(bd); }
      return { el, open: true, update(t) {
        setT(tile, `translateY(${Math.sin(t * 1.6) * 10}px) rotate(${Math.sin(t * .9) * 2}deg)`);
        if (bd) { const p = clamp((t - v.badgeT) / .35); setT(bd, `scale(${p ? lerp(.4, 1, eo(p)) + Math.sin(p * Math.PI) * .12 : .4}) rotate(${(1 - p) * -30}deg)`, clamp(p * 3)); }
      } };
    },
    browser(v) {
      const el = h('div', 'br');
      el.innerHTML = `<div class="bar"><div class="dot" style="background:#FF5F57"></div><div class="dot" style="background:#FEBC2E"></div><div class="dot" style="background:#28C840"></div><div class="url">${esc(v.url || 'yourstore.com')}</div></div>`;
      const page = h('div', 'page');
      page.innerHTML = `<div class="nav" data-k="nav">${esc(v.brand || 'STORE')}<div><i></i><i></i><i></i></div></div>
        <div class="hero" data-k="hero"><b>${esc(v.hero || 'Elevate your lifestyle')}</b><span>Shop now</span></div>
        <div class="grid3" data-k="grid"><div class="prod"></div><div class="prod"></div><div class="prod"></div></div>
        <div class="ship" data-k="ship">${esc(v.ship || 'Shipping calculated at checkout')}</div>`;
      el.append(page);
      const mks = (v.marks || []).map((m) => { const k = h('div', 'mk' + (m.kind === 'good' ? ' good' : ''), `<div class="mx">${icon(m.kind === 'good' ? 'check' : 'x')}</div>` + (m.text ? `<div class="mt">${esc(m.text)}</div>` : '')); page.append(k); return { m, k }; });
      let placed = false;
      return { el, stack: true, update(t) {
        if (!placed) { mks.forEach(({ m, k }) => { const g = page.querySelector(`[data-k="${m.target}"]`); if (g) Object.assign(k.style, { left: g.offsetLeft - 10 + 'px', top: g.offsetTop - 10 + 'px', width: g.offsetWidth + 20 + 'px', height: g.offsetHeight + 20 + 'px' }); }); placed = true; }
        const sp = v.scrollT != null ? eio(clamp((t - v.scrollT) / .8)) : 0; page.style.transform = `translateY(${-sp * (v.scroll || 130)}px)`;
        mks.forEach(({ m, k }) => { const p = clamp((t - m.t) / .3); setT(k, `scale(${lerp(1.12, 1, eo(p))})`, clamp(p * 2.5)); });
      } };
    },
    prompt(v) {
      const el = h('div', 'term');
      el.innerHTML = `<div class="tb"><div class="dot"></div><div class="dot"></div><div class="dot"></div><span>AI CHAT · ANY MODEL</span></div><div class="body"><span class="ps">› </span><span class="typed"></span><i class="caret"></i><div class="rep"></div></div>`;
      const typed = el.querySelector('.typed'), caret = el.querySelector('.caret'), rep = el.querySelector('.rep');
      const lines = (v.reply || []).map(() => { const d = h('div', 'rl'); rep.append(d); return d; });
      const full = v.prompt || '';
      return { el, stack: true, update(t) {
        const n = clamp(Math.floor((t - v.t) * 48), 0, full.length); typed.textContent = full.slice(0, n);
        const rt = v.replyT != null ? v.replyT : v.t + full.length / 48 + .4;
        caret.style.opacity = t < rt ? (Math.floor(t * 3.2) % 2 ? 1 : .15) : 0;
        rep.style.opacity = t >= rt ? 1 : 0;
        lines.forEach((d, k) => { const s = v.reply[k], m = clamp(Math.floor((t - rt - k * .42) * 70), 0, s.length); d.textContent = s.slice(0, m); d.style.opacity = m ? 1 : 0; });
      } };
    },
    checklist(v) {
      const el = h('div', 'list'); const n = (v.items || []).length;
      if (n > 3) { el.style.gap = (n > 4 ? 18 : 24) + 'px'; }
      const rows = (v.items || []).map((it) => { const r = h('div', 'it', `<div class="st">${STAR}</div><div class="tx">${esc(it.text)}</div>`); if (n > 3) r.style.fontSize = (n > 4 ? 42 : 46) + 'px'; el.append(r); return { it, r, st: r.firstChild }; });
      return { el, open: true, update(t) {
        rows.forEach(({ it, r, st }) => {
          const p = rise(t, it.t - .2, .4, 26); setT(r, `translateX(${(1 - p.p) * -30}px)`, .22 + .78 * p.o);
          const done = t >= it.t + .3; r.classList.toggle('done', done && it.ok !== false); r.classList.toggle('bad', done && it.ok === false);
          st.innerHTML = done && it.ok === false ? icon('x') : STAR; st.style.transform = `rotate(${done ? 0 : 45}deg) scale(${done ? 1 : .8})`;
        });
      } };
    },
    compare(v) {
      const el = h('div', 'cmp');
      const col = (c, t, xs) => `<div class="side ${c}"><div class="tag">${t}</div>${xs.map((x) => `<div class="li">${esc(x)}</div>`).join('')}</div>`;
      el.innerHTML = col('before', esc(v.beforeLabel || 'BEFORE'), v.before || []) + col('after', esc(v.afterLabel || 'AFTER'), v.after || []);
      const af = el.querySelector('.after'), bf = el.querySelector('.before'), lis = [...af.querySelectorAll('.li')];
      return { el, open: true, update(t) {
        const p = eo(clamp((t - v.t) / .55));
        af.style.transform = `translateX(${(1 - p) * 700}px) rotate(${lerp(14, 3, p)}deg)`; af.style.opacity = clamp(p * 2);
        bf.style.transform = `translateX(${p * -20}px) rotate(${lerp(-1, -5, p)}deg) scale(${lerp(1, .96, p)})`; bf.style.filter = `grayscale(${p}) blur(${p * 1.2}px)`;
        lis.forEach((li, k) => { const r = rise(t, v.t + .35 + k * .13, .35, 20); setT(li, `translateY(${r.y}px)`, r.o); });
      } };
    },
    flow(v) {
      const el = h('div', 'flowv'); const n = (v.nodes || []).length; const gap = 600 / n;
      const ys = v.nodes.map((_, i) => 40 + i * gap + (gap - 120) / 2);
      const pts = ys.map((y) => [70, y + 60]);
      const d = `M70 ${pts[0][1] - 40} ` + pts.map((p) => `L70 ${p[1]} L130 ${p[1]} M70 ${p[1]}`).join(' ') + ` L70 ${pts[n - 1][1] + 40}`;
      el.innerHTML = `<svg class="con" width="900" height="620"><path d="${d}" fill="none" stroke="#151517" stroke-width="4" pathLength="100" stroke-dasharray="100 100"/>${pts.map((p) => `<circle cx="70" cy="${p[1]}" r="9" fill="#fff" stroke="#151517" stroke-width="4"/>`).join('')}</svg>`;
      const path = el.querySelector('path'), dots = [...el.querySelectorAll('circle')];
      const nds = v.nodes.map((nd, i) => { const e = h('div', 'nd', `<div class="ni">${icon(nd.icon)}</div><div>${esc(nd.text)}</div>`); e.style.top = ys[i] + 'px'; el.append(e); return { nd, e }; });
      return { el, open: true, update(t) {
        const last = nds[nds.length - 1].nd.t, p = clamp((t - (nds[0].nd.t - .3)) / Math.max(.6, last - nds[0].nd.t + .6));
        path.setAttribute('stroke-dashoffset', 100 - p * 100);
        nds.forEach(({ nd, e }, i) => { const r = rise(t, nd.t - .15, .4, 30); setT(e, `translateX(${(1 - r.p) * 40}px)`, .2 + .8 * r.o); dots[i].setAttribute('fill', t >= nd.t ? '#6A52F5' : '#fff');
          const nx = nds[i + 1]; e.classList.toggle('on', t >= nd.t && (!nx || t < nx.nd.t)); });
      } };
    },
    gauge(v) {
      const el = h('div', 'data');
      el.innerHTML = `<svg class="gg" viewBox="0 0 700 380"><path d="M70 350 A280 280 0 0 1 630 350" stroke="#E2E2DE" stroke-width="34" fill="none" stroke-linecap="round"/><path class="arc" d="M70 350 A280 280 0 0 1 630 350" stroke-width="34" fill="none" stroke-linecap="round" pathLength="100" stroke-dasharray="0 100"/></svg><div class="num" style="margin-top:-230px">0</div><div class="lab">${esc(v.label || 'Score')}</div>`;
      const arc = el.querySelector('.arc'), num = el.querySelector('.num');
      return { el, open: true, update(t) {
        let val = lerp(0, v.from, eo(clamp((t - v.t) / .9))); if (v.t2 != null) val = lerp(val, v.to, eio(clamp((t - v.t2) / 1.1)));
        const c = val < 50 ? '#E2453C' : val < 90 ? '#F0A34A' : '#23A26D';
        arc.setAttribute('stroke-dasharray', `${val} 100`); arc.setAttribute('stroke', c); num.textContent = Math.round(val); num.style.color = c === '#F0A34A' ? '#151517' : c;
      } };
    },
    stat(v) {
      const el = h('div', 'data', `<div class="num"></div><div class="lab">${esc(v.label || '')}</div><div class="star" style="right:120px;top:120px">${STAR}</div>`);
      const num = el.querySelector('.num'), star = el.querySelector('.star');
      return { el, open: true, update(t) {
        const p = eo(clamp((t - v.t) / 1)); num.innerHTML = (v.prefix || '') + lerp(v.from || 0, v.to, p).toFixed(v.decimals || 0) + (v.suffix ? `<small>${esc(v.suffix)}</small>` : '');
        star.style.transform = `rotate(${t * 40}deg) scale(${p >= 1 ? 1 : .6})`; star.style.opacity = p >= 1 ? 1 : .3;
      } };
    },
    image(v) {
      const el = h('div', null); el.style.cssText = `position:absolute;inset:0;background:url("${(window.__ROOT || '') + v.src}") center/cover`;
      return { el, stack: true, update(t) { el.style.transform = `scale(${1.04 + .03 * Math.sin(t * .4)})`; } };
    },
  };

  // ---------- avatar ----------
  const AV = { talk: ['default', 'talking'], happy: ['happy', 'excited'], shock: ['talking', 'excited'], smug: ['default', 'talking'], wink: ['happy', 'excited'], serious: ['serious', 'talking'], think: ['thinking', 'thinking'] };
  const AVF = ['default', 'talking', 'happy', 'excited', 'thinking', 'serious', 'presenting', 'explaining', 'celebrating', 'main'];
  const ready = [];
  function imgSet(box, cls) {
    box._i = {}; AVF.forEach((f) => { const im = document.createElement('img'); im.src = (window.__ROOT || '') + D.avatar.dir + '/' + f + '.png'; im.style.visibility = 'hidden'; ready.push(im.decode().catch(() => {})); box.append(im); box._i[f] = im; });
  }
  const show = (box, f) => { for (const [k, im] of Object.entries(box._i)) im.style.visibility = k === f ? 'visible' : 'hidden'; };

  // ---------- build ----------
  let D, stage, L = [], bgP, bgN, grid, swoosh, host, hostAv, wm;
  function chunksOf(b) {
    const out = []; let cur = [];
    (b.words || []).forEach((w, i) => { cur.push(w); const end = /[.?!:]$/.test(w.text) || (cur.length >= 9 && /[,;]$/.test(w.text)) || cur.length >= 12; if (end) { out.push(cur); cur = []; } });
    if (cur.length) out.push(cur);
    return out;
  }
  function buildNar(ws, b, big) {
    const el = h('div', 'nar' + (big ? ' big' : ''));
    const boxWords = new Set();
    if (b.box) { const bw = b.box.split(/\s+/).map(norm); for (let i = 0; i + bw.length <= ws.length; i++) if (bw.every((x, k) => norm(ws[i + k].text) === x)) { for (let k = 0; k < bw.length; k++) boxWords.add(i + k); break; } }
    const spans = []; let line = null, mode = null, boxEl = null;
    ws.forEach((w, i) => {
      const m = boxWords.has(i) ? 'box' : w.em ? 'em' : 'n';  // a boxed phrase always sits together on its own line
      if (m !== mode) { line = h('div', 'ln' + (m === 'em' ? ' em' : m === 'box' ? ' bx' : '')); el.append(line); mode = m; boxEl = null; }
      const sp = h('span', 'w', esc(w.text));
      if (boxWords.has(i)) { if (!boxEl) { boxEl = h('span', 'box'); line.append(boxEl); boxEl._t = w.start; } boxEl.append(sp); }
      else { boxEl = null; line.append(sp); }
      spans.push({ w, sp, box: boxWords.has(i) });
    });
    el._spans = spans; el._boxes = [...el.querySelectorAll('.box')];
    return el;
  }
  function buildBeat(b, i) {
    const dark = isDark(b); const layout = b.layout || (b.visual ? 'stage' : 'punch');
    const P = { L: h('div', 'L' + (dark ? ' dark' : '')), layout, dark, b };
    if (layout === 'punch') {
      if (b.header) { P.kick = h('div', 'kicker pk', esc(b.header.replace(/\*/g, ''))); P.L.append(P.kick); }
    } else {
      let title = null, kick = b.label || null;
      if (b.header) {
        const m = b.header.match(/^(\d+)\s*[·.:-]\s*(.*)$/), bo = b.header.match(/^BONUS\s*·\s*(.*)$/i);
        if (m) { kick = 'Step ' + String(m[1]).padStart(2, '0'); title = m[2]; } else if (bo) { kick = 'Bonus'; title = bo[1]; } else title = b.header;
        title = title.split('*').map((s, k) => (k % 2 ? '*' + s.toLowerCase() + '*' : s.toLowerCase())).join(''); title = title.replace(/^(\W*)(\w)/, (a, p, c) => p + c.toUpperCase());
      } else if (b.headline) title = b.headline;
      if (kick) { P.kick = h('div', 'kicker', esc(kick)); P.kick.style.top = '178px'; P.L.append(P.kick); }
      if (title) { P.title = h('div', 'title', acc(title)); P.title.style.top = kick ? '222px' : '200px'; P.L.append(P.title); }
    }
    if (layout === 'bix') {
      P.pose = h('div', 'pose', '<div class="card"><div class="ph"></div></div>'); P.ph = P.pose.querySelector('.ph'); P.L.append(P.pose);
    } else if (b.visual && V[b.visual.type]) {
      const vis = V[b.visual.type](b.visual); P.vis = vis;
      P.box = h('div', 'v3'); const rig = h('div', 'rig'); P.box.append(rig); P.rig = rig;
      if (vis.stack) { rig.append(h('div', 'sheet back2'), h('div', 'sheet back1')); const f = h('div', 'sheet'); f.append(vis.el); P.shine = h('div', 'shine'); f.append(P.shine); rig.append(f); }
      else rig.append(vis.el);
      P.L.append(P.box);
    }
    if (b.chips && b.chips.length) {
      P.tags = h('div', 'tags'); if (layout === 'bix') P.tags.style.top = '1140px';
      P.tg = b.chips.map((c) => { const e = h('div', 'tg' + (c.kind ? ' ' + c.kind : ''), (c.icon ? `<div class="ci">${icon(c.icon)}</div>` : '') + esc(c.text)); P.tags.append(e); return { c, e }; });
      P.L.append(P.tags);
    }
    if (b.stamp) { P.hl = h('div', 'hl', esc(b.stamp.text)); P.hl.style.top = (b.stamp.y ? b.stamp.y - 20 : 800) + 'px'; P.L.append(P.hl); }
    P.chunks = chunksOf(b).map((ws) => { const n = buildNar(ws, b, layout === 'punch'); P.L.append(n); return { ws, n, start: ws[0].start - .12 }; });
    P.chunks.forEach((c, k) => { c.end = k + 1 < P.chunks.length ? P.chunks[k + 1].start : b.end; });
    stage.append(P.L);
    return P;
  }
  function init(data) {
    D = data; stage = document.getElementById('stage');
    bgP = h('div', 'L bg-paper', '<div class="grid"></div>'); grid = bgP.firstChild;
    swoosh = h('div', null, `<svg class="swoosh" viewBox="0 0 1500 420" style="top:300px"><path d="M-50 330 C 300 330, 420 60, 760 70 S 1250 300, 1560 120" fill="none" stroke="#E3E3E0" stroke-width="110" stroke-linecap="round"/></svg><svg class="swoosh" viewBox="0 0 1500 420" style="top:1380px"><path d="M-50 120 C 300 120, 420 360, 760 350 S 1250 120, 1560 300" fill="none" stroke="#E3E3E0" stroke-width="110" stroke-linecap="round"/></svg>`);
    bgP.append(...swoosh.childNodes); swoosh = [...bgP.querySelectorAll('.swoosh')];
    bgN = h('div', 'L bg-night', '<div class="glow"></div>');
    stage.append(bgP, bgN);
    L = D.beats.map(buildBeat);
    wm = h('div', 'wm', 'brainbox'); stage.append(wm);
    if (D.avatar) {
      host = h('div', 'host', '<div class="av"></div><div class="nm">Brainbox<span>AI · ECOM · AUTOMATION</span></div>'); hostAv = host.firstChild; stage.append(host);
      imgSet(hostAv); L.forEach((P) => { if (P.ph) imgSet(P.ph); });
    }
  }
  function fit() {
    L.forEach((P) => {
      P.L.style.display = 'block';
      const fitEl = (el, maxH, minF) => { if (!el) return; let k = 1; while (el.offsetHeight > maxH && k > .55) { k -= .06; el.style.fontSize = ''; el.querySelectorAll('.w').forEach((w) => { w.style.fontSize = ''; }); el.style.zoom = k; } };
      if (P.title) { let fs = 76; while (P.title.offsetHeight > 170 && fs > 48) { fs -= 4; P.title.style.fontSize = fs + 'px'; } }
      if (P.pose && P.title && P.title.offsetTop + P.title.offsetHeight > 340) { const d = P.title.offsetTop + P.title.offsetHeight - 330; P.pose.style.top = (360 + d) + 'px'; P.pose.style.height = (760 - d) + 'px'; P.pose.style.width = (700 - d * .9) + 'px'; P.pose.style.left = (190 + d * .45) + 'px'; }
      P.chunks.forEach(({ n }) => {
        n.style.visibility = 'hidden'; n.style.opacity = 1;
        if (P.layout === 'punch') { fitEl(n, 760); const hh = n.offsetHeight * (parseFloat(n.style.zoom) || 1); n.style.top = Math.round((P.kick ? 1000 : 940) - hh / 2) / (parseFloat(n.style.zoom) || 1) + 'px'; }
        else { const top = P.layout === 'bix' ? (P.tags ? 1220 : 1160) : (P.tags ? 1178 : 1110); fitEl(n, 1440 - top); n.style.top = top / (parseFloat(n.style.zoom) || 1) + 'px'; }
        n.style.visibility = '';
      });
      if (P.kick && P.layout === 'punch') P.kick.style.top = '620px';
      P.L.style.display = 'none';
    });
  }
  const beatAt = (t) => { let i = 0; for (let k = 0; k < D.beats.length; k++) if (D.beats[k].start <= t) i = k; return i; };
  const mixc = (a, b, p) => `rgb(${a.map((x, i) => Math.round(lerp(x, b[i], p))).join(',')})`;
  const INK = [21, 21, 23], GREY = [176, 176, 178], WHITE = [244, 244, 246], DGREY = [92, 93, 100];

  function renderAt(t) {
    const bi = beatAt(t), B = D.beats[bi], P0 = L[bi];
    const p = bi === 0 ? 1 : eo(clamp((t - B.start) / TR)); const prev = bi > 0 && p < 1 ? bi - 1 : -1;
    const fr = clamp(Math.round(t * D.fps), 0, D.envelope.length - 1), v = D.envelope[fr] || 0;
    // backgrounds: circular wipe between light and dark
    const dNow = P0.dark, dPrev = prev >= 0 ? L[prev].dark : dNow;
    if (dNow === dPrev) { bgN.style.clipPath = 'none'; bgN.style.opacity = dNow ? 1 : 0; }
    else { const r = (dNow ? p : 1 - p) * 140; bgN.style.opacity = 1; bgN.style.clipPath = `circle(${r}% at 50% 46%)`; }
    stage.classList.toggle('dark', !!(dNow ? p > .5 : dPrev && p <= .5));
    const gOn = (isData(B) ? p : 0) + (prev >= 0 && isData(D.beats[prev]) ? 1 - p : 0);
    grid.style.opacity = gOn; swoosh.forEach((s, k) => { s.style.opacity = gOn; s.style.transform = `translateX(${(1 - gOn) * (k ? 300 : -300) + Math.sin(t * .3 + k) * 20}px)`; });
    bgN.firstChild.style.transform = `translate(${Math.sin(t * .4) * 120}px, ${Math.cos(t * .3) * 160}px)`;

    L.forEach((P, i) => {
      const b = D.beats[i];
      if (i !== bi && i !== prev) { P.L.style.display = 'none'; return; }
      P.L.style.display = 'block';
      const kb = 1 + .02 * clamp(((i === bi ? t : b.end) - b.start) / Math.max(.5, b.end - b.start));
      if (i === bi) { P.L.style.opacity = p; P.L.style.filter = p < 1 ? `blur(${(1 - p) * 18}px)` : 'none'; P.L.style.transform = `scale(${lerp(1.045, 1, p) * kb})`; }
      else { P.L.style.opacity = 1 - p; P.L.style.filter = `blur(${p * 18}px)`; P.L.style.transform = `scale(${lerp(1, .97, p) * kb})`; }
      const lt = i === bi ? t : b.end, ht = i === 0 ? lt + 1 : lt;
      if (P.kick) { const r = rise(ht, b.start + .02, .4, 18); setT(P.kick, `translateY(${r.y}px)`, r.o); }
      if (P.title) { const r = rise(ht, b.start + .06, .5, 34); P.title.style.transform = `translateY(${r.y}px)`; P.title.style.opacity = r.o; P.title.style.filter = `blur(${(1 - r.p) * 8}px)`; }
      if (P.box) {
        const r = clamp((ht - b.start - .08) / .6), e = eo(r);
        P.rig.style.transform = `translateY(${(1 - e) * 90 + Math.sin(lt * .8) * 7}px) rotateX(${lerp(18, 4, e) + Math.sin(lt * .5) * 1.2}deg) rotateY(${Math.sin(lt * .6) * 3}deg)`;
        P.rig.style.opacity = clamp(r * 1.6); P.rig.style.filter = r < 1 ? `blur(${(1 - e) * 10}px)` : 'none';
        P.vis.update(lt);
        if (P.shine) { const q = clamp((lt - b.start - .35) / .9); P.shine.style.transform = `translateX(${lerp(-140, 420, eio(q))}%) skewX(-18deg)`; P.shine.style.opacity = q > 0 && q < 1 ? 1 : 0; }
      }
      if (P.pose) {
        const r = clamp((ht - b.start - .05) / .65), e = eo(r);
        P.pose.style.transform = `translateY(${(1 - e) * 80 + Math.sin(lt * .9) * 8}px) rotate(${lerp(-6, -2, e) + Math.sin(lt * .7) * .8}deg)`; P.pose.style.opacity = clamp(r * 1.6);
        show(P.ph, b.pose || 'presenting');
      }
      if (P.tg) P.tg.forEach(({ c, e }) => { const q = clamp((lt - c.t) / .32); setT(e, `translateY(${(1 - eo(q)) * 24}px) scale(${lerp(.9, 1, eo(q))})`, clamp(q * 2)); });
      if (P.hl) { const q = clamp((lt - b.stamp.t) / .4); P.hl.style.transform = `translateX(-50%) scale(${lerp(.96, 1, eo(q))})`; P.hl.style.opacity = q > 0 ? 1 : 0; P.hl.style.clipPath = `inset(0 ${(1 - eo(q)) * 100}% 0 0)`; }
      // narration
      P.chunks.forEach((c, k) => {
        const on = lt >= c.start && (lt < c.end || k === P.chunks.length - 1);
        const out = clamp((lt - c.end) / .14);
        if (!on && !(lt >= c.end && out < 1 && k < P.chunks.length - 1)) { c.n.style.display = 'none'; return; }
        c.n.style.display = 'block'; c.n.style.opacity = lt >= c.end && k < P.chunks.length - 1 ? 1 - out : 1;
        c.n.style.transform = `translateY(${lt >= c.end ? -out * 16 : 0}px)`;
        c.n._spans.forEach(({ w, sp, box }) => {
          const q = clamp((lt - (w.start - .05)) / .3), col = clamp((lt - w.start) / .55);
          sp.style.opacity = Math.pow(q, .8); sp.style.transform = `translateY(${(1 - eo(q)) * 22}px)`; sp.style.filter = q < 1 ? `blur(${(1 - q) * 6}px)` : 'none';
          if (!box) sp.style.color = P.dark ? mixc(DGREY, WHITE, col) : mixc(GREY, INK, col);
        });
        c.n._boxes.forEach((bx) => { const q = clamp((lt - bx._t + .05) / .35); bx.style.clipPath = `inset(0 ${(1 - eo(q)) * 100}% 0 0)`; });
      });
    });
    // host badge (mouth flaps with the voice)
    if (host) {
      const big = P0.layout === 'bix'; host.style.opacity = big ? 0 : 1;
      if (!big) { const m = AV[B.bix || 'talk'] || AV.talk; show(hostAv, v > .14 ? m[1] : m[0]); hostAv.style.transform = `scale(${1 + v * .05})`; }
    }
  }
  window.BB = { init, ready: () => { fit(); renderAt(0); return Promise.all(ready); } };
  window.renderAt = renderAt;
})();
