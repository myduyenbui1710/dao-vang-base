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
  let chosen = AVATARS[rand(0, AVATARS.length - 1)];
  app.innerHTML = `<div class="p-card">
    <div class="logo small">⛏️ <span>Đào Vàng</span> · Phòng ${esc(room)}</div>
    <label class="lbl">Tên của bạn</label>
    <input id="nameIn" class="inp" maxlength="18" placeholder="VD: Duyên Sales" autocomplete="off">
    <label class="lbl">Chọn avatar</label>
    <div class="ava-pick">${AVATARS.map(a => `<button class="ava-opt ${a === chosen ? 'sel' : ''}" data-a="${a}">${a}</button>`).join('')}</div>
    <button class="btn btn-gold btn-block" id="joinBtn">Vào mỏ ⛏️</button>
    <p class="err" id="err"></p></div>`;
  app.querySelectorAll('.ava-opt').forEach(b => b.onclick = () => {
    chosen = b.dataset.a; app.querySelectorAll('.ava-opt').forEach(x => x.classList.toggle('sel', x === b)); Sound.unlock(); Sound.click();
  });
  document.getElementById('joinBtn').onclick = async () => {
    Sound.unlock();
    let name = document.getElementById('nameIn').value.trim().replace(/\s+/g, ' ');
    if (!name) { document.getElementById('err').textContent = 'Nhập tên trước đã nhé'; return; }
    const existing = Object.values((await DB.get(R('players'))) || {}).map(p => p.name.toLowerCase());
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

// ---------- Ghi hành động ----------
function act(obj) {
  myAct = { ...myAct, ...obj };
  return DB.update(R(`actions/${state.q}/${pid}`), obj);
}
setInterval(() => {
  if (mine.dirty && state && mine.q === state.q) { mine.dirty = false; act({ mined: mine.mined }); }
}, 400);

// ---------- Hiển thị ----------
const bank = () => (score ? score.bank : RULES.START_BANK);
const topBar = () => `<div class="p-top"><span class="ava">${esc(me.avatar)}</span><b>${esc(me.name)}</b>
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
  if (!state || !me) return;
  const key = state.phase + ':' + state.q;
  const changed = key !== lastKey;
  if (soft && !changed && !['lobby', 'reveal', 'board', 'final'].includes(state.phase)) return;
  if (changed && state.q !== mine.q && state.q >= 0) {
    mine = { q: state.q, mined: 0, taps: [], lockedUntil: 0, dirty: false };
    myAct = (await DB.get(R(`actions/${state.q}/${pid}`))) || {};
    if (myAct.mined) mine.mined = myAct.mined;
  }
  lastKey = key;
  const Q = QUESTIONS[state.q];
  const forced = state.forced && state.forced[state.q];
  const last = state.q === LAST;
  let html = '';
  switch (state.phase) {
    case 'lobby':
      html = `<div class="p-card center"><div class="ava huge bob">${esc(me.avatar)}</div>
        <h2>Chào ${esc(me.name)}!</h2><p class="muted">Bạn đã vào mỏ. Chờ host bắt đầu nhé.</p>
        <p class="pill-s">👥 ${Object.keys(players).length} thợ mỏ trong phòng</p>
        <p class="muted small">Két khởi đầu: 💰 ${fmt(RULES.START_BANK)}</p></div>`;
      break;
    case 'mine':
      html = `${topBar()}<div class="p-phase">ĐÀO! <span id="cd"></span>s</div>${timer()}
        <div class="mine-total">Túi: 💰 <b id="minedNum">${fmt(mine.mined)}</b></div>
        <button class="rock-btn" id="rock"><span class="rock-ico">🪨</span><span class="pick">⛏️</span></button>
        <p class="muted center">Bấm liên tục! Có lúc trúng cục to x5, có lúc đào phải đá 💥</p>`;
      break;
    case 'topic':
      html = `${topBar()}<div class="p-card center"><p class="muted">Chủ đề câu ${state.q + 1}</p>
        <h1 class="topic pop">${esc(Q.topic)}</h1><p class="muted">Túi vừa đào: 💰 ${fmt(mine.mined)}</p>
        ${forced ? `<p class="forced">⚠️ Câu này cược bắt buộc ${forced === 100 ? 'ALL-IN' : forced + '%'}</p>` : ''}</div>`;
      break;
    case 'bet': {
      const base = last ? mine.mined + bank() : mine.mined;
      const opts = [25, 50, 100];
      const cur = forced || myAct.bet;
      html = `${topBar()}<div class="p-phase">ĐẶT CƯỢC <span id="cd"></span>s</div>${timer()}
        <p class="center muted">${last ? '🌙 Đêm vàng: cược trên Túi + Két, thắng x2' : 'Cược trên số vàng vừa đào, phần còn lại vào Két'}</p>
        <div class="mine-total">Có thể cược: 💰 <b>${fmt(base)}</b></div>
        ${forced ? `<p class="forced center">Câu này bị ép cược ${forced === 100 ? 'ALL-IN' : forced + '%'} 🔒</p>` : ''}
        <div class="bets">${opts.map(p => `<button class="bet-btn ${p === 100 ? 'allin' : ''} ${cur === p ? 'sel' : ''}" data-p="${p}" ${forced ? 'disabled' : ''}>
          <span class="bp">${p === 100 ? 'ALL-IN 🔥' : p + '%'}</span><span class="ba">💰 ${fmt(Math.round(base * p / 100))}</span></button>`).join('')}</div>
        ${!forced ? `<p class="muted center small">Không chọn sẽ tự cược ${RULES.DEFAULT_BET}%</p>` : ''}`;
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
        <div class="res-line">Cược ${score.pct === 100 ? 'ALL-IN' : score.pct + '%'}: 💰 ${fmt(score.bet)}</div>
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
      html = `<div class="p-card center"><div class="ava huge">${esc(me.avatar)}</div><h2>${esc(me.name)}</h2>
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
  const rock = document.getElementById('rock');
  if (rock) {
    const tap = e => {
      e.preventDefault();
      if (!state || state.phase !== 'mine') return;
      const now = Date.now();
      if (now < mine.lockedUntil) return;
      mine.taps = mine.taps.filter(t => now - t < 1000);
      if (mine.taps.length >= RULES.MAX_TAPS_PER_SEC) return;
      mine.taps.push(now);
      const pt = e.touches ? e.touches[0] : e;
      const x = (pt.clientX || innerWidth / 2) - 20, y = (pt.clientY || innerHeight / 2) - 40;
      const r = Math.random();
      if (r < RULES.ROCK_CHANCE) {
        mine.lockedUntil = now + RULES.ROCK_LOCK_MS;
        rock.classList.add('stunned'); setTimeout(() => rock.classList.remove('stunned'), RULES.ROCK_LOCK_MS);
        floatText(x, y, '💥 Đá!', 'f-bad'); Sound.rock(); navigator.vibrate && navigator.vibrate(200);
        return;
      }
      let g;
      if (r < RULES.ROCK_CHANCE + RULES.BIG_CHANCE) { g = rand(10, 16) * 5; floatText(x, y, `💰 +${g} x5!`, 'f-big'); Sound.big(); }
      else { g = rand(6, 15); floatText(x, y, `+${g}`); Sound.coin(); }
      mine.mined = Math.min(RULES.MAX_MINE, mine.mined + g); mine.dirty = true;
      rock.classList.remove('hit'); void rock.offsetWidth; rock.classList.add('hit');
      document.getElementById('minedNum').textContent = fmt(mine.mined);
    };
    rock.addEventListener('touchstart', tap, { passive: false });
    rock.addEventListener('mousedown', e => { if (!('ontouchstart' in window)) tap(e); });
  }
  app.querySelectorAll('.bet-btn').forEach(b => b.onclick = () => {
    const p = +b.dataset.p; act({ bet: p });
    app.querySelectorAll('.bet-btn').forEach(x => x.classList.toggle('sel', x === b));
    p === 100 ? Sound.allin() : Sound.click();
  });
  app.querySelectorAll('.p-opt').forEach(b => b.onclick = () => {
    if (myAct.ans != null) return;
    const i = +b.dataset.i; act({ ans: i, t: DB.now() }); Sound.click();
    render();
  });
}

boot();
