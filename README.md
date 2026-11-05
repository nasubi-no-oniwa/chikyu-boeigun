# 地球防衛軍

地球を動かして、隕石をよけながら太陽系を脱出する。どこまで逃げられる？

遊ぶ：https://nasubi-no-oniwa.github.io/chikyu-boeigun/

- `index.html` … ゲーム本体
- `sim.js` … 地球と隕石の動きの計算（ゲームと記録の確認で同じものを使う）
- `database.rules.cb.json` … ランキングのルール。GitHub に上げると自動で ft-green の `chikyu` に反映（ほかのゲームのルールはそのまま）
- `cb-remove.txt` … 消したい記録のIDを1行ずつ書いて上げると、その記録を消す
- 記録の確認は10分ごとに自動で動き、計算が合わない記録を消す
