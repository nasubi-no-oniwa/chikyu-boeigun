// 地球防衛軍：地球の動きと隕石の計算（ゲームと記録の確認で同じものを使う）
// 1秒 = 60コマ。同じ「始めた時刻」と同じ操作なら、どの端末でも必ず同じ結果になる
(function (root) {
  const TICK = 60;
  const AW = 3.4, AH = 6;        // 動ける広さの半分（横6.8 × 縦12）
  const ER = 0.42;               // 地球の当たりの大きさ
  const EV = 5.4 / TICK;         // 地球の速さ（1コマ）
  const END = 600 * TICK;        // 600秒で打ち止め（ここまで来る人はいない想定）
  const V = 1;                   // 計算の版
  // 32方向（三角関数は端末で結果がずれることがあるので、数字で持つ）
  const DIR = [[1,0],[0.980785,0.19509],[0.92388,0.382683],[0.83147,0.55557],[0.707107,0.707107],[0.55557,0.83147],[0.382683,0.92388],[0.19509,0.980785],[0,1],[-0.19509,0.980785],[-0.382683,0.92388],[-0.55557,0.83147],[-0.707107,0.707107],[-0.83147,0.55557],[-0.92388,0.382683],[-0.980785,0.19509],[-1,0],[-0.980785,-0.19509],[-0.92388,-0.382683],[-0.83147,-0.55557],[-0.707107,-0.707107],[-0.55557,-0.83147],[-0.382683,-0.92388],[-0.19509,-0.980785],[0,-1],[0.19509,-0.980785],[0.382683,-0.92388],[0.55557,-0.83147],[0.707107,-0.707107],[0.83147,-0.55557],[0.92388,-0.382683],[0.980785,-0.19509]];

  // 帯（隕石がどっと増える場所）：[始まり秒, 終わり秒, 種類]
  const BELTS = [[12, 18, 'rock', 24], [54, 67, 'ice', 13], [96, 126, 'ice', 9]];   // 最後の数：小石の間（コマ）

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // サーバーの時刻から隕石の並びを決める
  function seedOf(st) { return ((st % 4294967296) ^ 0x2c1b3c6d) >>> 0; }
  const clampX = x => Math.max(-AW + ER, Math.min(AW - ER, x));
  const clampZ = z => Math.max(-AH + ER, Math.min(AH - ER, z));

  function create(seed) {
    return { tick: 0, x: 0, z: AH * 0.45, face: 24, moving: false,
      ms: [], nid: 1, next: 70, pnext: 0, R: rng(seed), dead: false, ev: [] };
  }
  const sec = S => S.tick / TICK;
  // 隕石の基本の速さ（1コマ）。だんだん速く
  const base = t => Math.min(15, 3.2 + t * 0.06) / TICK;
  const inBelt = t => { for (const b of BELTS) if (t >= b[0] && t < b[1]) return b; return null; };

  // 隕石を足す。w：予告のコマ数（その間は画面の外で待つ）
  function add(S, k, x, z, vx, vz, r, w, ice) {
    const m = { id: S.nid++, k, x, z, vx, vz, r, t0: S.tick, ti: S.tick + (w || 0), ice: !!ice };
    S.ms.push(m); S.ev.push({ e: 'warn', m });
    return m;
  }
  function spawn(S) {
    const R = S.R, t = sec(S), bs = base(t), top = -AH - 1.4;
    const rx = () => (R() * 2 - 1) * (AW - .2);
    const W = [
      ['rock', 5],
      ['big', t < 4 ? 0 : 1.4],
      ['fast', t < 8 ? 0 : 1.6 + t * .01],
      ['aim', t < 10 ? 0 : 1.3 + t * .012],
      ['wall', t < 20 ? 0 : .7 + t * .006],
      ['side', t < 30 ? 0 : 1 + t * .008]
    ];
    let sum = 0; for (const w of W) sum += w[1];
    let p = R() * sum, k = 'rock';
    for (const w of W) { p -= w[1]; if (p < 0) { k = w[0]; break; } }
    if (k === 'rock') {
      add(S, k, rx(), top, (R() * 2 - 1) * .5 / TICK, bs * (.85 + R() * .4), .32 + R() * .38, 0);
    } else if (k === 'big') {
      add(S, k, rx(), top - .6, (R() * 2 - 1) * .25 / TICK, bs * .6, .85 + R() * .4, 0);
    } else if (k === 'fast') {
      add(S, k, rx(), top, 0, bs * 2.4, .28, Math.max(34, Math.round(52 - t * .12)));
    } else if (k === 'aim') {
      add(S, k, rx(), top, 0, 0, .42, Math.max(30, Math.round(46 - t * .1)));
    } else if (k === 'wall') {
      const gap = Math.max(1.45, 2.1 - t * .004), gc = (R() * 2 - 1) * (AW - gap / 2 - .2);
      const n = 9, vz = bs * .8;
      for (let i = 0; i < n; i++) {
        const x = -AW + (i + .5) * (AW * 2 / n);
        if (Math.abs(x - gc) < gap / 2 + .2) continue;
        add(S, k, x, top, 0, vz, .38, 0);
      }
    } else { // side：横から来るほうき星
      const fromL = R() < .5, z = -AH + R() * AH * 1.3;
      add(S, k, fromL ? -AW - 1.4 : AW + 1.4, z, (fromL ? 1 : -1) * bs * 1.3, bs * .45, .34, Math.max(32, Math.round(48 - t * .1)));
    }
    const gap = Math.max(8, Math.round(42 - t * .28));
    S.next = S.tick + gap + Math.floor(R() * gap * .5);
  }
  // 帯の中の小石
  function pebble(S, b) {
    const R = S.R, t = sec(S), bs = base(t);
    add(S, 'peb', (R() * 2 - 1) * (AW - .1), -AH - 1.2, (R() * 2 - 1) * .3 / TICK, bs * (1 + R() * .5), .2 + R() * .17, 0, b[2] === 'ice');
    S.pnext = S.tick + b[3] + Math.floor(R() * 6);
  }

  // 1コマ進める。d：0＝止まる / 1〜32＝方向
  function step(S, d) {
    if (S.dead) return S;
    S.ev.length = 0;
    S.tick++;
    const dir = d > 0 && d <= 32 ? d - 1 : -1;
    S.moving = dir >= 0;
    if (dir >= 0) { S.face = dir; const v = DIR[dir]; S.x = clampX(S.x + v[0] * EV); S.z = clampZ(S.z + v[1] * EV); }
    const t = sec(S);
    if (S.tick >= S.next) spawn(S);
    const b = inBelt(t);
    if (b && S.tick >= S.pnext) pebble(S, b);
    for (const m of S.ms) {
      if (S.tick < m.ti) continue;
      if (S.tick === m.ti && m.k === 'aim') { // 地球めがけて飛ぶ
        const dx = S.x - m.x, dz = S.z - m.z, l = Math.sqrt(dx * dx + dz * dz) || 1, sp = base(t) * 1.75;
        m.vx = dx / l * sp; m.vz = dz / l * sp; S.ev.push({ e: 'go', m });
      } else if (S.tick === m.ti && m.ti > m.t0) S.ev.push({ e: 'go', m });
      m.x += m.vx; m.z += m.vz;
      const dx = S.x - m.x, dz = S.z - m.z, rr = m.r * .9 + ER;
      if (dx * dx + dz * dz < rr * rr && !S.dead) { S.dead = true; S.by = m; S.ev.push({ e: 'dead', m }); }
    }
    if (S.tick >= END && !S.dead) { S.dead = true; S.ev.push({ e: 'dead', m: null }); }
    if (S.tick % 20 === 0) S.ms = S.ms.filter(m => S.tick < m.ti || (m.z < AH + 3 && m.x > -AW - 4 && m.x < AW + 4 && m.z > -AH - 8));
    return S;
  }

  // 操作の記録 ⇔ 文字
  const AL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefg';
  function enc(D) {
    let s = '', i = 0;
    while (i < D.length) { let j = i; while (j < D.length && D[j] === D[i]) j++; s += AL[D[i]] + (j - i > 1 ? (j - i) : ''); i = j; }
    return s;
  }
  function dec(str) {
    if (typeof str !== 'string' || str.length > 120000) return null;
    const D = [];
    const re = /([A-Za-g])(\d*)/g; let m, used = 0;
    while ((m = re.exec(str))) {
      if (m.index !== used) return null; used = re.lastIndex;
      const v = AL.indexOf(m[1]); if (v < 0) return null;
      const n = m[2] ? +m[2] : 1; if (n < 1 || D.length + n > END + 10) return null;
      for (let k = 0; k < n; k++) D.push(v);
    }
    if (used !== str.length) return null;
    return D;
  }
  function ms(n) { return Math.round(n * 1000 / TICK); }
  // 記録の確かめ：同じ操作で、同じコマに当たるか
  function check(r) {
    try {
      if (!r || r.v !== V || typeof r.st !== 'number') return false;
      const D = dec(r.in); if (!D || !D.length) return false;
      const S = create(seedOf(r.st));
      for (let i = 0; i < D.length; i++) { step(S, D[i]); if (S.dead && i < D.length - 1) return false; }
      return S.dead && ms(S.tick) === r.s;
    } catch (e) { return false; }
  }

  // ===== 距離（見せるだけ。記録は生きのびた時間で持ち、距離はそこから出す） =====
  // [秒, 太陽からの距離（AU）] 間は対数でつなぐ
  const TL = [[0, 1], [7, 1.52], [12, 2.2], [18, 3.3], [25, 5.2], [34, 9.54], [44, 19.2], [54, 30.1], [61, 39.5], [67, 50], [78, 120], [96, 2000], [126, 100000], [150, 268000], [175, 544000], [200, 1.58e6], [260, 1.64e9]];
  function auAt(s) {
    if (s <= 0) return 1;
    for (let i = 1; i < TL.length; i++) if (s <= TL[i][0]) {
      const [s0, a0] = TL[i - 1], [s1, a1] = TL[i], k = (s - s0) / (s1 - s0);
      return Math.exp(Math.log(a0) + (Math.log(a1) - Math.log(a0)) * k);
    }
    const [s0, a0] = TL[TL.length - 2], [s1, a1] = TL[TL.length - 1];
    return Math.exp(Math.log(a1) + (Math.log(a1) - Math.log(a0)) / (s1 - s0) * (s - s1));
  }
  // 進んだ距離（km）
  const KM_AU = 1.496e8;
  const kmAt = s => (auAt(s) - 1) * KM_AU;
  // 目じるし（太陽からの距離 AU）
  const MARKS = [['mars', 1.52], ['belt', 2.2], ['jupiter', 5.2], ['saturn', 9.54], ['uranus', 19.2], ['neptune', 30.1], ['pluto', 39.5], ['helio', 120], ['oort', 2000], ['proxima', 268000], ['sirius', 544000], ['vega', 1.58e6], ['center', 1.64e9]];
  // その秒で何個目まで通りすぎたか（0＝まだ火星の手前）
  function passed(s) { const a = auAt(s); let n = 0; for (const m of MARKS) if (a >= m[1]) n++; return n; }
  // 目じるしを通る秒
  function markSec(i) {
    const a = MARKS[i][1];
    let lo = 0, hi = 400;
    for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (auAt(m) < a) lo = m; else hi = m; }
    return hi;
  }

  const EB = { TICK, AW, AH, ER, EV, END, V, DIR, BELTS, create, step, enc, dec, check, seedOf, ms, base, inBelt, auAt, kmAt, KM_AU, MARKS, passed, markSec };
  if (typeof module !== 'undefined' && module.exports) module.exports = EB;
  else root.EB = EB;
})(typeof self !== 'undefined' ? self : this);
