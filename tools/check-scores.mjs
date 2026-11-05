// 記録を、ゲームと同じ計算でやり直して確かめる。合わない記録と cb-remove.txt のIDの記録を消す
// 掲示板：bbs-hide.txt に書いた投稿IDの書きこみを消す
import fs from 'fs';
import { createRequire } from 'module';
import { token, api } from './fb.mjs';
const EB = createRequire(import.meta.url)('../sim.js');
const tk = await token();
const lines = f => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '').split(/\s+/).filter(x => /^[A-Za-z0-9_-]{10,40}$/.test(x));
const ban = new Set(lines('cb-remove.txt')), hide = new Set(lines('bbs-hide.txt'));
let n = 0, rm = 0;
for (let st = 1; st <= 4; st++) {
  const d = JSON.parse(await api('GET', '/chikyu/clr/' + st + '.json', undefined, tk)) || {};
  for (const [k, v] of Object.entries(d)) {
    n++; let why = '';
    if (ban.has(k)) why = '手で指定'; else if (!EB.checkClear(v, st)) why = '計算が合わない';
    if (why) { rm++; console.log('消す: ステージ', st, k, v.s, why); await api('DELETE', '/chikyu/clr/' + st + '/' + k + '.json', undefined, tk); }
  }
}
const f = JSON.parse(await api('GET', '/chikyu/far.json', undefined, tk)) || {};
for (const [k, v] of Object.entries(f)) {
  n++; let why = '';
  if (ban.has(k)) why = '手で指定'; else if (!EB.checkFar(v)) why = '計算が合わない';
  if (why) { rm++; console.log('消す: 宇宙の果て', k, JSON.stringify(v.n), v.s, why); await api('DELETE', '/chikyu/far/' + k + '.json', undefined, tk); }
}
for (const p of hide) { await api('DELETE', '/chikyu/bbs/' + p + '.json', undefined, tk).catch(() => { }); }
console.log('確かめた', n, '件 / 消した', rm, '件 / 掲示板から消した', hide.size, '件');
