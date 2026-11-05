// 地球防衛軍：地球の動きと障害物の計算（ゲームと記録の確認で同じものを使う）
// 1秒 = 60コマ。同じ「始めた時刻」「ステージ」「ブースター」「操作」なら、どの端末でも必ず同じ結果になる
(function (root) {
  const TICK = 60;
  const AW = 3.4, AH = 6;        // 動ける広さの半分（横6.8 × 縦12）
  const ER = 0.42;               // 地球の当たりの大きさ
  const EV0 = 5.4 / TICK;        // 地球の横の速さ（身軽さ100のとき）
  const NOM = 120 * TICK;        // バランス型でステージを抜けるのにかかるコマ数（120秒）
  const END = 900 * TICK;        // 900秒で打ち止め
  const V = 2;                   // 計算の版
  const DIR = [[1,0],[0.980785,0.19509],[0.92388,0.382683],[0.83147,0.55557],[0.707107,0.707107],[0.55557,0.83147],[0.382683,0.92388],[0.19509,0.980785],[0,1],[-0.19509,0.980785],[-0.382683,0.92388],[-0.55557,0.83147],[-0.707107,0.707107],[-0.83147,0.55557],[-0.92388,0.382683],[-0.980785,0.19509],[-1,0],[-0.980785,-0.19509],[-0.92388,-0.382683],[-0.83147,-0.55557],[-0.707107,-0.707107],[-0.55557,-0.83147],[-0.382683,-0.92388],[-0.19509,-0.980785],[0,-1],[0.19509,-0.980785],[0.382683,-0.92388],[0.55557,-0.83147],[0.707107,-0.707107],[0.83147,-0.55557],[0.92388,-0.382683],[0.980785,-0.19509]];

  // ===== ブースター =====
  // id = (段-1)*3 + 型。型 0：身軽型 / 1：バランス型 / 2：スピード型
  // sp：前に進む速さ（100＝ふつう）、ag：横に動く身軽さ（100＝ふつう）
  const TYPES = [{ sp: 86, ag: 128 }, { sp: 100, ag: 100 }, { sp: 114, ag: 88 }];
  const NB = 15;
  const boost = id => { const tier = Math.floor(id / 3) + 1, ty = TYPES[id % 3]; return { id, tier, type: id % 3, sp: ty.sp, ag: ty.ag }; };
  // 段がちがうと、1段ごとに1000倍速い／遅い
  const tierF = (tier, stage) => tier >= stage ? Math.pow(1000, tier - stage) : 1 / Math.pow(1000, stage - tier);

  // ===== ステージ =====
  // v：障害物の速さ（毎秒、u=0 → u=1）/ g：出てくる間（コマ、u=0 → u=1）
  // w：種類ごとの出やすさ [u=0, u=1, 出はじめる u]
  // belts：[始まり u, 終わり u, 小石の間（コマ）]
  const STAGES = [
    null,
    { v: [3, 6.5], g: [46, 26], belts: [[.095, .143, 30], [.43, .53, 18], [.8, .97, 16]],
      w: { rock: [5, 5, 0], big: [1.4, 1.4, .03], fast: [1.6, 3.1, .06], aim: [1.3, 2.9, .08], wall: [.7, 1.6, .16], side: [1, 2, .24], bh: [0, 0, 9] } },
    { v: [3.3, 7], g: [42, 24], belts: [[.3, .38, 24], [.7, .8, 20]],
      w: { rock: [5, 4, 0], big: [1.6, 1.6, 0], fast: [2, 3.4, 0], aim: [1.5, 3, .05], wall: [.8, 1.8, .1], side: [1.5, 2.5, .15], bh: [.5, 1.1, .2] } },
    { v: [3.5, 7.2], g: [40, 23], belts: [[.12, .18, 24], [.64, .86, 20]],
      w: { rock: [5, 4, 0], big: [1.2, 1.4, 0], fast: [2.2, 3.4, 0], aim: [1.8, 3, 0], wall: [1, 2, .05], side: [1.6, 2.6, .1], bh: [.7, 1.3, .1] } },
    { v: [3.6, 7.4], g: [40, 23], belts: [],
      w: { rock: [4, 3, 0], big: [2, 2, 0], fast: [2, 3, 0], aim: [1.6, 2.8, 0], wall: [3.2, 5.5, 0], side: [1.4, 2.4, .05], bh: [.6, 1.2, .1] } },
    { v: [3.8, 8], g: [38, 22], belts: [[.3, .4, 16], [.7, .8, 14], [1.1, 1.2, 12], [1.5, 1.6, 10]],
      w: { rock: [5, 4, 0], big: [2, 2, 0], fast: [2.2, 3.6, 0], aim: [1.8, 3.2, 0], wall: [1.6, 3, 0], side: [1.8, 2.8, 0], bh: [.8, 1.5, 0] } }
  ];
  const KINDS = ['rock', 'big', 'fast', 'aim', 'wall', 'side', 'bh'];

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
  // サーバーの時刻から障害物の並びを決める
  function seedOf(st) { return ((st % 4294967296) ^ 0x2c1b3c6d) >>> 0; }
  const clampX = x => Math.max(-AW + ER, Math.min(AW - ER, x));
  const clampZ = z => Math.max(-AH + ER, Math.min(AH - ER, z));

  function create(seed, stage, bid) {
    stage = stage || 1; if (bid == null) bid = (stage - 1) * 3 + 1;
    const B = boost(bid);
    const o = { tick: 0, stage, B, x: 0, z: AH * 0.45, face: 24, moving: false,
      u: 0, du: B.sp / 100 * tierF(B.tier, stage) / NOM, ksp: B.sp / 100, lat: B.ag / 100 * EV0,
      ms: [], nid: 1, next: 70, pnext: 0, R: rng(seed), dead: false, clear: false, ev: [] };
    // 上の段のブースター：数秒で突き抜ける。そのあいだ隕石がどっと来るが、正面から砕ける
    if (B.tier > stage) { const S = o; S.over = true; S.du = 1 / (TICK * (B.tier - stage === 1 ? 3 : 1.5)); S.ksp = 3.5; S.next = 6; S.lat = EV0 * 1.6; }
    return o;
  }
  const lerp = (a, b, k) => a + (b - a) * k;
  // u は 1 をこえても（宇宙の果て）むずかしくなり続ける
  const kOf = u => Math.min(1.6, u);
  // 障害物の基本の速さ（1コマ）。スピード型ほど速く迫る
  const base = S => lerp(STAGES[S.stage].v[0], STAGES[S.stage].v[1], kOf(S.u)) * S.ksp / TICK;
  const inBelt = S => { for (const b of STAGES[S.stage].belts) if (S.u >= b[0] && S.u < b[1]) return b; return null; };

  // 障害物を足す。w：予告のコマ数（その間は画面の外で待つ）
  function add(S, k, x, z, vx, vz, r, w, belt) {
    const m = { id: S.nid++, k, x, z, vx, vz, r, t0: S.tick, ti: S.tick + (w || 0), belt: !!belt };
    S.ms.push(m); S.ev.push({ e: 'warn', m });
    return m;
  }
  function spawn(S) {
    const R = S.R, st = STAGES[S.stage], k0 = kOf(S.u), k1 = Math.min(1, k0), bs = base(S), top = -AH - 1.4;
    const rx = () => (R() * 2 - 1) * (AW - .2);
    let sum = 0; const W = [];
    for (const k of KINDS) { const w = st.w[k]; const v = S.u >= w[2] ? lerp(w[0], w[1], k1) : 0; W.push(v); sum += v; }
    let p = R() * sum, k = 'rock';
    for (let i = 0; i < KINDS.length; i++) { p -= W[i]; if (p < 0) { k = KINDS[i]; break; } }
    const wt = n => Math.max(30, Math.round(n - k1 * 14));
    if (k === 'rock') {
      add(S, k, rx(), top, (R() * 2 - 1) * .5 / TICK, bs * (.85 + R() * .4), .32 + R() * .38, 0);
    } else if (k === 'big') {
      add(S, k, rx(), top - .6, (R() * 2 - 1) * .25 / TICK, bs * .6, .75 + R() * .35, 0);
    } else if (k === 'fast') {
      add(S, k, rx(), top, 0, bs * 2.4, .28, wt(52));
    } else if (k === 'aim') {
      add(S, k, rx(), top, 0, 0, .42, wt(46));
    } else if (k === 'wall') {
      const gap = Math.max(1.75, 2.5 - k1 * .6), gc = (R() * 2 - 1) * (AW - gap / 2 - .2);
      const n = 9, vz = bs * .8;
      for (let i = 0; i < n; i++) {
        const x = -AW + (i + .5) * (AW * 2 / n);
        if (Math.abs(x - gc) < gap / 2 + .2) continue;
        add(S, k, x, top, 0, vz, .38, 0);
      }
    } else if (k === 'side') {
      const fromL = R() < .5, z = -AH + R() * AH * 1.3;
      add(S, k, fromL ? -AW - 1.4 : AW + 1.4, z, (fromL ? 1 : -1) * bs * 1.3, bs * .45, .34, wt(48));
    } else { // bh：ブラックホール。近くを通ると吸い寄せられる
      add(S, k, (R() * 2 - 1) * (AW - 1), top - .8, 0, bs * .5, .5, 0);
    }
    const g = lerp(st.g[0], st.g[1], k1) * Math.max(.6, 1 - Math.max(0, k0 - 1) * .7);
    const gap = Math.max(7, Math.round(g / S.ksp));
    // 壁のあとは少し間をあける（次の壁のすき間まで動けるように）
    S.next = S.tick + gap + Math.floor(R() * gap * .5) + (k === 'wall' ? Math.round(36 / S.ksp) : 0);
  }
  function pebble(S, b) {
    const R = S.R, bs = base(S);
    add(S, 'peb', (R() * 2 - 1) * (AW - .1), -AH - 1.2, (R() * 2 - 1) * .3 / TICK, bs * (1 + R() * .5), .2 + R() * .17, 0, true);
    S.pnext = S.tick + Math.max(6, Math.round(b[2] / S.ksp)) + Math.floor(R() * 6);
  }

  // 1コマ進める。d：0＝止まる / 1〜32＝方向
  function step(S, d) {
    if (S.dead || S.clear) return S;
    S.ev.length = 0;
    S.tick++;
    const dir = d > 0 && d <= 32 ? d - 1 : -1;
    S.moving = dir >= 0;
    if (dir >= 0) { S.face = dir; const v = DIR[dir]; S.x += v[0] * S.lat; S.z += v[1] * S.lat; }
    // ブラックホールに吸い寄せられる
    for (const m of S.ms) {
      if (m.k !== 'bh' || S.tick < m.ti) continue;
      const dx = m.x - S.x, dz = m.z - S.z, d2 = dx * dx + dz * dz;
      if (d2 < 12.25 && d2 > 1e-6) { const l = Math.sqrt(d2), f = Math.min(.05, .045 / d2); S.x += dx / l * f; S.z += dz / l * f; }
    }
    S.x = clampX(S.x); S.z = clampZ(S.z);
    // 進む
    S.u += S.du;
    if (S.stage < 5 && S.u >= 1) { S.u = 1; S.clear = true; S.ev.push({ e: 'clear' }); return S; }
    if (S.tick >= S.next) spawn(S);
    const b = inBelt(S);
    if (b && S.tick >= S.pnext) pebble(S, b);
    for (const m of S.ms) {
      if (S.tick < m.ti) continue;
      if (S.tick === m.ti && m.k === 'aim') {
        const dx = S.x - m.x, dz = S.z - m.z, l = Math.sqrt(dx * dx + dz * dz) || 1, sp = base(S) * 1.75;
        m.vx = dx / l * sp; m.vz = dz / l * sp; S.ev.push({ e: 'go', m });
      } else if (S.tick === m.ti && m.ti > m.t0) S.ev.push({ e: 'go', m });
      m.x += m.vx; m.z += m.vz;
      const dx = S.x - m.x, dz = S.z - m.z, rr = m.r * .9 + ER;
      if (dx * dx + dz * dz < rr * rr && !S.dead && !m.gone) {
        // そのステージより上の段のブースターなら、正面から砕ける
        if (S.B.tier > S.stage) { m.gone = true; S.ev.push({ e: 'smash', m }); }
        else { S.dead = true; S.by = m; S.ev.push({ e: 'dead', m }); }
      }
    }
    if (S.B.tier > S.stage) S.ms = S.ms.filter(m => !m.gone);
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
    if (typeof str !== 'string' || str.length > 160000) return null;
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
  // 宇宙の果ての距離の点（コマ × 速さ。整数）
  const ptsOf = (tick, bid) => tick * TYPES[bid % 3].sp;
  // 記録の確かめ。stage 1〜4：クリアの記録 / 5：宇宙の果ての記録
  function run(r, stage) {
    if (!r || r.v !== V || typeof r.st !== 'number' || typeof r.b !== 'number' || !(r.b >= 0 && r.b < NB && r.b % 1 === 0)) return null;
    const D = dec(r.in); if (!D || !D.length) return null;
    const S = create(seedOf(r.st), stage, r.b);
    for (let i = 0; i < D.length; i++) { step(S, D[i]); if ((S.dead || S.clear) && i < D.length - 1) return null; }
    return S;
  }
  function checkClear(r, stage) {
    try { const S = run(r, stage); return !!S && S.clear && ms(S.tick) === r.s; } catch (e) { return false; }
  }
  function checkFar(r) {
    try { const S = run(r, 5); return !!S && S.dead && ms(S.tick) === r.s && Math.floor(r.b / 3) === 4 && r.p === ptsOf(S.tick, r.b); } catch (e) { return false; }
  }

  // ===== 距離（光年）。各ステージ [u, 光年] を対数でつなぐ =====
  const AU = 1.5813e-5;
  const S1 = [[0, 1], [7, 1.52], [12, 2.2], [18, 3.3], [25, 5.2], [34, 9.54], [44, 19.2], [54, 30.1], [61, 39.5], [67, 50], [78, 120], [96, 2000], [126, 100000]].map(([s, a]) => [s / 126, a * AU]);
  const DT = [null, S1,
    [[0, 100000 * AU], [.08, 4.24], [.14, 8.6], [.25, 25], [.45, 548], [.55, 1344], [.72, 6400], [.88, 13000], [1, 25000]],
    [[0, 25000], [.2, 163000], [.27, 200000], [.6, 2.43e6], [.8, 2.537e6], [1, 2.65e6]],
    [[0, 2.65e6], [.3, 5.4e7], [.55, 2.6e8], [.78, 7e8], [1, 1e9]],
    [[0, 1e9], [.35, 1.3e10], [.7, 4.65e10], [1, 1e11], [1.3, 1e12], [1.6, 1e14], [2, 1e16]]];
  function lyAt(stage, u) {
    const T = DT[stage];
    if (u <= 0) return T[0][1];
    for (let i = 1; i < T.length; i++) if (u <= T[i][0]) {
      const [u0, a0] = T[i - 1], [u1, a1] = T[i], k = (u - u0) / (u1 - u0);
      return Math.exp(Math.log(a0) + (Math.log(a1) - Math.log(a0)) * k);
    }
    const [u0, a0] = T[T.length - 2], [u1, a1] = T[T.length - 1];
    return Math.exp(Math.log(a1) + (Math.log(a1) - Math.log(a0)) / (u1 - u0) * (u - u1));
  }
  // 目じるし [名前のキー, その u]（ステージ1〜4の最後はゴール。宇宙の果てはゴールなし）
  const MARKS = [null,
    [['mars', 7], ['belt', 12], ['jupiter', 25], ['saturn', 34], ['uranus', 44], ['neptune', 54], ['pluto', 61], ['helio', 78], ['oort', 96], ['goal1', 126]].map(([k, s]) => [k, s / 126]),
    [['proxima', .08], ['sirius', .14], ['vega', .25], ['betel', .45], ['orion', .55], ['perseus', .72], ['outer', .88], ['goal2', 1]],
    [['lmc', .2], ['smc', .27], ['andro', .6], ['androc', .8], ['goal3', 1]],
    [['virgo', .3], ['lania', .55], ['bootes', .78], ['goal4', 1]],
    [['firstg', .35], ['edge', .7], ['beyond', 1], ['trillion', 1.3], ['far14', 1.6], ['far16', 2]]];
  function passed(stage, u) { let n = 0; for (const m of MARKS[stage]) if (u >= m[1] - 1e-9) n++; return n; }
  // 宇宙の果ての記録の u
  const farU = p => p / 100 / NOM;

  const EB = { TICK, AW, AH, ER, NOM, END, V, DIR, TYPES, NB, STAGES, KINDS, boost, tierF, create, step, enc, dec, ms, seedOf, base, inBelt,
    checkClear, checkFar, ptsOf, lyAt, MARKS, passed, farU, AU };
  if (typeof module !== 'undefined' && module.exports) module.exports = EB;
  else root.EB = EB;
})(typeof self !== 'undefined' ? self : this);
