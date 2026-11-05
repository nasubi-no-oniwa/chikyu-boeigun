# 地球の脱走劇

手足の生えた地球を動かして、隕石をよけながら太陽系から宇宙の果てまで逃げる。

遊ぶ：https://nasubi-no-oniwa.github.io/chikyu-boeigun/

- `index.html` … ゲーム本体
- `sim.js` … 地球と隕石の動きの計算（ゲームと記録の確認で同じものを使う）
- `database.rules.cb.json` … サーバーのルール（ステージの解放・ブースターの持ち物・宇宙の果てのランキング・掲示板・先着5人の受け取り）。`python3 tools/gen-rules.py` で作りなおし、GitHub に上げると自動で ft-green の `chikyu` に反映（ほかのゲームのルールはそのまま）
- `bbs-hide.txt` … 消したい掲示板の書きこみIDを1行ずつ書いて上げると、その書きこみを消す
- `cb-remove.txt` … 消したい記録のIDを1行ずつ書いて上げると、その記録を消す
- 記録の確認は10分ごとに自動で動き、計算が合わない記録を消す
