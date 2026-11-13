'use strict';
const express=require('express');
const http=require('http');
const {Server}=require('socket.io');
const crypto=require('crypto');
const app=express(),server=http.createServer(app),io=new Server(server,{maxHttpBufferSize:100000});
app.use(express.static('public'));
app.get('/health',(req,res)=>res.json({ok:true}));
const PORT=process.env.PORT||3000;
const ROOM_CODE=(process.env.ROOM_CODE||'617CLASS').trim().toUpperCase();
const ROOM_PASSWORD=process.env.ROOM_PASSWORD||'change-me';
const TEACHER_PASSWORD=process.env.TEACHER_PASSWORD||'change-teacher-password';
const MAX_STUDENTS=17,TURN_SECONDS=80,ROUNDS=2;
const DEFAULT_WORDS='고양이,강아지,토끼,호랑이,사자,코끼리,기린,판다,펭귄,돌고래,상어,문어,거북이,나비,벌,개미,공룡,드래곤,유니콘,로봇,우주선,외계인,달,태양,별,무지개,구름,눈사람,화산,폭포,바다,산,섬,사막,학교,교실,칠판,책상,의자,연필,지우개,가방,책,시계,안경,우산,자전거,자동차,버스,기차,비행기,배,헬리콥터,신호등,축구공,농구공,야구공,트로피,왕관,보물상자,열쇠,성,기사,마법사,해적,닌자,유령,좀비,괴물,피자,햄버거,치킨,떡볶이,김밥,라면,아이스크림,케이크,도넛,초콜릿,사과,바나나,딸기,수박,포도,당근,감자,김치,컴퓨터,키보드,마우스,휴대폰,카메라,텔레비전,게임기,헤드폰,기타,피아노,드럼,바이올린,마이크,병원,소방서,경찰서,도서관,놀이터,수영장,영화관,편의점,엘리베이터,계단,침대,베개,이불,냉장고,세탁기,선풍기,에어컨,청소기,칫솔,치약,비누,수건,거울,머리빗,신발,양말,모자,장갑,목도리,가위,풀,테이프,선물,풍선,촛불,폭죽,크리스마스트리,산타클로스,눈썰매,스키,스케이트,캠핑,텐트,낚시,등산,달리기,줄넘기,숨바꼭질,술래잡기,가위바위보,태권도,축구,농구,야구,배드민턴,탁구,수영,체스,주사위,퍼즐,미로,지도,나침반,망원경,현미경,자석,로켓,인공위성,블랙홀,지구,토성,화성,공주,왕자,임금,장군,검,방패,활,화살,도깨비,구미호,인어공주,피노키오,백설공주,신데렐라,슈퍼히어로,스파이더맨,피카츄,마리오,루피,손오공'.split(',');
let words=[...DEFAULT_WORDS],players=new Map(),phase='lobby',order=[],turnIndex=-1,round=0,drawerId=null,answer='',options=[],endsAt=0,timer=null,strokes=[],guessed=new Set(),usedWords=new Set(),turnToken=0,hintTimer=null,hintIndex=-1;
const clean=s=>String(s||'').trim();
const normalize=s=>clean(s).toLocaleLowerCase('ko-KR').replace(/\s+/g,'');
const safePlayer=p=>({id:p.id,name:p.name,score:p.score,teacher:p.teacher,connected:true});
function emitState(){io.emit('state',{phase,players:[...players.values()].map(safePlayer),drawerId,round,rounds:ROUNDS,turnIndex:turnIndex+1,totalTurns:order.length,endsAt,roomCode:ROOM_CODE,guessed:[...guessed]});}
function notice(message){io.emit('notice',message)}
function stopTimer(){if(timer)clearTimeout(timer);if(hintTimer)clearTimeout(hintTimer);timer=null;hintTimer=null;turnToken++}
function studentIds(){return [...players.values()].filter(p=>!p.teacher).map(p=>p.id)}
function resetLobby(){stopTimer();phase='lobby';order=[];turnIndex=-1;round=0;drawerId=null;answer='';options=[];endsAt=0;hintIndex=-1;strokes=[];guessed.clear();usedWords.clear();emitState();io.emit('canvas-clear');}
function finishTurn(){if(phase!=='drawing'&&phase!=='choosing')return;stopTimer();phase='reveal';endsAt=Date.now()+3500;io.emit('reveal',{answer});emitState();const token=turnToken;timer=setTimeout(()=>{if(token===turnToken)nextTurn()},3500)}
function nextTurn(){stopTimer();turnIndex++;while(turnIndex<order.length&&!players.has(order[turnIndex]))turnIndex++;if(turnIndex>=order.length){phase='finished';drawerId=null;endsAt=0;io.emit('finished');emitState();return;}drawerId=order[turnIndex];round=Math.floor(turnIndex/Math.max(1,order.length/ROUNDS))+1;guessed.clear();strokes=[];answer='';hintIndex=-1;phase='choosing';endsAt=Date.now()+15000;const available=words.filter(w=>!usedWords.has(w));if(available.length<3)usedWords.clear();options=[...words.filter(w=>!usedWords.has(w))].sort(()=>Math.random()-.5).slice(0,3);io.emit('canvas-clear');notice(`${players.get(drawerId).name} 님이 단어를 선택하고 있어요.`);emitState();io.to(drawerId).emit('word-options',options);const token=turnToken;timer=setTimeout(()=>{if(token===turnToken)chooseWord(drawerId,options[0])},15000)}
function chooseWord(id,word){if(phase!=='choosing'||id!==drawerId||!options.includes(word))return;stopTimer();answer=word;usedWords.add(word);phase='drawing';endsAt=Date.now()+TURN_SECONDS*1000;io.to(drawerId).emit('your-word',answer);hintIndex=-1;io.emit('word-hint',{length:[...answer].length,index:-1,char:''});emitState();const token=turnToken;hintTimer=setTimeout(()=>{if(token!==turnToken||phase!=='drawing')return;const chars=[...answer];const positions=chars.map((c,i)=>({c,i})).filter(x=>x.c.trim());if(!positions.length)return;const chosen=positions[Math.floor(Math.random()*positions.length)];hintIndex=chosen.i;io.emit('word-hint',{length:chars.length,index:hintIndex,char:chosen.c});notice('💡 힌트! 정답의 한 글자가 공개됐어요.');},Math.floor(TURN_SECONDS*1000/2));timer=setTimeout(()=>{if(token===turnToken)finishTurn()},TURN_SECONDS*1000)}
function checkFinish(){const others=studentIds().filter(id=>id!==drawerId);if(others.length>0&&others.every(id=>guessed.has(id)))finishTurn()}
io.on('connection',socket=>{
 let lastStroke=0,lastChat=0;
 socket.on('join',(payload,ack)=>{
  const reply=typeof ack==='function'?ack:()=>{};if(players.has(socket.id))return reply({ok:false,error:'이미 접속했어요.'});
  const name=clean(payload?.name).slice(0,16),teacher=payload?.teacher===true,code=clean(payload?.code).toUpperCase(),password=String(payload?.password||'');
  if(code!==ROOM_CODE)return reply({ok:false,error:'방 코드가 달라요.'});
  if(password!==(teacher?TEACHER_PASSWORD:ROOM_PASSWORD))return reply({ok:false,error:'비밀번호가 달라요.'});
  if(!name||/[<>\u0000-\u001f]/.test(name))return reply({ok:false,error:'올바른 닉네임을 입력해 주세요.'});
  if([...players.values()].some(p=>p.name===name))return reply({ok:false,error:'이미 사용 중인 닉네임이에요.'});
  if(teacher&&[...players.values()].some(p=>p.teacher))return reply({ok:false,error:'선생님이 이미 접속 중이에요.'});
  if(!teacher&&studentIds().length>=MAX_STUDENTS)return reply({ok:false,error:'학생 정원 17명이 모두 찼어요.'});
  // Mid-game re-entry is allowed. The returning student receives a fresh identity and 0 points.
  // Duplicate names are rejected while the previous connection remains active.
  players.set(socket.id,{id:socket.id,name,teacher,score:0});socket.data.joined=true;reply({ok:true,id:socket.id,teacher,roomCode:ROOM_CODE});emitState();notice(`${name} 님이 ${phase==='lobby'?'입장':'0점으로 재입장'}했어요.`);
  if(strokes.length)socket.emit('canvas-sync',strokes);if(phase==='choosing'&&socket.id===drawerId)socket.emit('word-options',options);if(phase==='drawing'){const chars=[...answer];socket.emit('word-hint',{length:chars.length,index:hintIndex,char:hintIndex>=0?chars[hintIndex]:''});if(socket.id===drawerId)socket.emit('your-word',answer);}
 });
 socket.on('start',()=>{if(!players.get(socket.id)?.teacher||phase!=='lobby')return;const ids=studentIds();if(ids.length<2)return socket.emit('notice','학생이 최소 2명 있어야 시작할 수 있어요.');for(const p of players.values())p.score=0;order=Array.from({length:ROUNDS},()=>[...ids].sort(()=>Math.random()-.5)).flat();turnIndex=-1;usedWords.clear();nextTurn()});
 socket.on('choose-word',word=>chooseWord(socket.id,String(word||'')));
 socket.on('stroke',data=>{if(phase!=='drawing'||socket.id!==drawerId)return;if(!data||!['line','dot'].includes(data.type))return;const nums=[data.x,data.y,data.px,data.py,data.size];if(nums.some(v=>typeof v!=='number'||!Number.isFinite(v)))return;if([data.x,data.y,data.px,data.py].some(v=>v<0||v>1)||data.size<1||data.size>35)return;if(!/^#[0-9a-fA-F]{6}$/.test(data.color))return;const s={type:data.type,x:data.x,y:data.y,px:data.px,py:data.py,size:data.size,color:data.color};strokes.push(s);if(strokes.length>15000)strokes.shift();socket.broadcast.emit('stroke',s)});
 socket.on('clear',()=>{if(phase!=='drawing'||socket.id!==drawerId)return;strokes=[];io.emit('canvas-clear')});
 socket.on('chat',value=>{const p=players.get(socket.id);if(!p)return;if(Date.now()-lastChat<350)return;lastChat=Date.now();const message=clean(value).slice(0,80);if(!message)return;if(phase==='drawing'&&!p.teacher&&socket.id!==drawerId&&!guessed.has(socket.id)&&normalize(message)===normalize(answer)){guessed.add(socket.id);const remaining=Math.max(0,endsAt-Date.now());const points=100+Math.floor(remaining/1000)*3;p.score+=points;const drawer=players.get(drawerId);if(drawer)drawer.score+=30;io.emit('correct',{name:p.name,points,playerId:socket.id});emitState();checkFinish();return;}if(phase==='drawing'&&socket.id===drawerId)return;if(phase==='drawing'&&guessed.has(socket.id))return;io.emit('chat',{name:p.name,message,teacher:p.teacher})});
 socket.on('next',()=>{if(players.get(socket.id)?.teacher&&(phase==='drawing'||phase==='choosing'))finishTurn()});
 socket.on('reset',()=>{if(players.get(socket.id)?.teacher)resetLobby()});
 socket.on('set-words',(value,ack)=>{const reply=typeof ack==='function'?ack:()=>{};if(!players.get(socket.id)?.teacher)return reply({ok:false,error:'교사만 변경할 수 있어요.'});if(phase!=='lobby')return reply({ok:false,error:'대기실에서만 변경할 수 있어요.'});const list=[...new Set(String(value||'').split(/[,\n]/).map(clean).filter(w=>w.length>=2&&w.length<=20))].slice(0,500);if(list.length<3)return reply({ok:false,error:'단어를 3개 이상 입력해 주세요.'});words=list;reply({ok:true,count:words.length});notice(`단어 ${words.length}개가 등록됐어요.`)});
 socket.on('disconnect',()=>{const p=players.get(socket.id);if(!p)return;players.delete(socket.id);notice(`${p.name} 님이 나갔어요.`);if(socket.id===drawerId&&(phase==='drawing'||phase==='choosing'))finishTurn();else if(phase==='drawing')checkFinish();emitState()});
});
server.listen(PORT,()=>console.log(`Class Draw listening on ${PORT}`));
