// ランキングのルールの試験（GitHub の上で Firebase の試し用データベースを立てて試す。本番のデータには触らない）
const NS='ft-green-default-rtdb',PROJ='ft-green',BASE='http://127.0.0.1:9000';
const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
const tok=uid=>b64({alg:'none',typ:'JWT'})+'.'+b64({uid,sub:uid,user_id:uid,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,aud:PROJ,iss:'https://securetoken.google.com/'+PROJ,provider_id:'anonymous',firebase:{sign_in_provider:'anonymous'}})+'.';
async function req(method,path,uid,body){const r=await fetch(BASE+'/'+path+'.json?ns='+NS+(uid?'&auth='+tok(uid):''),{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {ok:r.ok,status:r.status,j:await r.json().catch(()=>null)};}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fail=0;const ex=(name,res,want)=>{const ok=res.ok===want;console.log((ok?'OK  ':'NG  ')+name+' → '+res.status);if(!ok){fail++;console.log(JSON.stringify(res.j));}};
const TS={'.sv':'timestamp'};
const U='user1aaaaaaaaaaaaaaaaaaa',U2='user2bbbbbbbbbbbbbbbbbbb';
async function ticket(uid){const r=await req('PUT','chikyu/runs/'+uid,uid,{t:TS});const g=await req('GET','chikyu/runs/'+uid,uid);return {r,st:g.j&&g.j.t};}
const rec=(st,s,n='テスト')=>({n,s,st,in:'Y'+Math.round(s*60/1000),v:1,t:TS});

ex('ログインなしで「始めます」',await req('PUT','chikyu/runs/'+U,null,{t:TS}),false);
let tk=await ticket(U);ex('「始めます」を書く',tk.r,true);
ex('ほかの人の「始めます」を書く',await req('PUT','chikyu/runs/'+U,U2,{t:TS}),false);
ex('すぐにもう一度「始めます」',await req('PUT','chikyu/runs/'+U,U,{t:TS}),false);
await sleep(1200);
ex('実際の時間より長い記録',await req('PUT','chikyu/all/scores/'+U,U,rec(tk.st,5000)),false);
ex('始めた時刻がちがう記録',await req('PUT','chikyu/all/scores/'+U,U,rec(tk.st-5000,1000)),false);
ex('ほかの人の場所に書く',await req('PUT','chikyu/all/scores/'+U2,U,rec(tk.st,1000)),false);
ex('ふつうの記録（1秒）',await req('PUT','chikyu/all/scores/'+U,U,rec(tk.st,1000)),true);
ex('同じ回でもう一度送る',await req('PUT','chikyu/all/scores/'+U,U,rec(tk.st,1100)),false);
ex('名前だけ変える',await req('PUT','chikyu/all/scores/'+U,U,rec(tk.st,1000,'なまえ')),true);
ex('名前を変えるふりで秒数を変える',await req('PUT','chikyu/all/scores/'+U,U,rec(tk.st,1050,'なまえ')),false);
ex('13文字の名前',await req('PUT','chikyu/all/scores/'+U,U,rec(tk.st,1000,'あいうえおかきくけこさしす')),false);
await sleep(2100);
tk=await ticket(U);await sleep(700);
ex('前より悪い記録（0.5秒）',await req('PUT','chikyu/all/scores/'+U,U,rec(tk.st,500)),false);
await sleep(1000);
ex('前より良い記録（1.5秒）',await req('PUT','chikyu/all/scores/'+U,U,rec(tk.st,1500)),true);
ex('600秒をこえる記録',await req('PUT','chikyu/all/scores/'+U,U,rec(tk.st,600100)),false);
await sleep(2100);
tk=await ticket(U);await sleep(10800);
ex('死んでから時間がたちすぎた記録（10.8秒後に1秒の記録）',await req('PUT','chikyu/all/scores/'+U,U,rec(tk.st,1000)),false);
ex('だれでもランキングを読める',await req('GET','chikyu/all/scores',null),true);
ex('hidden に書く',await req('PUT','chikyu/hidden/'+U,U,true),false);
ex('ほかのゲームの場所に書く',await req('PUT','hk/all/scores/'+U,U,{n:'x'}),false);
ex('ほかの場所に書く',await req('PUT','ft_cells/1/1',U,{n:1}),false);
console.log(fail?('失敗 '+fail+' 件'):'すべて合格');
process.exit(fail?1:0);
