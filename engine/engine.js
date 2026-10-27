// BRAINBOX MOTION ENGINE
// Deterministic: everything on screen is a pure function of time t (seconds).
// window.BB.init(data) builds the DOM; window.renderAt(t) poses one frame.
(function () {
  const TR = 0.3; // scene transition length (s)
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const easeOut = (p) => 1 - Math.pow(1 - p, 3);
  const easeInOut = (p) => (p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const back = (p, s = 1.9) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2);
  const lerp = (a, b, p) => a + (b - a) * p;
  const icon = (n) => (window.ICONS && window.ICONS[n]) || window.ICONS.sparkles;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // "*word*" → accent span
  const accent = (s) => esc(s).replace(/\*([^*]+)\*/g, '<span class="acc">$1</span>').replace(/\s*\|\s*/g, '<br>'); // "|" = manual line break
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  // pop-in: opacity + scale with overshoot
  function pop(t, t0, dur = 0.32) {
    const p = clamp((t - t0) / dur);
    return { o: clamp(p * 2.2), s: p <= 0 ? 0.8 : lerp(0.8, 1, back(p)), p };
  }
  function rise(t, t0, dur = 0.4, dist = 40) {
    const p = clamp((t - t0) / dur);
    return { o: easeOut(p), y: (1 - easeOut(p)) * dist, p };
  }
  function slam(t, t0) {
    const p = clamp((t - t0) / 0.16);
    const shake = t > t0 + 0.16 && t < t0 + 0.4 ? Math.sin((t - t0) * 90) * 6 * (1 - (t - t0 - .16) / .24) : 0;
    return { o: p > 0 ? 1 : 0, s: lerp(1.7, 1, easeOut(p)), shake };
  }
  const setT = (el, tr, o) => { el.style.transform = tr; if (o != null) el.style.opacity = o; };

  // ---------- Bix state ----------
  const EXPR = {
    talk: { eyes: 'open', brows: 'neutral', idle: 'smile' },
    happy: { eyes: 'happy', brows: 'up', idle: 'smile' },
    shock: { eyes: 'wide', brows: 'up', idle: 'o' },
    smug: { eyes: 'smug', brows: 'smug', idle: 'smirk' },
    wink: { eyes: 'wink', brows: 'smug', idle: 'smirk' },
    serious: { eyes: 'open', brows: 'down', idle: 'closed' },
    think: { eyes: 'open', brows: 'smug', idle: 'small', look: [1, -1] },
  };
  function bixState(expr, t, v) {
    const e = EXPR[expr] || EXPR.talk;
    let mouth = e.idle;
    if (v > 0.08) mouth = v < 0.28 ? 'small' : v < 0.55 ? 'open' : 'wide';
    if (expr === 'shock' && v > 0.08) mouth = v < 0.5 ? 'o' : 'wide';
    let eyes = e.eyes;
    const blink = (t % 3.3) < 0.1 || ((t + 1.37) % 5.9) < 0.1;
    if (blink && (eyes === 'open' || eyes === 'wide')) eyes = 'blink';
    const glow = expr === 'think' ? 0.5 + 0.5 * Math.sin(t * 7) : 0.55 + 0.45 * v;
    return { eyes, mouth, brows: e.brows, look: e.look || [Math.sin(t * 0.7) * 0.25, 0], cubeGlow: glow };
  }

  // ---------- visuals ----------
  const VISUALS = {
    icon(v) {
      const el = h('div', 'card' + (v.tone === 'bad' ? ' bad' : ''));
      el.append(h('div', 'glow'));
      const ic = h('div', 'big-icon', icon(v.icon)); el.append(ic);
      let badge = null;
      if (v.badge) { badge = h('div', 'badge' + (v.badgeTone === 'good' ? ' good' : ''), icon(v.badge)); el.append(badge); }
      return { el, update(t) {
        setT(ic, `translateY(${Math.sin(t * 2.1) * 10}px)`);
        if (badge) { const p = pop(t, v.badgeT); setT(badge, `scale(${p.s}) rotate(${(1 - p.p) * -20}deg)`, p.o); }
      } };
    },
    browser(v) {
      const el = h('div', 'card');
      const b = h('div', 'browser');
      b.innerHTML = `<div class="bar"><div class="dot" style="background:#FF5F57"></div><div class="dot" style="background:#FEBC2E"></div><div class="dot" style="background:#28C840"></div><div class="url">${esc(v.url || 'yourstore.com')}</div></div>`;
      const page = h('div', 'page');
      page.innerHTML = `<div class="nav" data-k="nav">${esc(v.brand || 'STORE')}<div><i></i><i></i><i></i></div></div>
        <div class="hero" data-k="hero"><b>${esc(v.hero || 'Elevate your lifestyle')}</b><span>Shop now</span></div>
        <div class="grid3" data-k="grid"><div class="prod"></div><div class="prod"></div><div class="prod"></div></div>
        <div class="ship" data-k="ship">${esc(v.ship || 'Shipping calculated at checkout')}</div>`;
      b.append(page); el.append(b);
      const marks = (v.marks || []).map((m) => {
        const mk = h('div', 'mark' + (m.kind === 'good' ? ' good' : ''));
        mk.innerHTML = `<div class="mbadge">${icon(m.kind === 'good' ? 'check' : 'x')}</div>` + (m.text ? `<div class="mtext">${esc(m.text)}</div>` : '');
        page.append(mk); return { m, mk };
      });
      let placed = false;
      return { el, update(t) {
        if (!placed) {
          marks.forEach(({ m, mk }) => {
            const tgt = page.querySelector(`[data-k="${m.target}"]`); if (!tgt) return;
            Object.assign(mk.style, { left: tgt.offsetLeft - 10 + 'px', top: tgt.offsetTop - 10 + 'px', width: tgt.offsetWidth + 20 + 'px', height: tgt.offsetHeight + 20 + 'px' });
          });
          placed = true;
        }
        const sp = v.scrollT != null ? easeInOut(clamp((t - v.scrollT) / 0.7)) : 0;
        page.style.transform = `translateY(${-sp * (v.scroll || 130)}px)`;
        marks.forEach(({ m, mk }) => { const p = pop(t, m.t, 0.28); setT(mk, `scale(${lerp(1.15, 1, easeOut(p.p))})`, p.o); });
      } };
    },
    gauge(v) {
      const el = h('div', 'card');
      el.append(h('div', 'glow'));
      const w = h('div', 'gauge-wrap');
      w.innerHTML = `<svg width="760" height="430" viewBox="0 0 700 400" style="margin-top:90px">
        <path d="M70 370 A280 280 0 0 1 630 370" stroke="#1E2838" stroke-width="54" fill="none" stroke-linecap="round"/>
        <path class="arc" d="M70 370 A280 280 0 0 1 630 370" stroke="#39FF88" stroke-width="54" fill="none" stroke-linecap="round" pathLength="100" stroke-dasharray="0 100"/></svg>
        <div class="gauge-num">0</div><div class="gauge-label">${esc(v.label || 'Score')}</div>`;
      el.append(w);
      const arc = w.querySelector('.arc'), num = w.querySelector('.gauge-num');
      const t0 = v.t, t1 = v.t2 != null ? v.t2 : null;
      return { el, update(t) {
        let val = lerp(0, v.from, easeOut(clamp((t - t0) / 0.9)));
        if (t1 != null) val = lerp(val, v.to, easeInOut(clamp((t - t1) / 1.1)));
        const c = val < 50 ? '#FF4D5E' : val < 90 ? '#FFB547' : '#39FF88';
        arc.setAttribute('stroke-dasharray', `${val} 100`); arc.setAttribute('stroke', c);
        num.textContent = Math.round(val); num.style.color = c;
      } };
    },
    checklist(v) {
      const el = h('div', 'card'); const list = h('div', 'checklist'); el.append(list);
      const n = (v.items || []).length;
      if (n > 3) { list.style.gap = '14px'; list.style.top = '34px'; }
      const rows = (v.items || []).map((it) => {
        const r = h('div', 'ck', `<div class="box"></div><div>${esc(it.text)}</div>`); list.append(r);
        if (n > 3) { const rh = Math.floor((532 - (n - 1) * 14) / n); Object.assign(r.style, { height: rh + 'px', fontSize: (n > 4 ? 38 : 42) + 'px' });
          Object.assign(r.firstChild.style, { width: '60px', height: '60px', padding: '8px' }); }
        return { it, r, box: r.firstChild };
      });
      return { el, update(t) {
        rows.forEach(({ it, r, box }) => {
          const p = rise(t, it.t - 0.25, 0.3, 30); setT(r, `translateY(${p.y}px)`, 0.3 + 0.7 * p.o);
          const done = t >= it.t + 0.35;
          r.classList.toggle('done', done && it.ok !== false); r.classList.toggle('bad', done && it.ok === false);
          box.innerHTML = done ? icon(it.ok === false ? 'x' : 'check') : '';
        });
      } };
    },
    stat(v) {
      const el = h('div', 'card'); el.append(h('div', 'glow'));
      const s = h('div', 'stat', `<div class="v"></div><div class="l">${esc(v.label || '')}</div>`); el.append(s);
      const vEl = s.querySelector('.v');
      return { el, update(t) {
        const p = easeOut(clamp((t - v.t) / 1.0));
        const n = lerp(v.from || 0, v.to, p);
        vEl.innerHTML = (v.prefix || '') + n.toFixed(v.decimals || 0) + (v.suffix ? `<small>${esc(v.suffix)}</small>` : '');
        vEl.style.transform = `scale(${1 + 0.08 * Math.sin(p * Math.PI)})`;
      } };
    },
    flow(v) {
      const el = h('div', 'card'); const f = h('div', 'flow'); el.append(f);
      const nodes = (v.nodes || []).map((n) => {
        const d = h('div', 'node', `<div class="ni">${icon(n.icon)}</div><div>${esc(n.text)}</div>`); f.append(d); return { n, d };
      });
      return { el, update(t) {
        nodes.forEach(({ n, d }, i) => {
          const p = rise(t, n.t - 0.25, 0.35, 30); setT(d, `translateY(${p.y}px)`, 0.3 + 0.7 * p.o);
          const next = nodes[i + 1]; d.classList.toggle('on', t >= n.t && (!next || t < next.n.t));
        });
      } };
    },
    prompt(v) {
      // AI chat window: the prompt types itself, then the reply streams in line by line.
      const el = h('div', 'card chat');
      el.innerHTML = `<div class="chat-bar"><div class="ci">${icon('sparkles')}</div>AI CHAT<span>any model works</span></div>
        <div class="chat-body"><div class="msg me"><span class="typed"></span><i class="caret"></i></div><div class="msg ai"></div></div>`;
      const typed = el.querySelector('.typed'), caret = el.querySelector('.caret'), ai = el.querySelector('.msg.ai');
      const lines = (v.reply || []).map((r) => { const d = h('div', 'rl'); ai.append(d); return d; });
      const full = v.prompt || '';
      return { el, update(t) {
        const n = Math.max(0, Math.min(full.length, Math.floor((t - v.t) * 48)));
        typed.textContent = full.slice(0, n);
        caret.style.opacity = n < full.length && t >= v.t ? (Math.floor(t * 3) % 2 ? 1 : 0.2) : 0;
        const rt = v.replyT != null ? v.replyT : v.t + full.length / 48 + 0.4;
        ai.style.opacity = t >= rt ? 1 : 0;
        lines.forEach((d, k) => {
          const txt = v.reply[k]; const t0 = rt + k * 0.42;
          const m = Math.max(0, Math.min(txt.length, Math.floor((t - t0) * 70)));
          d.textContent = txt.slice(0, m); d.style.opacity = m > 0 ? 1 : 0;
        });
      } };
    },
    compare(v) {
      // Before / after split. "after" slides in on its anchor word.
      const el = h('div', 'card cmp');
      const col = (cls, title, items) => `<div class="side ${cls}"><div class="tag">${title}</div>${items.map((x) => `<div class="li">${esc(x)}</div>`).join('')}</div>`;
      el.innerHTML = col('before', 'BEFORE', v.before || []) + col('after', 'AFTER', v.after || []);
      const after = el.querySelector('.after'), before = el.querySelector('.before');
      const ali = [...after.querySelectorAll('.li')];
      return { el, update(t) {
        const p = easeOut(clamp((t - v.t) / 0.45));
        setT(after, `translateX(${(1 - p) * 120}%)`, p);
        before.style.filter = `grayscale(${p}) brightness(${1 - 0.35 * p})`;
        ali.forEach((li, k) => { const r = rise(t, v.t + 0.3 + k * 0.14, 0.3, 24); setT(li, `translateY(${r.y}px)`, r.o); });
      } };
    },
    image(v) {
      const el = h('div', 'card'); const im = h('div', 'img'); im.style.backgroundImage = `url("${window.__ROOT || ''}${v.src}")`; el.append(im);
      return { el, update(t) { im.style.transform = `scale(${1.04 + 0.04 * Math.sin(t * 0.4)})`; } };
    },
  };

  const AV = { talk: ['default', 'talking'], happy: ['happy', 'excited'], shock: ['talking', 'excited'], smug: ['default', 'talking'],
    wink: ['happy', 'excited'], serious: ['serious', 'talking'], think: ['thinking', 'thinking'] };
  // Every avatar image is preloaded into each rig and toggled, so a frame is never captured mid-load.
  const AV_FILES = ['default', 'talking', 'happy', 'excited', 'thinking', 'serious', 'presenting', 'explaining', 'celebrating', 'main'];
  const avReady = [];
  function setAvatar(rig, src) {
    if (!rig._imgs) {
      rig.innerHTML = ''; rig.classList.add('img'); rig._imgs = {};
      AV_FILES.forEach((f) => {
        const img = document.createElement('img'); img.className = 'av'; img.style.visibility = 'hidden';
        img.src = (window.__ROOT || '') + D.avatar.dir + '/' + f + '.png';
        avReady.push(img.decode().catch(() => {}));
        rig.append(img); rig._imgs[D.avatar.dir + '/' + f + '.png'] = img;
      });
    }
    for (const [k, img] of Object.entries(rig._imgs)) img.style.visibility = k === src ? 'visible' : 'hidden';
  }
  const faceSrc = (expr, v) => { const m = AV[expr] || AV.talk; return D.avatar.dir + '/' + (v > 0.14 ? m[1] : m[0]) + '.png'; };
  let D, stage, bgs = {}, layers = [], cap, capRow, bubble, bubbleRig, chunks = [];

  function buildBeat(b, i) {
    const L = h('div', 'beat' + (b.bg === 'neon' ? ' neon' : ''));
    const parts = { L };
    const layout = b.layout || (b.visual ? 'stage' : 'punch');
    parts.layout = layout;
    if (b.header) {
      const m = b.header.match(/^(\d+)\s*[·.:-]?\s*(.*)$/);
      const html = m ? `<span class="num">${m[1]}</span>${accent(m[2])}` : accent(b.header);
      parts.header = h('div', 'header', html); const hl = b.header.replace(/\*/g, '').length; if (hl > 15) parts.header.style.fontSize = (hl > 20 ? 82 : 96) + 'px'; parts.header.style.top = layout === 'punch' ? '640px' : '230px'; L.append(parts.header);
    }
    if (b.headline) {
      parts.headline = h('div', 'headline', accent(b.headline)); const ll = Math.max(...b.headline.replace(/\*/g, '').split('|').map((x) => x.trim().length)); if (layout !== 'punch' && ll > 20) parts.headline.style.fontSize = (ll > 26 ? 70 : 80) + 'px';
      if (layout === 'punch') { parts.headline.style.fontSize = (ll > 30 ? 92 : ll > 21 ? 104 : 128) + 'px'; parts.headline.style.top = b.header ? '900px' : '660px'; parts.headline.style.letterSpacing = '-4px'; }
      else parts.headline.style.top = b.header ? '360px' : '240px';
      L.append(parts.headline);
    }
    if (b.label) { parts.label = h('div', 'label', esc(b.label)); parts.label.style.top = (b.headline || b.header) ? '170px' : '400px'; L.append(parts.label); }
    if (layout === 'bix') {
      parts.bixCard = h('div', 'bix-card', '<div class="rig"></div>'); parts.bixRig = parts.bixCard.firstChild; L.append(parts.bixCard);
    } else if (b.visual && VISUALS[b.visual.type]) {
      parts.vis = VISUALS[b.visual.type](b.visual); L.append(parts.vis.el);
      parts.shine = h('div', 'shine'); parts.vis.el.append(parts.shine);
    }
    if (b.chips && b.chips.length) {
      const row = h('div', 'chips'); if (layout === 'bix') row.style.top = '1196px';
      parts.chips = b.chips.map((c) => {
        const e = h('div', 'chip' + (c.kind ? ' ' + c.kind : ''), (c.icon ? `<div class="ci">${icon(c.icon)}</div>` : '') + esc(c.text));
        row.append(e); return { c, e };
      });
      L.append(row);
    }
    if (b.stamp) {
      parts.stamp = h('div', 'stamp' + (b.stamp.kind ? ' ' + b.stamp.kind : ''), esc(b.stamp.text));
      if (b.stamp.y) parts.stamp.style.top = b.stamp.y + 'px';
      L.append(parts.stamp);
    }
    stage.append(L);
    return parts;
  }

  function init(data) {
    D = data; stage = document.getElementById('stage');
    // backgrounds
    const ink = h('div', 'bg bg-ink', '<div class="grid"></div>');
    const b1 = h('div', 'blob'); Object.assign(b1.style, { width: '700px', height: '700px', background: 'rgba(57,255,136,.20)' });
    const b2 = h('div', 'blob'); Object.assign(b2.style, { width: '600px', height: '600px', background: 'rgba(60,120,255,.13)' });
    ink.append(b1, b2);
    // pixel particles (matches the host's pixel-art style)
    const parts = [];
    for (let k = 0; k < 28; k++) {
      const r = (n) => { const x = Math.sin(k * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
      const d = h('div', 'px'); const size = 8 + Math.round(r(1) * 3) * 4;
      Object.assign(d.style, { width: size + 'px', height: size + 'px', background: r(2) > 0.5 ? '#8C6BFF' : '#4D7CFF' });
      ink.append(d); parts.push({ d, x: r(3) * 1080, y: r(4) * 1920, sp: 18 + r(5) * 40, ph: r(6) * 6.28, size });
    }
    const neon = h('div', 'bg bg-neon', '<div class="rings"></div>');
    const voidb = h('div', 'bg bg-void', '<div class="scan"></div>');
    b1.style.background = 'rgba(140,105,255,.22)';
    bgs = { parts, ink, neon, void: voidb, b1, b2, grid: ink.firstChild, rings: neon.firstChild, scan: voidb.firstChild };
    stage.append(ink, neon, voidb);
    layers = D.beats.map(buildBeat);
    capRow = h('div', null); capRow.id = 'captionRow';
    cap = h('div', 'caption'); capRow.append(cap); stage.append(capRow);
    bubble = h('div', null, '<div class="rig"></div><div class="live">● LIVE</div>'); bubble.id = 'bubble';
    bubbleRig = bubble.firstChild; stage.append(bubble);
    chunks = [];
    D.beats.forEach((b, bi) => (b.chunks || []).forEach((c) => chunks.push(Object.assign({ bi }, c))));
    if (D.scale) document.documentElement.style.setProperty('--scale', D.scale);
  }

  function beatAt(t) { let i = 0; for (let k = 0; k < D.beats.length; k++) if (D.beats[k].start <= t) i = k; return i; }

  function renderAt(t) {
    const bi = beatAt(t); const B = D.beats[bi];
    const p = bi === 0 ? 1 : easeOut(clamp((t - B.start) / TR));
    const prev = bi > 0 && p < 1 ? bi - 1 : -1;
    const frame = Math.min(D.envelope.length - 1, Math.max(0, Math.round(t * D.fps)));
    const v = D.envelope[frame] || 0;

    // backgrounds
    ['ink', 'neon', 'void'].forEach((k) => {
      let o = 0; if ((B.bg || 'ink') === k) o += p; if (prev >= 0 && (D.beats[prev].bg || 'ink') === k) o += 1 - p;
      bgs[k].style.opacity = clamp(o); bgs[k].style.display = o > 0.001 ? 'block' : 'none';
    });
    setT(bgs.b1, `translate(${180 + Math.sin(t * .35) * 160}px, ${300 + Math.cos(t * .27) * 220}px)`);
    setT(bgs.b2, `translate(${420 + Math.cos(t * .3) * 200}px, ${1100 + Math.sin(t * .22) * 200}px)`);
    setT(bgs.grid, `translateY(${(t * 18) % 90}px)`);
    bgs.parts.forEach((q) => {
      const y = ((q.y - t * q.sp) % 2000 + 2000) % 2000 - 40;
      setT(q.d, `translate(${q.x + Math.sin(t * 0.6 + q.ph) * 14}px, ${y}px)`, 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2 + q.ph)));
    });
    setT(bgs.rings, `scale(${1 + (t % 1.2) * 0.06})`);
    bgs.scan.style.top = ((t * 520) % 2400 - 300) + 'px';
    stage.classList.toggle('on-neon', (B.bg === 'neon') ? p > 0.5 : prev >= 0 && D.beats[prev].bg === 'neon' && p <= 0.5);

    // beat layers
    layers.forEach((P, i) => {
      const b = D.beats[i];
      if (i !== bi && i !== prev) { P.L.style.display = 'none'; return; }
      P.L.style.display = 'block';
      const kb = 1 + 0.025 * clamp(((i === bi ? t : b.end) - b.start) / Math.max(0.5, b.end - b.start)); // slow camera push
      if (i === bi) { P.L.style.opacity = p; P.L.style.filter = p < 1 ? `blur(${(1 - p) * 16}px)` : 'none'; P.L.style.transform = `scale(${(1.03 - 0.03 * p) * kb})`; }
      else { P.L.style.opacity = 1 - p; P.L.style.filter = `blur(${p * 16}px)`; P.L.style.transform = `scale(${(1 - 0.03 * p) * kb})`; }
      let lt = i === bi ? t : b.end; // freeze outgoing at its end state
      const ht = i === 0 ? lt + 1 : lt; // hook text is fully visible on frame 1 (cover frame)
      if (P.header) { const r = rise(ht, b.start + 0.02, 0.38, 50); setT(P.header, `translateY(${r.y}px)`, r.o); }
      if (P.headline) {
        const r = P.layout === 'punch' ? pop(ht, b.start + 0.05, 0.4) : rise(ht, b.start + 0.06, 0.4, 40);
        setT(P.headline, P.layout === 'punch' ? `scale(${r.s})` : `translateY(${r.y}px)`, r.o);
        if (b.bg !== 'neon') { const u = easeOut(clamp((ht - b.start - 0.35) / 0.45)); P.headline.style.setProperty('--u', (u * 100) + '%'); }
      }
      if (P.label) { const r = pop(lt, b.start + 0.12); setT(P.label, `translateX(-50%) scale(${r.s})`, r.o); }
      if (P.vis) { const r = pop(lt, b.start + 0.1, 0.42); setT(P.vis.el, `scale(${lerp(0.9, 1, r.s === 0.8 ? 0 : (r.s - 0.8) / 0.2)})`, r.o); P.vis.update(lt);
        if (P.shine) { const q = clamp((lt - b.start - 0.25) / 0.8); P.shine.style.transform = `translateX(${lerp(-140, 260, easeInOut(q))}%) skewX(-20deg)`; P.shine.style.opacity = q > 0 && q < 1 ? 1 : 0; } }
      if (P.bixCard) {
        const r = pop(ht, b.start + 0.08, 0.45); setT(P.bixCard, `scale(${lerp(0.9, 1, (r.s - 0.8) / 0.2)})`, r.o);
        const st = bixState(b.bix || 'talk', lt, i === bi ? v : 0);
        if (D.avatar) setAvatar(P.bixRig, D.avatar.dir + '/' + (b.pose || 'presenting') + '.png');
        else P.bixRig.innerHTML = characterSVG(st);
        setT(P.bixRig, `translateY(${Math.sin(lt * 2) * 8 - v * 10}px) rotate(${Math.sin(lt * 1.3) * 1.6 + v * 1.5}deg)`);
      }
      if (P.chips) P.chips.forEach(({ c, e }) => { const r = pop(lt, c.t); setT(e, `scale(${r.s})`, r.o); });
      if (P.stamp) {
        const s = slam(lt, b.stamp.t); const rot = b.stamp.rot != null ? b.stamp.rot : -6;
        setT(P.stamp, `translateX(-50%) translateX(${s.shake}px) rotate(${rot}deg) scale(${s.s})`, s.o);
      }
    });

    // caption
    let ci = -1; for (let k = 0; k < chunks.length; k++) if (chunks[k].start <= t && t < chunks[k].end) ci = k;
    const bixBig = (layers[bi].layout === 'bix');
    if (ci < 0) { cap.style.opacity = 0; }
    else {
      const c = chunks[ci];
      if (cap.dataset.ci !== String(ci)) {
        cap.innerHTML = c.words.map((w) => `<span class="w${w.accent ? ' acc-word' : ''}">${esc(w.text)}</span>`).join('');
        cap.dataset.ci = String(ci);
      }
      [...cap.children].forEach((sp, k) => {
        const w = c.words[k]; const next = c.words[k + 1];
        const now = t >= w.start && (!next || t < next.start) && t < w.end + 0.25;
        sp.className = 'w' + (w.accent ? ' acc-word' : '') + (t < w.start ? ' future' : now ? ' now' : w.em ? ' em' : ' past');
      });
      const pp = clamp((t - c.start) / 0.14);
      const sc = lerp(0.9, 1, back(pp, 2.2));
      cap.classList.toggle('center', bixBig);
      cap.style.opacity = clamp(pp * 3);
      cap.style.transform = (bixBig ? 'translateX(-50%) ' : '') + `scale(${sc})`;
    }
    // bubble
    const showBubble = !bixBig;
    const bo = showBubble ? 1 : 0;
    bubble.style.opacity = bo; bubble.style.display = bo ? 'block' : 'none';
    if (bo) {
      if (D.avatar) setAvatar(bubbleRig, faceSrc(B.bix || 'talk', v));
      else bubbleRig.innerHTML = characterSVG(bixState(B.bix || 'talk', t, v));
      setT(bubbleRig, `translateY(${-v * 8}px) rotate(${Math.sin(t * 1.3) * 2 + v * 2}deg)`);
      bubble.style.transform = `scale(${1 + v * 0.035})`;
    }
  }

  // Shrink headers/headlines until they fit their zone (needs fonts loaded, so it runs in ready()).
  function fitAll() {
    layers.forEach((P) => {
      P.L.style.display = 'block';
      const fit = (el, maxBottom, min) => {
        if (!el) return; let fs = parseFloat(getComputedStyle(el).fontSize);
        while (el.offsetTop + el.offsetHeight > maxBottom && fs > min) { fs -= 4; el.style.fontSize = fs + 'px'; }
      };
      if (P.layout === 'punch') { fit(P.header, P.headline ? 860 : 1220, 60); fit(P.headline, 1215, 64); }
      else if (P.layout === 'bix') { fit(P.headline, 405, 56); }
      else { fit(P.header, P.headline ? 350 : 455, 60); fit(P.headline, 455, 56); }
      P.L.style.display = 'none';
    });
  }
  window.BB = { init, ready: () => { fitAll(); renderAt(0); if (D && D.avatar) { layersWarm(); } return Promise.all(avReady); } };
  function layersWarm() { const v = D.avatar; layers.forEach((P) => { if (P.bixRig) setAvatar(P.bixRig, v.dir + '/presenting.png'); }); if (bubbleRig) setAvatar(bubbleRig, v.dir + '/default.png'); }
  window.renderAt = renderAt;
})();
