// ランキング・解放・掲示板のルールの試験（GitHub の上で Firebase の試し用データベースを立てて試す。本番のデータには触らない）
const NS='ft-green-default-rtdb',PROJ='ft-green',BASE='http://127.0.0.1:9000';
const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
const tok=uid=>b64({alg:'none',typ:'JWT'})+'.'+b64({uid,sub:uid,user_id:uid,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,aud:PROJ,iss:'https://securetoken.google.com/'+PROJ,provider_id:'anonymous',firebase:{sign_in_provider:'anonymous'}})+'.';
async function req(method,path,uid,body){const r=await fetch(BASE+'/'+path+'.json?ns='+NS+(uid?'&auth='+tok(uid):''),{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {ok:r.ok,status:r.status,j:await r.json().catch(()=>null)};}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fail=0;const ex=(name,res,want)=>{const ok=res.ok===want;console.log((ok?'OK  ':'NG  ')+name+' → '+res.status);if(!ok){fail++;console.log(JSON.stringify(res.j));}};
const TS={'.sv':'timestamp'};
const U=['','user1aaaaaaaaaaaaaaaaaaa','user2bbbbbbbbbbbbbbbbbbb','user3cccccccccccccccccccc','user4dddddddddddddddddddd','user5eeeeeeeeeeeeeeeeeeee','user6ffffffffffffffffffff','user7gggggggggggggggggggg'];
async function ticket(uid){await sleep(2100);const r=await req('PUT','chikyu/runs/'+uid,uid,{t:TS});const g=await req('GET','chikyu/runs/'+uid,uid);return {r,st:g.j&&g.j.t};}
const crec=(st,s,b)=>({s,st,in:'A'+Math.max(1,Math.round(s*60/1000)),b,v:2,t:TS});
async function clear(uid,stage,b,s=300){const tk=await ticket(uid);await sleep(s+150);return req('PUT','chikyu/clr/'+stage+'/'+uid,uid,crec(tk.st,s,b));}
const post=(uid,pid,x,g)=>{const o={};o['bbs/'+pid]={u:uid,n:'なまえ',x,t:TS};if(g!=null){o['bbs/'+pid].g=g;o['gave/'+uid+'/t'+(Math.floor(g/3)+1)]=TS;}o['lp/'+uid]=TS;return req('PATCH','chikyu',uid,o);};
const claim=(uid,pid,slot,g)=>{const o={};o['claim/'+pid+'/'+slot]=uid;o['inv/'+uid+'/b'+g]={p:pid,s:String(slot),t:TS};return req('PATCH','chikyu',uid,o);};

// ===== 始めます =====
ex('ログインなしで「始めます」',await req('PUT','chikyu/runs/'+U[1],null,{t:TS}),false);
let tk=await ticket(U[1]);ex('「始めます」を書く',tk.r,true);
ex('ほかの人の「始めます」を書く',await req('PUT','chikyu/runs/'+U[1],U[2],{t:TS}),false);
ex('すぐにもう一度「始めます」',await req('PUT','chikyu/runs/'+U[1],U[1],{t:TS}),false);
// ===== ステージのクリア =====
ex('開いていないステージ2のクリア',await clear(U[1],2,4),false);
ex('持っていない2段目のブースターでステージ1をクリア',await clear(U[1],1,4),false);
tk=await ticket(U[1]);await sleep(300);
ex('実際の時間より長いクリア',await req('PUT','chikyu/clr/1/'+U[1],U[1],crec(tk.st,5000,1)),false);
ex('ステージ1のクリア（1段目のブースター）',await clear(U[1],1,1),true);
ex('同じステージのクリアをもう一度',await clear(U[1],1,1),false);
ex('ステージ2のクリア（2段目のブースター）',await clear(U[1],2,4),true);
ex('ステージ5は無い（クリアの記録）',await clear(U[1],5,13),false);
ex('だれでもクリアの記録を読める',await req('GET','chikyu/clr/1',null),true);
// ===== 掲示板 =====
ex('ふつうの書きこみ',await post(U[1],'p1aaaaaaaaaaaaaa','こんにちは'),true);
ex('20秒たたずにもう一度',await post(U[1],'p1bbbbbbbbbbbbbb','もう一回'),false);
ex('61文字の書きこみ',await post(U[2],'p2aaaaaaaaaaaaaa','あ'.repeat(61)),false);
ex('ほかの人のふりをして書く',await req('PATCH','chikyu',U[2],{'bbs/p2bbbbbbbbbbbbbb':{u:U[1],n:'x',x:'x',t:TS},['lp/'+U[2]]:TS}),false);
ex('持っていないブースターを投げる（3段目）',await post(U[2],'p2cccccccccccccc','どうぞ',7),false);
await sleep(20100);
ex('2段目のブースターを投げる',await post(U[1],'p1cccccccccccccc','どうぞ',4),true);
await sleep(20100);
ex('同じ段のブースターをもう一度投げる',await post(U[1],'p1dddddddddddddd','もう一個',5),false);
ex('1段目は投げられない',await post(U[2],'p2dddddddddddddd','いる？',1),false);
// ===== 受け取り =====
ex('自分の投げたものを受け取る',await claim(U[1],'p1cccccccccccccc',1,4),false);
ex('受け取りの記録だけ書く（持ち物なし）',await req('PUT','chikyu/claim/p1cccccccccccccc/1',U[2],U[2]),false);
ex('持ち物だけ書く（受け取りなし）',await req('PUT','chikyu/inv/'+U[2]+'/b4',U[2],{p:'p1cccccccccccccc',s:'1',t:TS}),false);
ex('ちがう番号のブースターとして受け取る',await claim(U[2],'p1cccccccccccccc',1,5),false);
ex('受け取る（1人目）',await claim(U[2],'p1cccccccccccccc',1,4),true);
ex('同じ人がもう一度受け取る',await claim(U[2],'p1cccccccccccccc',2,4),false);
for(let i=3;i<=6;i++)ex('受け取る（'+(i-1)+'人目）',await claim(U[i],'p1cccccccccccccc',i-1,4),true);
ex('6人目は受け取れない',await claim(U[7],'p1cccccccccccccc',6,4),false);
ex('うまっている場所に書く',await claim(U[7],'p1cccccccccccccc',1,4),false);
ex('受け取ったブースターでステージ1を一瞬でクリア',await clear(U[2],1,4,60),true);
ex('受け取ったブースターを投げなおす',await post(U[3],'p3aaaaaaaaaaaaaa','回すよ',4),true);
ex('すでに持っている人は受け取れない',await claim(U[4],'p3aaaaaaaaaaaaaa',1,4),false);
// ===== 宇宙の果て =====
const frec=(st,s,b,p,n='テスト')=>({n,s,p,b,st,v:2,t:TS});
const far=(uid,r,noIn)=>{const o={};o['far/'+uid]=r;if(!noIn)o['farIn/'+uid]={st:r.st,in:'A'+Math.round(r.s*60/1000)};return req('PATCH','chikyu',uid,o);};
tk=await ticket(U[1]);await sleep(1100);
ex('ステージ4をクリアしていない人の宇宙の果て',await far(U[1],frec(tk.st,1000,13,6000)),false);
// U[1] にステージ3・4をクリアさせる（3段目・4段目のブースター）
ex('ステージ3のクリア',await clear(U[1],3,7),true);
ex('ステージ4のクリア',await clear(U[1],4,10),true);
tk=await ticket(U[1]);await sleep(1100);
ex('宇宙の果ての記録（4段目ブースターは不可）',await far(U[1],frec(tk.st,1000,10,6000)),false);
ex('宇宙の果ての記録',await far(U[1],frec(tk.st,1000,13,6000)),true);
ex('名前だけ変える',await far(U[1],frec(tk.st,1000,13,6000,'なまえ')),true);
ex('操作の記録なしで宇宙の果ての記録',await (async()=>{const tk2=await ticket(U[1]);await sleep(1100);return far(U[1],frec(tk2.st,1000,13,6500),true);})(),false);
ex('名前を変えるふりで距離を変える',await far(U[1],frec(tk.st,1000,13,7000,'なまえ')),false);
ex('だれでもランキングを読める',await req('GET','chikyu/far',null),true);
ex('hidden に書く',await req('PUT','chikyu/hidden/'+U[1],U[1],true),false);
ex('ほかのゲームの場所に書く',await req('PUT','hk/all/scores/'+U[1],U[1],{n:'x'}),false);
console.log(fail?('失敗 '+fail+' 件'):'すべて合格');
process.exit(fail?1:0);
