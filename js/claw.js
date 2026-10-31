// Mini-game thả móc kéo vàng: 10 màn, mỗi màn một loại vàng, con vật và vật cản riêng.
const THEMES = [
  { name: 'Mỏ Vàng Cổ', icon: '⛏️', sky: ['#ffb347', '#ffcf7a'], dirt: ['#c98a3c', '#9a5e24', '#5a3110'], shape: 'nugget', pal: ['#fff7b0', '#ffd23a', '#b07800'],
    special: { icon: '💰', v: 450 }, animals: [{ icon: '🐭', v: 40, sp: 70 }, { icon: '🐢', v: 90, sp: 22 }], walls: ['📦'] },
  { name: 'Hang Pha Lê', icon: '🔮', sky: ['#2b1650', '#4a2a80'], dirt: ['#3d2468', '#2a1850', '#160c30'], shape: 'crystal', pal: ['#ffe0ff', '#c77dff', '#6a2fb0'],
    special: { icon: '💎', v: 500 }, animals: [{ icon: '🦇', v: 60, sp: 95 }, { icon: '🕷️', v: 40, sp: 40 }], walls: ['🗿'] },
  { name: 'Đáy Đại Dương', icon: '🌊', sky: ['#0f6fb0', '#2ba6d9'], dirt: ['#1a7fa8', '#10587f', '#08304f'], shape: 'pearl', pal: ['#ffffff', '#ffe3ef', '#c79ab5'],
    special: { icon: '🐚', v: 450 }, animals: [{ icon: '🐟', v: 40, sp: 90 }, { icon: '🐙', v: 80, sp: 35 }, { icon: '🦀', v: 50, sp: 50 }], walls: ['⚓'] },
  { name: 'Sa Mạc Cổ', icon: '🏜️', sky: ['#ffa24d', '#ffe0a0'], dirt: ['#e8bf70', '#c8934a', '#8a5f2a'], shape: 'coin', pal: ['#fff3b0', '#f5c033', '#a67a10'],
    special: { icon: '🏺', v: 480 }, animals: [{ icon: '🦂', v: 50, sp: 60 }, { icon: '🐍', v: 60, sp: 75 }, { icon: '🐫', v: 90, sp: 25 }], walls: ['🌵'] },
  { name: 'Vùng Băng Giá', icon: '❄️', sky: ['#a8dcf5', '#e4f6ff'], dirt: ['#bfe6f7', '#7fbfe0', '#3f7fa8'], shape: 'ice', pal: ['#ffffff', '#ffe98a', '#6fb5d8'],
    special: { icon: '💎', v: 500 }, animals: [{ icon: '🐧', v: 60, sp: 50 }, { icon: '🐰', v: 40, sp: 85 }], walls: ['⛄'] },
  { name: 'Núi Lửa', icon: '🌋', sky: ['#4a1208', '#a02a10'], dirt: ['#6a2410', '#3f140a', '#1c0804'], shape: 'lava', pal: ['#fff0a0', '#ff8a1f', '#c21f05'],
    special: { icon: '💎', v: 520 }, animals: [{ icon: '🦎', v: 50, sp: 80 }, { icon: '🐉', v: 110, sp: 45 }], walls: ['🔥'] },
  { name: 'Rừng Rậm', icon: '🌴', sky: ['#3fa34d', '#9fdc7a'], dirt: ['#5c8a3a', '#3f6327', '#223a14'], shape: 'crystal', pal: ['#d8ffd0', '#34d17a', '#0f7a45'],
    special: { icon: '🏆', v: 480 }, animals: [{ icon: '🐒', v: 60, sp: 85 }, { icon: '🐊', v: 90, sp: 30 }], walls: ['🌳'] },
  { name: 'Vũ Trụ', icon: '🚀', sky: ['#05051a', '#1a1a4a'], dirt: ['#1a1a40', '#10102c', '#050514'], shape: 'meteor', pal: ['#e8f4ff', '#8fb4e8', '#3f5a90'],
    special: { icon: '⭐', v: 500 }, animals: [{ icon: '👽', v: 70, sp: 55 }, { icon: '🛸', v: 110, sp: 100 }], walls: ['🪐'] },
  { name: 'Đảo Hải Tặc', icon: '🏴‍☠️', sky: ['#2f9fd0', '#a6e1f5'], dirt: ['#e0c080', '#b08a4c', '#6b4a20'], shape: 'coin', pal: ['#fff0a0', '#ffc61a', '#99690a'],
    special: { icon: '👑', v: 550 }, animals: [{ icon: '🦜', v: 60, sp: 90 }, { icon: '🐀', v: 40, sp: 70 }], walls: ['💀'] },
  { name: 'Đêm Vàng', icon: '🌙', sky: ['#0a0a2a', '#2a1a55'], dirt: ['#2a1c50', '#1a1038', '#0a0620'], shape: 'lava', pal: ['#fffbd0', '#ffd700', '#b8860b'],
    special: { icon: '👑', v: 650 }, animals: [{ icon: '👻', v: 80, sp: 60 }, { icon: '🦉', v: 70, sp: 80 }], walls: ['🎃'] },
];

const ITEM_TYPES = {
  gold_s: { r: 13, v: 50, w: 1.4, kind: 'gold' },
  gold_m: { r: 22, v: 120, w: 2.4, kind: 'gold' },
  gold_l: { r: 36, v: 320, w: 4.5, kind: 'gold' },
  rock_s: { r: 17, v: 12, w: 3, kind: 'rock' },
  rock_l: { r: 28, v: 25, w: 5.5, kind: 'rock' },
  bag:    { r: 17, v: 0, w: 1.8, kind: 'bag' },
};
const ITEM_POOL = ['gold_s', 'gold_s', 'gold_s', 'gold_m', 'gold_m', 'gold_l', 'rock_s', 'rock_l', 'bag', 'special', 'bomb'];
const BOMB_PENALTY = 100, BOMB_STUN = 1.5, BOMB_RADIUS = 75;

// Vẽ emoji qua canvas đệm để điện thoại chạy mượt
const emojiCache = {};
function emojiCanvas(icon, size) {
  const key = icon + '|' + size;
  if (emojiCache[key]) return emojiCache[key];
  const c = document.createElement('canvas'), s = size * 1.5;
  c.width = c.height = s * 2;
  const x = c.getContext('2d');
  x.scale(2, 2);
  x.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#000';
  x.fillText(icon, s / 2, s / 2);
  return (emojiCache[key] = c);
}
function drawEmoji(ctx, icon, size, flip) {
  const c = emojiCanvas(icon, size), s = size * 1.5;
  ctx.save(); if (flip) ctx.scale(-1, 1); ctx.drawImage(c, -s / 2, -s / 2, s, s); ctx.restore();
}

function blobPath(ctx, r, n, seed, sq = 0.85) {
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, rr = r * (0.85 + 0.15 * Math.sin(i * 2.3 + seed * 9));
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * sq);
  }
  ctx.closePath();
}

function drawTreasure(ctx, theme, r, seed) {
  const [l, m, d] = theme.pal;
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r * 1.05);
  g.addColorStop(0, l); g.addColorStop(0.45, m); g.addColorStop(1, d);
  ctx.fillStyle = g;
  switch (theme.shape) {
    case 'crystal':
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.7, -r * 0.3); ctx.lineTo(r * 0.5, r * 0.85); ctx.lineTo(-r * 0.5, r * 0.85); ctx.lineTo(-r * 0.7, -r * 0.3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = l; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, r * 0.85); ctx.moveTo(-r * 0.7, -r * 0.3); ctx.lineTo(r * 0.7, -r * 0.3); ctx.stroke();
      break;
    case 'pearl':
      ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.35, r * 0.2, 0, Math.PI * 2); ctx.fill();
      break;
    case 'coin':
      ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = d; ctx.lineWidth = Math.max(1.5, r * 0.12); ctx.beginPath(); ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2); ctx.stroke();
      break;
    case 'ice':
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-r * 0.85, -r * 0.75, r * 1.7, r * 1.5, r * 0.25) : ctx.rect(-r * 0.85, -r * 0.75, r * 1.7, r * 1.5); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.stroke();
      break;
    case 'lava':
      ctx.save(); ctx.shadowColor = m; ctx.shadowBlur = r * 0.7; blobPath(ctx, r, 9, seed); ctx.fill(); ctx.restore();
      break;
    case 'meteor':
      blobPath(ctx, r, 10, seed, 0.9); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      [[-.3, -.2, .2], [.3, .15, .16], [-.1, .4, .12]].forEach(([x, y, q]) => { ctx.beginPath(); ctx.arc(x * r, y * r, q * r, 0, Math.PI * 2); ctx.fill(); });
      break;
    default:
      blobPath(ctx, r, 9, seed); ctx.fill();
  }
}

function drawRock(ctx, r, seed) {
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r);
  g.addColorStop(0, '#c2b4a0'); g.addColorStop(1, '#5a4c3e');
  ctx.fillStyle = g; blobPath(ctx, r, 7, seed, 0.8); ctx.fill();
}

function drawBag(ctx, r) {
  ctx.fillStyle = '#c98f3f'; ctx.strokeStyle = '#fff0c0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 3, r, r * 0.85, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#7a5226'; ctx.fillRect(-5, -r + 2, 10, 6);
  ctx.fillStyle = '#4a2a00'; ctx.font = `bold ${r * 1.2}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 0, 4);
}

const Claw = (() => {
  const SKY = 164, ACTIVE = 14, ANIMALS = 3;
  let cv, ctx, W, H, dpr, theme, pool, walls, aniPool, items, animals, hook, raf, last, opts, img, floats, booms, shake, running = false;
  let claimed, totals, firstSnap, unsub, opps, faceImgs, rope, meId;
  let heroX = 0, moveDir = 0, zoom = 1, cssW = 0, cssH = 0;
  const O = () => ({ x: heroX, y: 112 });
  const HERO_SPEED = 190, HERO_MARGIN = 56;

  // Bộ sinh số theo seed: mọi điện thoại trong phòng tạo ra đúng một mỏ giống nhau
  function seeded(str) {
    let h = 1779033703;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 3432918353), h = h << 13 | h >>> 19;
    return () => { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  }
  function place(o) { o.x = o.r + 6 + o.nx * (W - 2 * o.r - 12); o.y = SKY + o.r + 6 + o.ny * (H - SKY - 2 * o.r - 12); return o; }

  function buildField(seed) {
    const rnd = seeded(seed), recent = [];
    const spot = () => {
      let nx, ny;
      for (let k = 0; k < 25; k++) {
        nx = rnd(); ny = rnd();
        if (recent.every(p => Math.hypot((p[0] - nx) * 0.65, p[1] - ny) > 0.14)) break;
      }
      recent.push([nx, ny]); if (recent.length > ACTIVE + 3) recent.splice(3, 1);
      return { nx, ny };
    };
    walls = [0, 1, 2].map(i => place({ ...spot(), r: 20, icon: theme.walls[i % theme.walls.length] }));
    pool = [];
    const first = ['bomb', 'bomb', 'special'];
    for (let i = 0; i < 150; i++) {
      let name = first[i] || ITEM_POOL[Math.floor(rnd() * ITEM_POOL.length)];
      // Giữ bom thưa: trong 10 món gần nhất chỉ có tối đa 1 quả (không tính 2 quả đầu)
      if (name === 'bomb' && i > 1 && pool.slice(Math.max(2, i - 10)).some(o => o.kind === 'bomb')) name = 'gold_s';
      let t;
      if (name === 'special') t = { r: 15, v: theme.special.v, w: 1.15, kind: 'special', icon: theme.special.icon };
      else if (name === 'bomb') t = { r: 16, v: -BOMB_PENALTY, w: 1, kind: 'bomb', icon: '💣' };
      else t = ITEM_TYPES[name];
      const v = t.kind === 'bag' ? [20, 60, 150, 300, 600][Math.floor(rnd() * 5)] : t.v;
      pool.push(place({ ...t, v, type: name, id: 'i' + i, ...spot(), seed: rnd() }));
    }
    aniPool = [];
    for (let i = 0; i < 40; i++) {
      const a = theme.animals[Math.floor(rnd() * theme.animals.length)], gem = rnd() < 0.3;
      aniPool.push({ ...a, kind: 'animal', type: 'animal', id: 'a' + i, r: 17, w: gem ? 1.3 : 1.6, gem, v: gem ? 500 : a.v,
        y: SKY + 30 + rnd() * (H - SKY - 60), ph: rnd() * 2, seed: rnd() });
    }
  }
  function refresh() {
    items = pool.filter(o => !claimed[o.id]).slice(0, ACTIVE);
    animals = aniPool.filter(o => !claimed[o.id]).slice(0, ANIMALS);
  }
  // Con vật chạy theo giờ chung nên trên mọi máy đều ở cùng một chỗ
  function moveAnimals() {
    const span = W - 36, t = DB.now() / 1000;
    animals.forEach(a => {
      const p = (t * a.sp / span + a.ph) % 2;
      a.x = 18 + span * (p < 1 ? p : 2 - p); a.dir = p < 1 ? 1 : -1;
    });
  }

  function loadImg(id) {
    if (faceImgs[id]) return faceImgs[id];
    const im = new Image();
    im.src = isFace(id) ? FACES[+String(id).slice(1)] : 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(minerSVG(id));
    return (faceImgs[id] = im);
  }
  function layoutOpps() {
    const ps = opts.players() || {};
    const list = Object.keys(ps).filter(p => p !== meId).sort((a, b) => (ps[a].joinedAt || 0) - (ps[b].joinedAt || 0));
    const old = opps || {};
    opps = {};
    list.forEach((pid, i) => {
      const x = (i + 0.5) / list.length * (W - 16) + 8;
      opps[pid] = { ...(old[pid] || {}), pid, x, y: i % 2 ? 142 : 122, color: ropeColor(ps[pid].avatar), avatar: ps[pid].avatar, ph: i * 1.3 };
    });
  }
  function report() {
    const mine = totals[meId] || 0;
    const ps = opts.players() || {};
    const rank = 1 + Object.keys(ps).filter(p => p !== meId && (totals[p] || 0) > mine).length;
    opts.onRank && opts.onRank(rank, Object.keys(ps).length);
  }
  function onClaims(all) {
    totals = {};
    Object.keys(all).forEach(id => {
      const c = all[id], prev = claimed[id];
      if (c.p && c.p !== 'boom') totals[c.p] = (totals[c.p] || 0) + (c.v || 0);
      if (prev && prev.seen && prev.p === c.p) return;
      claimed[id] = { ...c, seen: true };
      if (firstSnap || c.p === meId) return;
      // Mình đang móc đúng món đó mà bị người khác lấy trước
      if (hook.caught && hook.caught.id === id) loseCaught();
      if (c.p === 'boom') return;
      const it = pool.concat(aniPool).find(o => o.id === id), op = opps[c.p];
      if (it && op) {
        if (it.kind === 'bomb') { booms.push({ x: it.x, y: it.y, t: 0 }); Sound.boom(); }
        const x = it.kind === 'animal' ? (it.x || W / 2) : it.x;
        op.anim = { t: 0, x, y: it.y, item: it.kind === 'bomb' ? null : { ...it, x, dir: it.dir || 1 }, v: c.v, kind: it.kind };
      }
    });
    firstSnap = false;
    refresh(); report();
  }
  function loseCaught() {
    hook.caught = null;
    floats.push({ text: 'Hụt!', x: O().x + 34, y: O().y - 20, life: 1, bad: true });
    Sound.clang();
  }

  // Màn hình lớn thì phóng to cả mỏ; W, H là kích thước logic sau khi chia tỉ lệ
  function measure() {
    dpr = window.devicePixelRatio || 1;
    const rect = cv.getBoundingClientRect();
    cssW = rect.width; cssH = rect.height;
    zoom = clamp(Math.min(cssW / 620, cssH / 480), 1, 2.2);
    W = cssW / zoom; H = cssH / zoom;
    cv.width = cssW * dpr; cv.height = cssH * dpr;
    ctx = cv.getContext('2d'); ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0);
  }
  function resize() {
    if (!running) return;
    const rect = cv.getBoundingClientRect();
    if (Math.abs(rect.width - cssW) < 2 && Math.abs(rect.height - cssH) < 80) return;
    const k = heroX / W;
    measure(); buildField(opts.seed); refresh(); layoutOpps(); setHero(k * W);
    if (hook.caught) hook.caught = null;
    hook.state = hook.state === 'swing' ? 'swing' : 'in';
  }

  function start(canvas, o) {
    stop();
    cv = canvas; opts = o; meId = o.me; theme = THEMES[o.q % THEMES.length]; rope = ropeColor(o.avatar);
    measure();
    heroX = W / 2; moveDir = 0;
    floats = []; booms = []; shake = 0; claimed = {}; totals = {}; firstSnap = true; faceImgs = {}; opps = {};
    buildField(o.seed); refresh(); layoutOpps();
    hook = { state: 'swing', t: Math.random() * 6, a: 0, L: 34, caught: null, stun: 0 };
    img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(minerSVG(o.avatar).replace('<svg class="mfig"', '<svg'));
    unsub = o.net.onClaims(onClaims);
    running = true; last = performance.now();
    raf = requestAnimationFrame(loop);
  }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; if (unsub) unsub(); unsub = null; }
  function tap() {
    if (running && hook.state === 'swing' && hook.stun <= 0) { hook.state = 'out'; return true; }
    return false;
  }
  // Di chuyển trái phải: chỉ đi được khi móc đang ở trên và không bị choáng
  const canMove = () => running && hook.state === 'swing' && hook.stun <= 0;
  const setHero = x => { heroX = clamp(x, HERO_MARGIN, W - HERO_MARGIN); };
  function move(dir) { moveDir = dir; }
  function shift(dx) { if (canMove()) setHero(heroX + dx / zoom); }
  function tip() { const o = O(); return { x: o.x + Math.sin(hook.a) * hook.L, y: o.y + Math.cos(hook.a) * hook.L }; }
  const award = g => {
    totals[meId] = totals[meId] || 0; // tổng thật cập nhật khi tín hiệu từ máy chủ về
    opts.onGrab && opts.onGrab(g);
  };

  function explode(p, bomb) {
    booms.push({ x: p.x, y: p.y, t: 0 });
    shake = 0.45; hook.stun = BOMB_STUN;
    items.filter(o => o !== bomb && Math.hypot(o.x - p.x, o.y - p.y) < BOMB_RADIUS).forEach(o => {
      claimed[o.id] = { p: 'boom' }; opts.net.claim(o.id, { p: 'boom', v: 0 });
    });
    refresh();
    floats.push({ text: '💥 -' + BOMB_PENALTY, x: O().x + 34, y: O().y - 10, life: 1.3, big: true, bad: true });
    Sound.boom();
    if (navigator.vibrate) navigator.vibrate([120, 40, 200]);
    award({ v: -BOMB_PENALTY, kind: 'bomb', type: 'bomb', icon: '💣' });
  }
  function grab(o) {
    claimed[o.id] = { p: meId }; refresh();
    hook.state = 'in'; hook.stunned = false;
    const req = opts.net.claim(o.id, { p: meId, v: o.v });
    if (o.kind === 'bomb') {
      const p = tip();
      req.then(ok => { if (ok) explode(p, o); });
      return;
    }
    hook.caught = o; o.req = req;
    o.kind === 'animal' ? Sound.squeak() : Sound.click();
    req.then(ok => { if (!ok && hook.caught === o) loseCaught(); });
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const speed = H * 1.1;
    moveAnimals();
    if (moveDir && canMove()) setHero(heroX + moveDir * HERO_SPEED * dt);
    if (hook.stun > 0) hook.stun -= dt;
    if (shake > 0) shake -= dt;
    if (hook.state === 'swing') {
      if (hook.stun <= 0) { hook.t += dt * 1.9; hook.a = Math.sin(hook.t) * 1.2; }
    } else if (hook.state === 'out') {
      hook.L += speed * dt;
      const p = tip();
      const near = o => Math.hypot(o.x - p.x, o.y - p.y) < o.r + 7;
      const wall = walls.find(o => Math.hypot(o.x - p.x, o.y - p.y) < o.r + 4);
      const hit = items.find(near) || animals.find(near);
      if (wall) {
        hook.state = 'in'; Sound.clang();
        floats.push({ text: 'Keng!', x: p.x + 10, y: p.y, life: 0.8, bad: true });
        award({ v: 0, kind: 'wall', type: 'wall', icon: wall.icon });
      } else if (hit) grab(hit);
      else if (p.x < 0 || p.x > W || p.y > H) hook.state = 'in';
    } else if (hook.state === 'in') {
      hook.L -= (hook.caught ? speed / hook.caught.w : speed * 1.4) * dt;
      if (hook.L <= 34) {
        hook.L = 34; hook.state = 'swing';
        if (hook.caught) {
          const c = hook.caught; hook.caught = null;
          c.req.then(ok => {
            if (!ok) return;
            floats.push({ text: '+' + c.v, x: O().x + 40, y: O().y - 10, life: 1, big: c.v >= 300, bad: c.kind === 'rock' });
            c.kind === 'rock' ? Sound.rock() : c.v >= 300 ? Sound.big() : Sound.coin();
            if (navigator.vibrate) navigator.vibrate(c.kind === 'rock' ? 120 : 30);
            award({ v: c.v, kind: c.kind, type: c.type, icon: c.icon });
          });
        }
      }
    }
    if (hook.caught) { const p = tip(); hook.caught.x = p.x; hook.caught.y = p.y + hook.caught.r * 0.6; }
    draw(dt);
    raf = requestAnimationFrame(loop);
  }

  // Nhân vật của chính người chơi: to nhất, có vầng sáng và sao lấp lánh
  function drawMe(o) {
    const t = performance.now() / 1000, cx = o.x, cy = 54;
    const R = 62 + Math.sin(t * 3) * 5;
    const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, R);
    g.addColorStop(0, 'rgba(255,240,150,.95)'); g.addColorStop(0.55, 'rgba(255,205,50,.5)'); g.addColorStop(1, 'rgba(255,205,50,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    if (img.complete) ctx.drawImage(img, cx - 48, 0, 96, 105);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + t * 0.7, q = 50 + (i % 2) * 8;
      const k = 0.5 + 0.5 * Math.sin(t * 5 + i * 1.7);
      ctx.save(); ctx.translate(cx + Math.cos(a) * q, cy + Math.sin(a) * q); ctx.rotate(t + i); ctx.scale(k, k);
      ctx.fillStyle = '#fff8c4'; ctx.shadowColor = '#ffd23a'; ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let j = 0; j < 8; j++) { const r = j % 2 ? 2 : 8, b = j / 8 * Math.PI * 2; ctx.lineTo(Math.cos(b) * r, Math.sin(b) * r); }
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }

  function drawRope(x1, y1, x2, y2, color, w) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = w + 2; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function drawHook(x, y, a, color, s) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
    ctx.strokeStyle = color; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-12, 4, -9, 14); ctx.moveTo(0, 0); ctx.quadraticCurveTo(12, 4, 9, 14); ctx.stroke();
    ctx.restore();
  }
  // Đối thủ: mặt nhỏ có viền màu riêng, dây thả xuống đúng món họ vừa lấy
  function drawOpps(dt) {
    const t = performance.now() / 1000;
    let best = 0, lead = null;
    Object.keys(totals).forEach(p => { if (totals[p] > best) { best = totals[p]; lead = p; } });
    const list = Object.values(opps);
    const r = clamp((W - 16) / Math.max(1, list.length) * 0.82, 9, 15);
    list.forEach(op => {
      const by = op.y + r;
      let tx, ty, a;
      if (op.anim) {
        op.anim.t += dt;
        const k = op.anim.t < 0.3 ? op.anim.t / 0.3 : 1 - (op.anim.t - 0.3) / 0.6;
        tx = op.x + (op.anim.x - op.x) * Math.max(0, k); ty = by + (op.anim.y - by) * Math.max(0, k);
        a = -Math.atan2(tx - op.x, ty - by);
        if (op.anim.item && op.anim.t >= 0.3) { const it = op.anim.item; it.x = tx; it.y = ty + it.r * 0.5; drawItem(it); }
        if (op.anim.t >= 0.9) {
          if (op.anim.v) floats.push({ text: (op.anim.v > 0 ? '+' : '') + op.anim.v, x: op.x - 10, y: op.y - 6, life: 0.8, small: true, bad: op.anim.v < 0 });
          op.anim = null;
        }
      } else {
        a = Math.sin(t * 1.9 + op.ph) * 0.9;
        tx = op.x + Math.sin(a) * 15; ty = by + Math.cos(a) * 15; a = -a;
      }
      drawRope(op.x, by, tx, ty, op.color, 2);
      drawHook(tx, ty, a, op.color, 0.55);
    });
    list.forEach(op => {
      const im = loadImg(op.avatar);
      ctx.save(); ctx.beginPath(); ctx.arc(op.x, op.y, r, 0, Math.PI * 2); ctx.fillStyle = '#222'; ctx.fill(); ctx.clip();
      if (im.complete && im.naturalWidth) {
        if (isFace(op.avatar)) ctx.drawImage(im, op.x - r, op.y - r, r * 2, r * 2);
        else ctx.drawImage(im, op.x - r * 1.4, op.y - r * 1.1, r * 2.8, r * 3);
      }
      ctx.restore();
      ctx.strokeStyle = op.color; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(op.x, op.y, r, 0, Math.PI * 2); ctx.stroke();
      if (op.pid === lead) { ctx.save(); ctx.translate(op.x, op.y - r - 3); drawEmoji(ctx, '👑', 13); ctx.restore(); }
    });
    return lead;
  }

  function drawItem(o) {
    ctx.save(); ctx.translate(o.x, o.y);
    if (o.kind === 'gold') drawTreasure(ctx, theme, o.r, o.seed);
    else if (o.kind === 'rock') drawRock(ctx, o.r, o.seed);
    else if (o.kind === 'bag') drawBag(ctx, o.r);
    else if (o.kind === 'animal') {
      drawEmoji(ctx, o.icon, 30, o.dir > 0);
      if (o.gem) { ctx.translate(0, -18); drawEmoji(ctx, '💎', 15); }
    } else drawEmoji(ctx, o.icon, 28);
    ctx.restore();
  }

  function draw(dt) {
    if (Object.keys(opts.players() || {}).length - 1 !== Object.keys(opps).length) layoutOpps();
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
    const sky = ctx.createLinearGradient(0, 0, 0, SKY);
    sky.addColorStop(0, theme.sky[0]); sky.addColorStop(1, theme.sky[1]);
    ctx.fillStyle = sky; ctx.fillRect(-10, -10, W + 20, SKY + 10);
    const dirt = ctx.createLinearGradient(0, SKY, 0, H);
    dirt.addColorStop(0, theme.dirt[0]); dirt.addColorStop(0.5, theme.dirt[1]); dirt.addColorStop(1, theme.dirt[2]);
    ctx.fillStyle = dirt; ctx.fillRect(-10, SKY, W + 20, H - SKY + 10);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(-10, SKY - 4, W + 20, 6);
    walls.forEach(w => { ctx.save(); ctx.translate(w.x, w.y); drawEmoji(ctx, w.icon, 36); ctx.restore(); });
    items.forEach(drawItem);
    animals.forEach(drawItem);
    const lead = drawOpps(dt);
    const o = O();
    drawMe(o);
    if (lead === meId) { ctx.save(); ctx.translate(o.x, 2); drawEmoji(ctx, '👑', 20); ctx.restore(); }
    ctx.fillStyle = '#5d4037'; ctx.fillRect(o.x - 14, o.y - 8, 28, 10);
    ctx.fillStyle = '#9aa4ad'; ctx.beginPath(); ctx.arc(o.x, o.y - 3, 7, 0, Math.PI * 2); ctx.fill();
    const p = tip();
    drawRope(o.x, o.y, p.x, p.y, hook.stun > 0 ? '#111' : rope, 3.5);
    if (hook.caught) drawItem(hook.caught);
    drawHook(p.x, p.y, -hook.a, rope, 1);
    booms = booms.filter(b => (b.t += dt) < 0.6);
    booms.forEach(b => {
      const k = b.t / 0.6;
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = '#ffb020'; ctx.beginPath(); ctx.arc(b.x, b.y, BOMB_RADIUS * (0.3 + k), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff3a0'; ctx.beginPath(); ctx.arc(b.x, b.y, BOMB_RADIUS * (0.15 + k * 0.5), 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    });
    if (hook.stun > 0) {
      ctx.save(); ctx.translate(o.x + 40, 10 + Math.sin(hook.stun * 12) * 3); drawEmoji(ctx, '💫', 26); ctx.restore();
    }
    floats = floats.filter(f => (f.life -= dt) > 0);
    floats.forEach(f => {
      ctx.globalAlpha = Math.min(1, f.life * 1.5);
      ctx.font = `800 ${f.small ? 14 : f.big ? 30 : 22}px 'Baloo 2', sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = f.bad ? '#ff6369' : '#fff3a0'; ctx.strokeStyle = '#2a1500'; ctx.lineWidth = 4;
      const y = f.y - (1 - Math.min(1, f.life)) * 40;
      ctx.strokeText(f.text, f.x, y); ctx.fillText(f.text, f.x, y);
      ctx.globalAlpha = 1;
    });
    ctx.restore();
  }

  // Ảnh vật phẩm dùng cho màn chiếu, vẽ cùng kiểu với điện thoại
  function itemURL(q, type) {
    const t = THEMES[q % THEMES.length], spec = ITEM_TYPES[type];
    if (!spec) return '';
    const c = document.createElement('canvas'), size = spec.r * 2 + 20;
    c.width = c.height = size * 2;
    const x = c.getContext('2d');
    x.scale(2, 2); x.translate(size / 2, size / 2);
    if (spec.kind === 'gold') drawTreasure(x, t, spec.r, 0.4);
    else if (spec.kind === 'rock') drawRock(x, spec.r, 0.4);
    else drawBag(x, spec.r);
    return c.toDataURL();
  }

  // Danh sách vật phẩm của một màn, dùng cho người chơi ảo ở chế độ demo
  function previewPool(seed, q) {
    W = 360; H = 560; theme = THEMES[q % THEMES.length];
    buildField(seed);
    return pool;
  }

  return { start, stop, tap, move, shift, resize, itemURL, previewPool };
})();
