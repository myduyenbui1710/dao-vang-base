// Nhân vật thợ mỏ vẽ bằng SVG: có mũ, thân, tay, chân, cầm cuốc. Avatar lưu dạng 'm0'..'m11'.
const MINERS = [
  { skin: '#f6d0b1', shirt: '#2f80ed', pants: '#2b3a55', hat: '#ffc400', hair: '#3b2414', style: 'short' },
  { skin: '#e8b48a', shirt: '#eb5757', pants: '#3a3a3a', hat: '#ff8a00', hair: '#1c1c1c', style: 'long' },
  { skin: '#c68a5e', shirt: '#27ae60', pants: '#24364a', hat: '#ffc400', hair: '#1c1c1c', style: 'beard' },
  { skin: '#f6d0b1', shirt: '#9b51e0', pants: '#2b2b40', hat: '#ffffff', hair: '#c9772b', style: 'long' },
  { skin: '#8d5a3b', shirt: '#f2994a', pants: '#2b3a55', hat: '#e53935', hair: '#111', style: 'short' },
  { skin: '#e8b48a', shirt: '#00a6a6', pants: '#3b2f2f', hat: '#ffc400', hair: '#6b3e1f', style: 'bun' },
  { skin: '#f6d0b1', shirt: '#6d4c41', pants: '#263238', hat: '#43a047', hair: '#d9d9d9', style: 'beard' },
  { skin: '#c68a5e', shirt: '#e91e63', pants: '#2b2b40', hat: '#ffffff', hair: '#1c1c1c', style: 'bun' },
  { skin: '#8d5a3b', shirt: '#1e88e5', pants: '#4e342e', hat: '#ff8a00', hair: '#111', style: 'beard' },
  { skin: '#e8b48a', shirt: '#fdd835', pants: '#37474f', hat: '#1e88e5', hair: '#3b2414', style: 'short' },
  { skin: '#f6d0b1', shirt: '#546e7a', pants: '#212121', hat: '#e53935', hair: '#f2c94c', style: 'long' },
  { skin: '#c68a5e', shirt: '#8bc34a', pants: '#3e2723', hat: '#ffc400', hair: '#5d4037', style: 'short' },
];
const MINER_IDS = MINERS.map((_, i) => 'm' + i);

function minerSVG(id) {
  const m = MINERS[+String(id).slice(1)] || MINERS[0];
  const hair = {
    short: `<path d="M38 30 q12 -8 26 0 v6 h-26z" fill="${m.hair}"/>`,
    long: `<path d="M36 30 q14 -10 28 0 v24 q-3 4 -6 0 v-18 h-16 v18 q-3 4 -6 0z" fill="${m.hair}"/>`,
    beard: `<path d="M38 30 q12 -8 26 0 v5 h-26z" fill="${m.hair}"/><path d="M40 44 q11 14 22 0 q-2 10 -11 11 q-9 -1 -11 -11z" fill="${m.hair}"/>`,
    bun: `<circle cx="38" cy="34" r="6" fill="${m.hair}"/><path d="M38 30 q12 -8 26 0 v6 h-26z" fill="${m.hair}"/>`,
  }[m.style];
  return `<svg class="mfig" viewBox="0 0 110 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <ellipse cx="52" cy="116" rx="26" ry="4" fill="rgba(0,0,0,.25)"/>
  <g class="legs">
    <rect x="40" y="82" width="10" height="26" rx="4" fill="${m.pants}"/>
    <rect x="55" y="82" width="10" height="26" rx="4" fill="${m.pants}"/>
    <path d="M37 106 h15 v7 h-17 q-2 -7 2 -7z" fill="#3b2414"/>
    <path d="M53 106 h15 q4 0 2 7 h-17z" fill="#3b2414"/>
  </g>
  <rect x="30" y="56" width="9" height="24" rx="4.5" fill="${m.shirt}" transform="rotate(14 34 58)"/>
  <circle cx="30" cy="80" r="5" fill="${m.skin}"/>
  <rect x="36" y="52" width="33" height="36" rx="10" fill="${m.shirt}"/>
  <path d="M41 54 v32 M64 54 v32" stroke="${m.pants}" stroke-width="3.5"/>
  <rect x="36" y="80" width="33" height="7" rx="3" fill="#5d4037"/>
  <rect x="49" y="80" width="7" height="7" rx="1.5" fill="#ffc400"/>
  <g class="head">
    ${m.style === 'long' ? hair : ''}
    <circle cx="51" cy="38" r="15" fill="${m.skin}"/>
    ${m.style !== 'long' ? hair : ''}
    <circle cx="57" cy="38" r="2" fill="#222"/><circle cx="47" cy="38" r="2" fill="#222"/>
    <circle cx="61" cy="43" r="2.6" fill="#ff9a8a" opacity=".6"/>
    <path d="M47 45 q5 4 10 0" stroke="#222" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M33 31 q18 -26 37 0z" fill="${m.hat}" stroke="rgba(0,0,0,.2)" stroke-width="1.5"/>
    <rect x="30" y="29" width="43" height="5" rx="2.5" fill="${m.hat}" stroke="rgba(0,0,0,.2)" stroke-width="1.5"/>
    <circle cx="66" cy="23" r="4.5" fill="#fff59d" stroke="#bfa000" stroke-width="1.5"/>
  </g>
  <g class="arm">
    <rect x="83.5" y="18" width="5" height="60" rx="2.5" fill="#8d5a2b"/>
    <path d="M69 25 q17 -15 34 0 q-17 -6 -34 0z" fill="#9aa4ad" stroke="#5f6a73" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M65 58 L85 66" stroke="${m.shirt}" stroke-width="9" stroke-linecap="round"/>
    <circle cx="86" cy="66" r="5" fill="${m.skin}"/>
  </g>
</svg>`;
}

// Hiển thị avatar ở mọi nơi: nhân vật SVG nếu là 'mN', còn lại (dữ liệu cũ) hiển thị như chữ.
function ava(a) {
  return /^m\d+$/.test(String(a)) ? `<span class="mava">${minerSVG(a)}</span>` : esc(a);
}
