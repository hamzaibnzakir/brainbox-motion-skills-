// BIX — Brainbox's anime explainer. Original character, vector rig.
// characterSVG(state) returns an SVG string. Works in the browser and in Node.
// state = { eyes, mouth, brows, look:[x,y], blush, cubeGlow }
//   eyes:  'open' | 'blink' | 'happy' | 'wide' | 'smug' | 'wink'
//   mouth: 'closed' | 'smile' | 'small' | 'open' | 'wide' | 'o' | 'smirk'
//   brows: 'neutral' | 'up' | 'down' | 'smug'

(function (root) {
  const C = {
    skin: '#C98E62', skinShade: '#A9714A', skinLight: '#DDA57A',
    hair: '#151A24', hairHi: '#273042', streak: '#39FF88',
    iris1: '#7CFFB5', iris2: '#13A85B', iris3: '#0A3D24',
    ink: '#0D1017', hoodie: '#1A2030', hoodieShade: '#121722', hoodieHi: '#262E42',
    neon: '#39FF88', blush: '#E8705F', mouthIn: '#5B1E22', tongue: '#D9606A', white: '#FFFFFF'
  };

  function eye(cx, cy, s, flip, look) {
    const f = flip ? -1 : 1;
    const lx = look[0] * 5, ly = look[1] * 4;
    const id = `eclip${flip ? 'R' : 'L'}`;
    if (s.eyes === 'blink' || (s.eyes === 'wink' && flip)) {
      return `<path d="M${cx - 34 * f} ${cy + 2} Q${cx} ${cy + 16} ${cx + 34 * f} ${cy - 2}" stroke="${C.ink}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
    }
    if (s.eyes === 'happy') {
      return `<path d="M${cx - 30} ${cy + 10} Q${cx} ${cy - 22} ${cx + 30} ${cy + 10}" stroke="${C.ink}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
    }
    const wide = s.eyes === 'wide';
    const smug = s.eyes === 'smug';
    // eye white shape
    const top = cy - (wide ? 30 : 24);
    const white = `M${cx - 33 * f} ${cy - 6} Q${cx - 4 * f} ${top - 6} ${cx + 34 * f} ${cy - 14} Q${cx + 38 * f} ${cy + 22} ${cx + 18 * f} ${cy + 34} Q${cx} ${cy + 40} ${cx - 18 * f} ${cy + 32} Q${cx - 34 * f} ${cy + 20} ${cx - 33 * f} ${cy - 6} Z`;
    const irisR = wide ? 19 : 24, irisRy = wide ? 24 : 30;
    const pupil = wide ? 6 : 10;
    let lid = '';
    if (smug) {
      lid = `<path d="M${cx - 40 * f} ${cy - 30} L${cx + 42 * f} ${cy - 34} L${cx + 40 * f} ${cy + 4} Q${cx} ${cy - 2} ${cx - 38 * f} ${cy + 6} Z" fill="${C.skin}"/>
             <path d="M${cx - 36 * f} ${cy + 5} Q${cx} ${cy - 4} ${cx + 38 * f} ${cy + 2}" stroke="${C.ink}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
    }
    return `
      <clipPath id="${id}"><path d="${white}"/></clipPath>
      <path d="${white}" fill="${C.white}"/>
      <g clip-path="url(#${id})">
        <ellipse cx="${cx + lx}" cy="${cy + 8 + ly}" rx="${irisR}" ry="${irisRy}" fill="url(#irisGrad)"/>
        <ellipse cx="${cx + lx}" cy="${cy + 8 + ly}" rx="${irisR}" ry="${irisRy}" fill="none" stroke="${C.iris3}" stroke-width="3"/>
        <ellipse cx="${cx + lx}" cy="${cy + 10 + ly}" rx="${pupil}" ry="${pupil * 1.35}" fill="${C.iris3}"/>
        <circle cx="${cx - 8 * f + lx}" cy="${cy - 2 + ly}" r="${wide ? 5 : 7}" fill="#fff"/>
        <circle cx="${cx + 9 * f + lx}" cy="${cy + 20 + ly}" r="3.5" fill="#fff" opacity=".9"/>
        <path d="M${cx - 40} ${cy - 40} L${cx + 40} ${cy - 40} L${cx + 40} ${cy - 6} Q${cx} ${cy - 18} ${cx - 40} ${cy - 2} Z" fill="${C.ink}" opacity=".12"/>
      </g>
      <path d="M${cx - 36 * f} ${cy - 2} Q${cx - 4 * f} ${top - 12} ${cx + 38 * f} ${cy - 16} L${cx + 42 * f} ${cy - 22} L${cx + 36 * f} ${cy - 8} Q${cx - 4 * f} ${top - 2} ${cx - 33 * f} ${cy + 2} Z" fill="${C.ink}"/>
      <path d="M${cx + 30 * f} ${cy - 14} l${10 * f} -10" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>
      <path d="M${cx - 12 * f} ${cy + 36} Q${cx + 4 * f} ${cy + 40} ${cx + 16 * f} ${cy + 34}" stroke="${C.ink}" stroke-width="2.5" fill="none" opacity=".6" stroke-linecap="round"/>
      ${lid}`;
  }

  function brow(cx, cy, s, flip) {
    const f = flip ? -1 : 1;
    let dy0 = 0, dy1 = 0;
    if (s.brows === 'up') { dy0 = -12; dy1 = -16; }
    if (s.brows === 'down') { dy0 = 4; dy1 = -6; }
    if (s.brows === 'smug') { dy0 = flip ? -12 : 2; dy1 = flip ? -16 : -2; }
    return `<path d="M${cx - 28 * f} ${cy + 4 + dy0} Q${cx} ${cy - 8 + (dy0 + dy1) / 2} ${cx + 30 * f} ${cy - 2 + dy1}" stroke="${C.hair}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  }

  function mouth(s) {
    const x = 300, y = 436;
    switch (s.mouth) {
      case 'smile': return `<path d="M${x - 20} ${y - 2} Q${x} ${y + 14} ${x + 20} ${y - 2}" stroke="${C.ink}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
      case 'smirk': return `<path d="M${x - 16} ${y + 4} Q${x + 4} ${y + 10} ${x + 22} ${y - 6}" stroke="${C.ink}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
      case 'small': return `<path d="M${x - 14} ${y - 2} Q${x} ${y + 14} ${x + 14} ${y - 2} Z" fill="${C.mouthIn}" stroke="${C.ink}" stroke-width="3.5" stroke-linejoin="round"/>`;
      case 'open': return `<path d="M${x - 20} ${y - 4} Q${x} ${y - 6} ${x + 20} ${y - 4} Q${x + 16} ${y + 24} ${x} ${y + 26} Q${x - 16} ${y + 24} ${x - 20} ${y - 4} Z" fill="${C.mouthIn}" stroke="${C.ink}" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M${x - 10} ${y + 20} Q${x} ${y + 12} ${x + 10} ${y + 20} Q${x} ${y + 26} ${x - 10} ${y + 20} Z" fill="${C.tongue}"/>`;
      case 'wide': return `<path d="M${x - 28} ${y - 6} Q${x} ${y - 10} ${x + 28} ${y - 6} Q${x + 22} ${y + 34} ${x} ${y + 36} Q${x - 22} ${y + 34} ${x - 28} ${y - 6} Z" fill="${C.mouthIn}" stroke="${C.ink}" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M${x - 24} ${y - 5} Q${x} ${y - 8} ${x + 24} ${y - 5} L${x + 22} ${y + 1} Q${x} ${y - 1} ${x - 22} ${y + 1} Z" fill="#fff"/>
        <path d="M${x - 14} ${y + 28} Q${x} ${y + 16} ${x + 14} ${y + 28} Q${x} ${y + 36} ${x - 14} ${y + 28} Z" fill="${C.tongue}"/>`;
      case 'o': return `<ellipse cx="${x}" cy="${y + 10}" rx="13" ry="17" fill="${C.mouthIn}" stroke="${C.ink}" stroke-width="3.5"/>`;
      default: return `<path d="M${x - 14} ${y + 2} Q${x} ${y + 8} ${x + 14} ${y + 2}" stroke="${C.ink}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    }
  }

  function characterSVG(state = {}) {
    const s = Object.assign({ eyes: 'open', mouth: 'smile', brows: 'neutral', look: [0, 0], blush: 0.35, cubeGlow: 1 }, state);
    const g = s.cubeGlow;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 720" width="100%" height="100%">
  <defs>
    <radialGradient id="irisGrad" cx="50%" cy="35%" r="70%">
      <stop offset="0" stop-color="${C.iris1}"/><stop offset=".55" stop-color="${C.iris2}"/><stop offset="1" stop-color="${C.iris3}"/>
    </radialGradient>
    <linearGradient id="hoodGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.hoodieHi}"/><stop offset="1" stop-color="${C.hoodieShade}"/>
    </linearGradient>
    <linearGradient id="hairGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.hairHi}"/><stop offset=".6" stop-color="${C.hair}"/>
    </linearGradient>
    <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- back hair -->
  <path d="M168 300 C150 170 236 96 304 96 C380 96 456 160 438 300 C446 380 446 450 424 520 L392 500 L396 360 L206 360 L210 500 L176 520 C154 450 156 380 168 300 Z" fill="url(#hairGrad)"/>

  <!-- hoodie body -->
  <path d="M70 720 C82 590 168 526 262 506 L338 506 C432 526 518 590 530 720 Z" fill="url(#hoodGrad)"/>
  <path d="M206 534 C232 578 268 594 300 594 C332 594 368 578 394 534 C370 518 350 510 338 506 L262 506 C250 510 230 518 206 534 Z" fill="${C.hoodieShade}"/>
  <!-- neck -->
  <path d="M270 446 L330 446 L334 520 C318 534 282 534 266 520 Z" fill="${C.skinShade}"/>
  <path d="M268 470 C290 500 312 500 332 470 L332 450 L268 450 Z" fill="${C.skinShade}" opacity=".7"/>
  <!-- hood collar -->
  <path d="M226 514 C250 560 350 560 374 514 C388 526 396 538 400 552 C362 600 238 600 200 552 C204 538 212 526 226 514 Z" fill="${C.hoodieHi}"/>
  <!-- drawstrings -->
  <path d="M272 572 L262 662" stroke="${C.neon}" stroke-width="6" stroke-linecap="round" filter="url(#neonGlow)"/>
  <path d="M328 572 L338 662" stroke="${C.neon}" stroke-width="6" stroke-linecap="round" filter="url(#neonGlow)"/>
  <circle cx="262" cy="666" r="7" fill="${C.neon}"/><circle cx="338" cy="666" r="7" fill="${C.neon}"/>
  <!-- chest cube logo -->
  <g transform="translate(420 630)" opacity=".95">
    <path d="M0 -18 L18 -8 L18 12 L0 22 L-18 12 L-18 -8 Z" fill="none" stroke="${C.neon}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M-18 -8 L0 2 L18 -8 M0 2 L0 22" fill="none" stroke="${C.neon}" stroke-width="3.5" stroke-linejoin="round"/>
  </g>

  <!-- face -->
  <path d="M194 280 C194 196 406 196 406 280 L402 340 C398 404 352 456 300 470 C248 456 202 404 198 340 Z" fill="${C.skin}"/>
  <path d="M198 340 C202 404 248 456 300 470 C268 452 236 420 222 360 Z" fill="${C.skinShade}" opacity=".35"/>
  <!-- blush -->
  <ellipse cx="232" cy="400" rx="24" ry="11" fill="${C.blush}" opacity="${s.blush}"/>
  <ellipse cx="368" cy="400" rx="24" ry="11" fill="${C.blush}" opacity="${s.blush}"/>
  <!-- nose -->
  <path d="M302 394 Q306 404 298 408" stroke="${C.skinShade}" stroke-width="4" fill="none" stroke-linecap="round"/>

  <!-- eyes -->
  ${eye(250, 350, s, false, s.look)}
  ${eye(350, 350, s, true, s.look)}

  <!-- mouth -->
  ${mouth(s)}

  <!-- front hair / bangs -->
  <path d="M192 304 C184 200 240 126 310 124 C386 126 428 200 412 304 Q404 262 390 244 Q388 282 374 310 Q362 262 342 236 Q338 280 322 304 Q310 260 292 232 Q288 276 268 306 Q258 262 246 242 Q240 282 222 310 Q214 272 206 258 Q202 286 192 304 Z" fill="url(#hairGrad)"/>
  <path d="M326 136 Q362 196 374 310 Q360 262 342 236 Q342 186 326 136 Z" fill="${C.streak}" filter="url(#neonGlow)"/>
  <path d="M236 156 C262 136 300 132 330 138" stroke="${C.hairHi}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".9"/>
  <!-- side locks framing the face -->
  <path d="M196 282 C174 364 178 452 216 506 C210 452 208 382 226 312 Z" fill="${C.hair}"/>
  <path d="M408 282 C430 364 426 452 388 506 C394 452 396 382 378 312 Z" fill="${C.hair}"/>
  <!-- brows drawn over hair -->
  ${brow(250, 302, s, false)}
  ${brow(350, 302, s, true)}

  <!-- headset band -->
  <path d="M176 300 C168 150 240 84 300 84 C360 84 432 150 424 300" stroke="${C.ink}" stroke-width="16" fill="none" stroke-linecap="round"/>
  <path d="M184 290 C178 160 244 98 300 98 C356 98 422 160 416 290" stroke="${C.neon}" stroke-width="3" fill="none" opacity=".55"/>
  <!-- ear cups -->
  <rect x="152" y="262" width="52" height="92" rx="24" fill="${C.ink}"/>
  <rect x="396" y="262" width="52" height="92" rx="24" fill="${C.ink}"/>
  <rect x="162" y="282" width="10" height="52" rx="5" fill="${C.neon}" filter="url(#neonGlow)" opacity="${0.6 + 0.4 * g}"/>
  <rect x="428" y="282" width="10" height="52" rx="5" fill="${C.neon}" filter="url(#neonGlow)" opacity="${0.6 + 0.4 * g}"/>
  <!-- mic boom -->
  <path d="M184 344 C186 410 220 444 262 450" stroke="${C.ink}" stroke-width="8" fill="none" stroke-linecap="round"/>
  <rect x="256" y="440" width="24" height="18" rx="9" fill="${C.ink}"/>
  <circle cx="272" cy="449" r="4" fill="${C.neon}"/>

  <!-- brainbox cube on headset -->
  <g transform="translate(300 70)" filter="url(#neonGlow)" opacity="${0.75 + 0.25 * g}">
    <path d="M0 -26 L26 -12 L26 16 L0 30 L-26 16 L-26 -12 Z" fill="#0B1A12" stroke="${C.neon}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M-26 -12 L0 2 L26 -12 M0 2 L0 30" fill="none" stroke="${C.neon}" stroke-width="4" stroke-linejoin="round"/>
    <circle cx="0" cy="-8" r="${3 + 3 * g}" fill="${C.neon}"/>
  </g>
</svg>`;
  }

  root.characterSVG = characterSVG;
  root.BIX_COLORS = C;
  if (typeof module !== 'undefined') module.exports = { characterSVG, BIX_COLORS: C };
})(typeof window !== 'undefined' ? window : globalThis);
