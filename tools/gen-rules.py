# database.rules.cb.json を作る（python3 tools/gen-rules.py）。ブースター番号ごとの決まりを1つずつ書き出す
import json
P="'chikyu/"
def clr(stage,uid): return f"root.child({P}clr/{stage}/' + {uid}).exists()"
def inv(b,uid): return f"root.child({P}inv/' + {uid} + '/b{b}').exists()"
def own(bexpr,uid):
  # 1段目はだれでも持っている。2段目以上はひとつ前のステージをクリアしたか、受け取ったか
  t=[f"({bexpr} >= 0 && {bexpr} <= 2)"]
  for b in range(3,15):
    tier=b//3+1
    t.append(f"({bexpr} === {b} && ({clr(tier-1,uid)} || {inv(b,uid)}))")
  return "("+" || ".join(t)+")"
def unlocked(sexpr,uid):
  t=[f"{sexpr} === '1'"]+[f"({sexpr} === '{s}' && {clr(s-1,uid)})" for s in range(2,6)]
  return "("+" || ".join(t)+")"
TIME="newData.child('st').val() === root.child('chikyu/runs/' + $uid + '/t').val() && now >= newData.child('st').val() + newData.child('s').val() && now <= newData.child('st').val() + newData.child('s').val() * 1.03 + 9000"
B="newData.child('b').val()"
num=lambda lo,hi:{".validate":f"newData.isNumber() && newData.val() >= {lo} && newData.val() <= {hi}"}
intb={".validate":"newData.isNumber() && newData.val() >= 0 && newData.val() <= 14 && newData.val() % 1 === 0"}
R={
 "runs":{"$uid":{".read":"auth != null && auth.uid === $uid",
   ".write":"auth != null && auth.uid === $uid && newData.exists() && (!data.exists() || now - data.child('t').val() >= 2000)",
   ".validate":"newData.hasChildren(['t'])","t":{".validate":"newData.val() === now"},"$other":{".validate":False}}},
 # ステージ1〜4を初めてクリアした記録
 "clr":{".read":True,"$stage":{"$uid":{
   ".write":f"auth != null && auth.uid === $uid && !data.exists() && newData.exists() && {TIME} && {unlocked('$stage','$uid')} && {own(B,'$uid')}",
   ".validate":"newData.hasChildren(['s','st','in','b','v','t']) && $stage.length === 1 && $stage >= '1' && $stage <= '4'",
   "s":num(50,900000),"st":{".validate":"newData.isNumber()"},
   "in":{".validate":"newData.isString() && newData.val().length >= 1 && newData.val().length <= 160000"},
   "b":intb,"v":{".validate":"newData.val() === 2"},"t":{".validate":"newData.val() === now"},"$other":{".validate":False}}}},
 # 宇宙の果てのランキング（p：距離の点）
 "far":{".read":True,".indexOn":["p"],"$uid":{
   ".write":f"auth != null && auth.uid === $uid && newData.exists() && (({TIME} && {clr(4,'$uid')} && {own(B,'$uid')} && (!data.exists() || (newData.child('st').val() > data.child('st').val() && newData.child('p').val() > data.child('p').val()))) || (data.exists() && newData.child('st').val() === data.child('st').val() && newData.child('s').val() === data.child('s').val() && newData.child('p').val() === data.child('p').val() && newData.child('b').val() === data.child('b').val() && newData.child('in').val() === data.child('in').val()))",
   ".validate":"newData.hasChildren(['n','s','p','b','st','in','v','t'])",
   "n":{".validate":"newData.isString() && newData.val().length >= 1 && newData.val().length <= 12"},
   "s":num(100,900000),"p":num(1,900000*60),"st":{".validate":"newData.isNumber()"},
   "in":{".validate":"newData.isString() && newData.val().length >= 1 && newData.val().length <= 160000"},
   "b":{".validate":"newData.isNumber() && newData.val() >= 12 && newData.val() <= 14 && newData.val() % 1 === 0"},
   "v":{".validate":"newData.val() === 2"},"t":{".validate":"newData.val() === now"},"$other":{".validate":False}}},
 # 掲示板
 "lp":{"$uid":{".write":"auth != null && auth.uid === $uid && newData.val() === now && (!data.exists() || now - data.val() >= 20000)"}},
 "gave":{"$uid":{".read":"auth != null && auth.uid === $uid","$t":{".write":"auth != null && auth.uid === $uid && !data.exists() && newData.val() === now && $t >= 't2' && $t <= 't5' && $t.length === 2"}}},
 "bbs":{".read":True,".indexOn":["t"],"$pid":{
   ".write":"auth != null && !data.exists() && newData.exists() && newData.child('u').val() === auth.uid && newData.parent().parent().child('lp/' + auth.uid).val() === now && (!newData.child('g').exists() || ("
     + own("newData.child('g').val()","auth.uid") + " && ("
     + " || ".join([f"(newData.child('g').val() >= {3*(t-1)} && newData.child('g').val() <= {3*t-1} && !root.child('chikyu/gave/' + auth.uid + '/t{t}').exists() && newData.parent().parent().child('gave/' + auth.uid + '/t{t}').exists())" for t in range(2,6)])
     + ")))",
   ".validate":"newData.hasChildren(['u','n','x','t']) && $pid.length >= 10 && $pid.length <= 30",
   "u":{".validate":"newData.isString()"},
   "n":{".validate":"newData.isString() && newData.val().length >= 1 && newData.val().length <= 12"},
   "x":{".validate":"newData.isString() && newData.val().length >= 1 && newData.val().length <= 60"},
   "t":{".validate":"newData.val() === now"},
   "g":{".validate":"newData.isNumber() && newData.val() >= 3 && newData.val() <= 14 && newData.val() % 1 === 0"},
   "$other":{".validate":False}}},
 # 受け取り（先着5人）。claim と inv を同時に書く
 "claim":{".read":True,"$pid":{"$slot":{
   ".write":"auth != null && !data.exists() && newData.val() === auth.uid && ($slot === '1' || $slot === '2' || $slot === '3' || $slot === '4' || $slot === '5')"
     + " && root.child('chikyu/bbs/' + $pid + '/g').exists() && root.child('chikyu/bbs/' + $pid + '/u').val() !== auth.uid"
     + "".join([f" && data.parent().child('{k}').val() !== auth.uid" for k in range(1,6)])
     + " && !" + own("root.child('chikyu/bbs/' + $pid + '/g').val()","auth.uid")
     + " && (" + " || ".join([f"(root.child('chikyu/bbs/' + $pid + '/g').val() === {b} && newData.parent().parent().parent().child('inv/' + auth.uid + '/b{b}/p').val() === $pid)" for b in range(3,15)]) + ")"}}},
 "inv":{".read":True,"$uid":{"$bk":{
   ".write":"auth != null && auth.uid === $uid && !data.exists() && newData.exists() && newData.parent().parent().parent().child('claim/' + newData.child('p').val() + '/' + newData.child('s').val()).val() === auth.uid"
     + " && (" + " || ".join([f"($bk === 'b{b}' && root.child('chikyu/bbs/' + newData.child('p').val() + '/g').val() === {b})" for b in range(3,15)]) + ")",
   ".validate":"newData.hasChildren(['p','s','t'])","p":{".validate":"newData.isString()"},"s":{".validate":"newData.isString()"},"t":{".validate":"newData.val() === now"},"$other":{".validate":False}}}},
 "hidden":{".read":True}
}
open('database.rules.cb.json','w').write(json.dumps(R,ensure_ascii=False,indent=2)+'\n')
print('書き出しました', len(json.dumps(R)), '文字')
