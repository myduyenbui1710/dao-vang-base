// Nhạc 8-bit và hiệu ứng âm thanh tự tạo bằng Web Audio (không dùng file nhạc, không lo bản quyền).
const Sound = (() => {
  let ctx = null, master = null, musicGain = null, sfxGain = null;
  let musicOn = true, sfxOn = true, mood = null, timer = null, step = 0, nextTime = 0;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.22; musicGain.connect(master);
      sfxGain = ctx.createGain(); sfxGain.gain.value = 0.5; sfxGain.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  function tone(freq, dur, { type = 'square', vol = 0.3, when = 0, slide = 0, out } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(out || sfxGain); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, { vol = 0.3, when = 0, freq = 1200, out } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(out || sfxGain); s.start(t);
  }
  const N = n => 440 * Math.pow(2, (n - 69) / 12); // MIDI → Hz

  // Giai điệu gốc, thang âm ngũ cung La thứ. 0 = nghỉ.
  const SONGS = {
    lobby: { bpm: 108, bass: [45, 0, 52, 0, 45, 0, 52, 0, 43, 0, 50, 0, 43, 0, 50, 0],
      lead: [69, 0, 72, 0, 74, 0, 72, 69, 67, 0, 69, 0, 64, 0, 0, 0, 69, 0, 72, 0, 76, 0, 74, 72, 74, 0, 72, 0, 69, 0, 0, 0] },
    mine: { bpm: 168, bass: [45, 45, 57, 45, 45, 45, 57, 45, 43, 43, 55, 43, 48, 48, 60, 48],
      lead: [81, 0, 79, 81, 84, 0, 81, 79, 76, 0, 79, 0, 81, 0, 0, 0, 84, 0, 86, 84, 81, 0, 79, 81, 76, 79, 81, 0, 84, 0, 0, 0] },
    tense: { bpm: 132, bass: [45, 0, 45, 0, 46, 0, 46, 0, 45, 0, 45, 0, 44, 0, 44, 0],
      lead: [0, 0, 76, 0, 0, 0, 77, 0, 0, 0, 76, 0, 0, 0, 75, 0] },
    board: { bpm: 120, bass: [48, 0, 55, 0, 53, 0, 55, 0, 48, 0, 55, 0, 57, 0, 55, 0],
      lead: [72, 76, 79, 0, 77, 0, 76, 74, 72, 0, 74, 76, 79, 0, 0, 0, 81, 79, 77, 76, 74, 0, 76, 0, 72, 0, 0, 0, 0, 0, 0, 0] },
  };

  function schedule() {
    const song = SONGS[mood]; if (!song || !ctx) return;
    const stepDur = 60 / song.bpm / 2; // nốt móc đơn
    while (nextTime < ctx.currentTime + 0.15) {
      const when = nextTime - ctx.currentTime;
      const b = song.bass[step % song.bass.length];
      const l = song.lead[step % song.lead.length];
      if (b) tone(N(b), stepDur * 0.9, { type: 'triangle', vol: 0.5, when, out: musicGain });
      if (l) tone(N(l), stepDur * 0.8, { type: 'square', vol: 0.18, when, out: musicGain });
      if (mood === 'mine' && step % 2 === 0) noise(0.04, { vol: 0.15, when, freq: 6000, out: musicGain });
      if (mood === 'tense' && step % 4 === 0) noise(0.08, { vol: 0.25, when, freq: 200, out: musicGain });
      nextTime += stepDur; step++;
    }
  }

  function play(m) {
    if (m === mood) return;
    mood = m; step = 0;
    if (!ctx) return;
    nextTime = ctx.currentTime + 0.05;
    clearInterval(timer);
    if (m && musicOn) timer = setInterval(schedule, 50);
  }

  return {
    unlock() { const ok = ensure(); if (ok && mood && musicOn && !timer) { nextTime = ctx.currentTime + 0.05; timer = setInterval(schedule, 50); } return ok; },
    play,
    stop() { clearInterval(timer); timer = null; mood = null; },
    toggleMusic() {
      musicOn = !musicOn;
      if (!musicOn) { clearInterval(timer); timer = null; }
      else if (mood && ctx) { nextTime = ctx.currentTime + 0.05; timer = setInterval(schedule, 50); }
      return musicOn;
    },
    setMusic(on) { if (on !== musicOn) this.toggleMusic(); },
    toggleSfx() { sfxOn = !sfxOn; return sfxOn; },
    get musicOn() { return musicOn; },
    // Hiệu ứng
    coin() { if (!sfxOn) return; tone(988, 0.05, { vol: 0.2 }); tone(1319, 0.1, { vol: 0.2, when: 0.05 }); },
    big() { if (!sfxOn) return; [72, 76, 79, 84, 88].forEach((n, i) => tone(N(n), 0.09, { vol: 0.25, when: i * 0.05 })); },
    rock() { if (!sfxOn) return; noise(0.25, { vol: 0.6, freq: 400 }); tone(110, 0.2, { type: 'sawtooth', vol: 0.3, slide: 55 }); },
    boom() { if (!sfxOn) return; noise(0.7, { vol: 1, freq: 180 }); noise(0.25, { vol: 0.6, freq: 1500 }); tone(90, 0.6, { type: 'sawtooth', vol: 0.5, slide: 30 }); },
    clang() { if (!sfxOn) return; tone(1800, 0.12, { vol: 0.25, slide: 1200 }); tone(2600, 0.08, { vol: 0.15 }); },
    squeak() { if (!sfxOn) return; tone(1200, 0.08, { vol: 0.2, slide: 1900 }); tone(1500, 0.08, { vol: 0.15, when: 0.08, slide: 1000 }); },
    tick() { if (!sfxOn) return; tone(1500, 0.03, { vol: 0.15 }); },
    click() { if (!sfxOn) return; tone(660, 0.04, { vol: 0.15 }); },
    reveal() { if (!sfxOn) return; noise(0.3, { vol: 0.3, freq: 3000 }); tone(N(67), 0.4, { type: 'triangle', vol: 0.4, when: 0.1 }); },
    correct() { if (!sfxOn) return; [72, 76, 79, 84].forEach((n, i) => tone(N(n), 0.14, { vol: 0.3, when: i * 0.09 })); },
    wrong() { if (!sfxOn) return; tone(330, 0.25, { type: 'sawtooth', vol: 0.3, slide: 160 }); tone(247, 0.4, { type: 'sawtooth', vol: 0.3, when: 0.22, slide: 110 }); },
    allin() { if (!sfxOn) return; for (let i = 0; i < 16; i++) noise(0.06, { vol: 0.2 + i * 0.03, when: i * 0.05, freq: 300 }); tone(N(48), 0.5, { type: 'square', vol: 0.4, when: 0.8 }); },
    fanfare() { if (!sfxOn) return; [[72, 0], [72, 0.12], [72, 0.24], [76, 0.36], [79, 0.6], [76, 0.84], [79, 0.96], [84, 1.1]].forEach(([n, w]) => tone(N(n), 0.22, { vol: 0.3, when: w })); },
  };
})();
