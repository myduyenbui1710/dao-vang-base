// Màn người chơi (điện thoại).
DB.init();
modeBanner();

const app = document.getElementById('app');
const LAST = QUESTIONS.length - 1;
const params = new URLSearchParams(location.search);
let room = (params.get('room') || '').trim();
let pid = null, me = null, state = null, score = null, players = {};
let unsubs = [], lastKey = '', lastScoreQ = -2;
let mine = { q: -1, mined: 0, taps: [], lockedUntil: 0, dirty: false };
let myAct = {};
let betPick = null;
const R = p => `rooms/${room}/${p}`;

// ---------- Vào phòng ----------
function askRoom() {
  app.innerHTML = `<div class="p-card center">
    <div class="logo small">⛏️ <span>Đào Vàng</span></div>
    <label class="lbl">Nhập mã phòng</label>
    <input id="roomIn" class="inp big-inp" inputmode="numeric" maxlength="4" placeholder="1234">
    <button class="btn btn-gold btn-block" id="go">Vào phòng</button></div>`;
  document.getElementById('go').onclick = () => {
    const v = document.getElementById('roomIn').value.trim();
    if (v) location.search = '?room=' + encodeURIComponent(v);
  };
}

async function boot() {
  if (!room) return askRoom();
  app.innerHTML = '<div class="p-card center"><p class="muted">Đang vào phòng…</p></div>';
  const st = await DB.get(R('state'));
  if (!st) { app.innerHTML = `<div class="p-card center"><h2>Không tìm thấy phòng ${esc(room)}</h2><p class="muted">Kiểm tra lại mã phòng trên màn hình chiếu.</p><button class="btn btn-ghost" onclick="location.search=''">Nhập lại</button></div>`; return; }
  pid = localStorage.getItem('daovang_pid_' + room);
  if (pid) {
    me = await DB.get(R(`players/${pid}`));
    if (me) return enter();
  }
  joinForm();
}

function joinForm() {
  let chosen = null;
  app.innerHTML = `<div class="p-card">
    <div class="logo small">⛏️ <span>Đào Vàng</span> · Phòng ${esc(room)}</div>
    <label class="lbl">Tên của bạn</label>
    <input id="nameIn" class="inp" maxlength="18" placeholder="VD: Duyên Sales" autocomplete="off">
    <label class="lbl">Chọn mặt của bạn</label>
    <div class="ava-pick face-pick">${AVATAR_CHOICES.map(a => `<button class="ava-opt" data-a="${a}">${isFace(a) ? ava(a) : minerSVG(a)}</button>`).join('')}</div>
    <button class="btn btn-gold btn-block" id="joinBtn">Vào mỏ ⛏️</button>
    <p class="err" id="err"></p></div>`;
  // Mặt đã có người chọn thì khóa lại
  unsubs.push(DB.on(R('players'), v => {
    const taken = Object.values(v || {}).map(p => p.avatar);
    app.querySelectorAll('.ava-opt').forEach(b => {
      const t = isFace(b.dataset.a) && taken.includes(b.dataset.a);
      b.disabled = t; b.classList.toggle('taken', t);
      if (t && chosen === b.dataset.a) { chosen = null; b.classList.remove('sel'); }
    });
  }));
  app.querySelectorAll('.ava-opt').forEach(b => b.onclick = () => {
    chosen = b.dataset.a; app.querySelectorAll('.ava-opt').forEach(x => x.classList.toggle('sel', x === b)); Sound.unlock(); Sound.click();
  });
  document.getElementById('joinBtn').onclick = async () => {
    Sound.unlock();
    let name = document.getElementById('nameIn').value.trim().replace(/\s+/g, ' ');
    if (!name) { document.getElementById('err').textContent = 'Nhập tên trước đã nhé'; return; }
    if (!chosen) { document.getElementById('err').textContent = 'Chọn mặt của bạn nhé'; return; }
    const others = Object.values((await DB.get(R('players'))) || {});
    if (isFace(chosen) && others.some(p => p.avatar === chosen)) { document.getElementById('err').textContent = 'Mặt này vừa có người chọn, bạn chọn lại nhé'; return; }
    const existing = others.map(p => p.name.toLowerCase());
    let final = name, n = 2;
    while (existing.includes(final.toLowerCase())) final = `${name} ${n++}`;
    pid = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    me = { name: final, avatar: chosen, joinedAt: DB.now() };
    await DB.set(R(`players/${pid}`), me);
    localStorage.setItem('daovang_pid_' + room, pid);
    enter();
  };
}

function enter() {
  Sound.setMusic(false); // điện thoại chỉ phát hiệu ứng, nhạc nền phát trên màn chiếu
  unsubs.push(DB.on(R('state'), v => { if (v) { state = v; render(); } }));
  unsubs.push(DB.on(R(`scores/${pid}`), v => { score = v; if (v && v.q !== lastScoreQ) { lastScoreQ = v.q; render(true); } }));
  unsubs.push(DB.on(R('players'), v => { players = v || {}; if (state && state.phase === 'lobby') render(true); }));
  document.addEventListener('click', () => Sound.unlock(), { once: true });
}

// Dự phòng khi điện thoại rớt tín hiệu cập nhật: 2 giây đọc lại trạng thái phòng một lần
setInterval(async () => {
  if (!me || !room) return;
  const url = window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.databaseURL;
  if (state && state.phase + ':' + state.q !== lastKey) render();
  if (!url) return;
  const before = state && state.phase + ':' + state.q;
  try {
    const v = await (await fetch(`${url}/rooms/${room}/state.json`, { cache: 'no-store' })).json();
    const now = state && state.phase + ':' + state.q;
    if (v && now === before && v.phase + ':' + v.q !== now) { state = v; render(); }
  } catch (e) { /* mạng chập chờn: lần sau đọc lại */ }
}, 2000);

// ---------- Ghi hành động ----------
function act(obj) {
  myAct = { ...myAct, ...obj };
  return DB.update(R(`actions/${state.q}/${pid}`), obj);
}
setInterval(() => {
  if (mine.dirty && state && mine.q === state.q) { mine.dirty = false; act({ mined: mine.mined, rocks: mine.rocks, ev: mine.ev || null }); }
}, 400);

// ---------- Hiển thị ----------
const bank = () => (score ? score.bank : RULES.START_BANK);
const topBar = () => `<div class="p-top"><span class="ava">${ava(me.avatar)}</span><b>${esc(me.name)}</b>
  <span class="p-bank">Két 💰 ${fmt(bank())}</span></div>`;
const timer = () => `<div class="cd-wrap"><div class="cd-bar" id="cdbar"></div></div>`;

setInterval(() => {
  if (!state || !state.endsAt) return;
  const left = state.endsAt - DB.now();
  const bar = document.getElementById('cdbar');
  if (bar) bar.style.width = clamp(left / ((RULES.DUR[state.phase] || 1) * 1000) * 100, 0, 100) + '%';
  const cd = document.getElementById('cd'); if (cd) cd.textContent = Math.max(0, Math.ceil(left / 1000));
}, 120);

async function render(soft = false) {
  try { await renderInner(soft); }
  catch (e) {
    console.error(e);
    app.insertAdjacentHTML('beforeend', `<div class="p-card center"><p class="err">Màn hình gặp lỗi: ${esc(e.message)}</p><button class="btn btn-gold" onclick="location.reload()">Tải lại</button></div>`);
  }
}

async function renderInner(soft = false) {
  if (!state || !me) return;
  const key = state.phase + ':' + state.q;
  const changed = key !== lastKey;
  if (soft && !changed && !['lobby', 'reveal', 'board', 'final'].includes(state.phase)) return;
  if (changed && state.q !== mine.q && state.q >= 0) {
    mine = { q: state.q, mined: 0, rocks: 0, taps: [], lockedUntil: 0, dirty: false }; betPick = null;
    myAct = (await DB.get(R(`actions/${state.q}/${pid}`))) || {};
    if (myAct.mined) mine.mined = myAct.mined;
  }
  lastKey = key;
  const Q = QUESTIONS[state.q];
  const isBet = !!(state.betQs && state.betQs['q' + state.q]);
  const last = state.q === LAST;
  let html = '';
  switch (state.phase) {
    case 'lobby':
      html = `<div class="p-card center"><div class="ava huge bob">${ava(me.avatar)}</div>
        <h2>Chào ${esc(me.name)}!</h2><p class="muted">Bạn đã vào mỏ. Chờ host bắt đầu nhé.</p>
        <p class="pill-s">👥 ${Object.keys(players).length} thợ mỏ trong phòng</p>
        <p class="muted small">Két khởi đầu: 💰 ${fmt(RULES.START_BANK)}</p></div>`;
      break;
    case 'ready':
      if (changed && navigator.vibrate) navigator.vibrate(150);
      html = `${topBar()}<div class="p-card center"><p class="muted">Câu ${state.q + 1}/${QUESTIONS.length}${last ? ' · 🌙 Đêm vàng x2' : ''}</p>
        <h1>Màn ${state.q + 1}: ${THEMES[state.q % THEMES.length].icon} ${THEMES[state.q % THEMES.length].name}</h1><div class="ready-num pop" id="cd"></div><div class="ava huge bob">🪝</div></div>`;
      break;
    case 'mine':
      html = `<div class="claw-top"><span class="p-phase">${THEMES[state.q % THEMES.length].icon} <span id="cd"></span>s</span>
        <span class="claw-rank" id="clawRank"></span><span class="claw-gold">💰 <b id="minedNum">${fmt(mine.mined)}</b></span></div>${timer()}
        <canvas id="claw" class="claw-cv"></canvas>
        <p class="muted center small">Cả phòng dùng chung một mỏ, ai móc trước được trước · 💣 trừ ${BOMB_PENALTY} vàng và choáng</p>`;
      break;
    case 'topic':
      html = `${topBar()}<div class="p-card center"><p class="muted">Chủ đề câu ${state.q + 1}</p>
        <h1 class="topic pop">${esc(Q.topic)}</h1><p class="muted">Túi vừa đào: 💰 ${fmt(mine.mined)}</p>
        <p class="${isBet ? 'forced' : 'muted'}">${isBet ? '🎲 Câu này có cược!' : 'Câu này không cược. Đúng được +' + RULES.CORRECT_BONUS + ' vàng'}</p></div>`;
      break;
    case 'bet': {
      const base = last ? mine.mined + bank() : mine.mined;
      const opts = [0, 25, 50, 100];
      const done = !!myAct.confirmed;
      const cur = done ? myAct.bet : betPick;
      html = `${topBar()}<div class="p-phase">🎲 ĐẶT CƯỢC</div>
        <p class="center muted">${last ? '🌙 Đêm vàng: cược trên Túi + Két, thắng x2' : 'Cược trên số vàng vừa đào, phần còn lại vào Két'}</p>
        <div class="mine-total">Có thể cược: 💰 <b>${fmt(base)}</b></div>
        <div class="bets">${opts.map(p => `<button class="bet-btn ${p === 100 ? 'allin' : ''} ${p === 0 ? 'nobet' : ''} ${cur === p ? 'sel' : ''}" data-p="${p}" ${done ? 'disabled' : ''}>
          <span class="bp">${p === 100 ? 'ALL-IN 🔥' : p === 0 ? 'Không cược' : p + '%'}</span><span class="ba">${p ? '💰 ' + fmt(Math.round(base * p / 100)) : 'An toàn 🛡️'}</span></button>`).join('')}</div>
        ${done ? `<p class="center confirmed pop">✅ Đã xác nhận: <b>${cur === 100 ? 'ALL-IN' : cur ? cur + '%' : 'Không cược'}</b></p>`
          : `<button class="btn btn-gold btn-block" id="confirmBet" ${cur == null ? 'disabled' : ''}>Xác nhận cược</button>
             <p class="muted center small">Host bấm Next mà chưa xác nhận = Không cược</p>`}`;
      break;
    }
    case 'answer': {
      const chosen = myAct.ans;
      html = `${topBar()}<div class="p-phase">TRẢ LỜI <span id="cd"></span>s</div>${timer()}
        <div class="p-q">${esc(Q.q)}</div>
        <div class="p-opts">${Q.opts.map((o, i) => `<button class="p-opt opt-${i} ${chosen === i ? 'sel' : ''} ${chosen != null && chosen !== i ? 'is-dim' : ''}" data-i="${i}" ${chosen != null ? 'disabled' : ''}>
          <span class="shape">${OPT_SHAPES[i]}</span><b>${OPT_LABELS[i]}</b><span>${esc(o)}</span></button>`).join('')}</div>
        ${chosen != null ? '<p class="center muted">Đã chốt! Chờ mọi người…</p>' : ''}`;
      break;
    }
    case 'reveal': {
      if (!score || score.q !== state.q) { html = `${topBar()}<div class="p-card center"><p class="muted">Đang tính vàng…</p></div>`; break; }
      if (changed || soft) score.correct ? Sound.correct() : Sound.wrong();
      html = `${topBar()}<div class="p-card center result ${score.correct ? 'ok' : 'bad'}">
        <div class="res-ico pop">${score.correct ? '✅' : (score.answered ? '❌' : '⌛')}</div>
        <h2>${score.correct ? 'Chính xác!' : (score.answered ? 'Sai rồi!' : 'Hết giờ!')}</h2>
        <p>Đáp án: <b>${OPT_LABELS[Q.a]}. ${esc(Q.opts[Q.a])}</b></p>
        ${score.bet ? `<div class="res-line">Cược ${score.pct === 100 ? 'ALL-IN' : score.pct + '%'}: 💰 ${fmt(score.bet)}</div>` : ''}
        ${score.speed ? `<div class="res-line">⚡ Thưởng tốc độ: +${fmt(score.speed)}</div>` : ''}
        <div class="res-gain ${score.gain >= 0 ? 'pos' : 'neg'}">${score.gain >= 0 ? '+' : ''}${fmt(score.gain)}</div>
        ${score.title ? `<div class="title-badge pop">${esc(score.title)}</div>` : ''}
        <p class="muted">Két hiện tại: 💰 ${fmt(score.bank)}</p></div>`;
      break;
    }
    case 'board': {
      const s = score || {};
      const d = (s.prev || s.rank) - s.rank;
      html = `${topBar()}<div class="p-card center"><p class="muted">Bạn đang đứng</p>
        <div class="my-rank pop">#${s.rank || '-'}<span class="of">/${s.total || Object.keys(players).length}</span></div>
        <div class="${d > 0 ? 'up' : d < 0 ? 'down' : 'same'} big-arrow">${d > 0 ? '▲ ' + d : d < 0 ? '▼ ' + (-d) : '• giữ hạng'}</div>
        <p>Két: 💰 <b>${fmt(s.bank)}</b></p>${s.title ? `<div class="title-badge">${esc(s.title)}</div>` : ''}
        <p class="muted small">Nhìn lên màn hình lớn để xem top 5</p></div>`;
      break;
    }
    case 'final': {
      const s = score || {};
      if (changed) { Sound.fanfare(); if (s.rank && s.rank <= 3) confetti(5000); }
      html = `<div class="p-card center"><div class="ava huge">${ava(me.avatar)}</div><h2>${esc(me.name)}</h2>
        <div class="my-rank">${s.rank <= 3 ? ['🥇', '🥈', '🥉'][s.rank - 1] : '#' + (s.rank || '-')}</div>
        <p>Tổng vàng: 💰 <b>${fmt(s.bank)}</b></p>
        <p class="muted">Đúng ${s.correctCount || 0}/${QUESTIONS.length} câu · All-in ${s.allInCount || 0} lần</p>
        <p class="muted small">Đáp án đầy đủ đang hiện trên màn hình lớn. Cảm ơn bạn đã chơi!</p></div>`;
      break;
    }
  }
  app.innerHTML = html;
  bind();
}

function bind() {
  const cv = document.getElementById('claw');
  if (cv) {
    const q = state.q;
    Claw.start(cv, {
      me: pid, avatar: me.avatar, q, seed: room + ':' + q, players: () => players,
      net: {
        claim: (id, data) => DB.claim(R(`claims/${q}/${id}`), data),
        onClaims: cb => DB.on(R(`claims/${q}`), v => cb(v || {})),
      },
      onRank: (rank, total) => { const el = document.getElementById('clawRank'); if (el) el.textContent = `Hạng ${rank}/${total}`; },
      onGrab: g => {
        if (!state || state.phase !== 'mine') return;
        mine.mined = clamp(mine.mined + g.v, 0, RULES.MAX_MINE);
        if (g.kind === 'rock') mine.rocks++;
        mine.grabs = (mine.grabs || 0) + 1;
        mine.ev = { n: mine.grabs, kind: g.kind, type: g.type, v: g.v, icon: g.icon || null };
        mine.dirty = true;
        const el = document.getElementById('minedNum'); if (el) el.textContent = fmt(mine.mined);
      },
    });
    // pointerdown nhận cả cảm ứng lẫn chuột, kể cả laptop màn cảm ứng
    cv.addEventListener('pointerdown', e => { e.preventDefault(); Sound.unlock(); if (state && state.phase === 'mine') Claw.tap(); });
  } else Claw.stop();
  app.querySelectorAll('.bet-btn').forEach(b => b.onclick = () => {
    if (myAct.confirmed) return;
    betPick = +b.dataset.p;
    app.querySelectorAll('.bet-btn').forEach(x => x.classList.toggle('sel', x === b));
    const c = document.getElementById('confirmBet'); if (c) c.disabled = false;
    betPick === 100 ? Sound.allin() : Sound.click();
  });
  const cb = document.getElementById('confirmBet');
  if (cb) cb.onclick = async () => {
    if (betPick == null || myAct.confirmed) return;
    await act({ bet: betPick, confirmed: true }); Sound.correct(); render();
  };
  app.querySelectorAll('.p-opt').forEach(b => b.onclick = () => {
    if (myAct.ans != null || DB.now() > state.endsAt) return;
    const i = +b.dataset.i; act({ ans: i, t: DB.now() }); Sound.click();
    render();
  });
}

boot();
