// 記録を、ゲームと同じ計算でやり直して確かめる（前回より後に来た記録だけ。読みこみを少なくするため）
// 合わない記録と cb-remove.txt のIDの記録を消す。bbs-hide.txt の書きこみと、7日より古い書きこみも消す
import fs from 'fs';
import { createRequire } from 'module';
import { token, api } from './fb.mjs';
const EB = createRequire(import.meta.url)('../sim.js');
const tk = await token();
const lines = f => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '').split(/\s+/).filter(x => /^[A-Za-z0-9_-]{10,40}$/.test(x));
const ban = lines('cb-remove.txt'), hide = lines('bbs-hide.txt');
const get = async p => JSON.parse(await api('GET', p, undefined, tk));
const meta = (await get('/chikyu/meta/chk.json')) || {};
const since = k => (meta[k] || 0) + 1;
let n = 0, rm = 0;
const now = Date.now();
for (let st = 1; st <= 4; st++) {
  const d = (await get('/chikyu/clr/' + st + '.json?orderBy=%22t%22&startAt=' + since('c' + st))) || {};
  for (const [k, v] of Object.entries(d)) {
    n++; meta['c' + st] = Math.max(meta['c' + st] || 0, v.t || 0);
    if (!EB.checkClear(v, st)) { rm++; console.log('消す: ステージ', st, k, v.s, '計算が合わない'); await api('DELETE', '/chikyu/clr/' + st + '/' + k + '.json', undefined, tk); }
  }
}
const f = (await get('/chikyu/far.json?orderBy=%22t%22&startAt=' + since('far'))) || {};
for (const [k, v] of Object.entries(f)) {
  n++; meta.far = Math.max(meta.far || 0, v.t || 0);
  const fi = (await get('/chikyu/farIn/' + k + '.json')) || {};
  if (fi.st !== v.st || !EB.checkFar({ ...v, in: fi.in })) { rm++; console.log('消す: 宇宙の果て', k, JSON.stringify(v.n), v.s, '計算が合わない'); await api('DELETE', '/chikyu/far/' + k + '.json', undefined, tk); await api('DELETE', '/chikyu/farIn/' + k + '.json', undefined, tk); }
}
// 手で指定した記録
for (const k of ban) {
  for (let st = 1; st <= 4; st++) await api('DELETE', '/chikyu/clr/' + st + '/' + k + '.json', undefined, tk).catch(() => { });
  await api('DELETE', '/chikyu/far/' + k + '.json', undefined, tk).catch(() => { });
  await api('DELETE', '/chikyu/farIn/' + k + '.json', undefined, tk).catch(() => { });
}
// 掲示板：指定した書きこみと、7日より古い書きこみ・受け取りの記録を消す（受け取った人のブースターは残る）
for (const p of hide) await api('DELETE', '/chikyu/bbs/' + p + '.json', undefined, tk).catch(() => { });
const old = now - 7 * 864e5;
const ob = (await get('/chikyu/bbs.json?orderBy=%22t%22&endAt=' + old + '&limitToFirst=500')) || {};
let pr = 0;
for (const pid of Object.keys(ob)) { pr++; await api('DELETE', '/chikyu/bbs/' + pid + '.json', undefined, tk); await api('DELETE', '/chikyu/claim/' + pid + '.json', undefined, tk); }
await api('PUT', '/chikyu/meta/chk.json', JSON.stringify(meta), tk);
console.log('確かめた', n, '件 / 消した', rm, '件 / 古い書きこみを消した', pr, '件');
