/** Deterministic JavaScript canvas -> FFmpeg. Requires @napi-rs/canvas.
 * Set NODE_PATH to its installed node_modules directory if it is not local.
 * Audio/timeline: build_audio.py. Output: public/media/spot-the-relationship.
 */
const {createCanvas} = require('@napi-rs/canvas');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {once} = require('node:events');
const root = __dirname;
const plan = JSON.parse(fs.readFileSync(path.join(root,'.render/timeline.json')));
const output = path.resolve(root,'../../../public/media/spot-the-relationship');
fs.mkdirSync(output,{recursive:true});
const W=1280,H=720,FPS=24;
const canvas=createCanvas(W,H),ctx=canvas.getContext('2d');
const C={bg:'#101d29',ink:'#fbf5e9',muted:'#c0ccd3',line:'#34505f',teal:'#91e2d4',gold:'#f4cb77',lilac:'#d6bbff',panel:'#1a2c3b'};
const clamp=x=>Math.min(1,Math.max(0,x));
const ease=x=>1-Math.pow(1-clamp(x),3);
function text(s,x,y,size=30,color=C.ink,font='Arial',weight='normal'){
 ctx.font=`${weight} ${size}px ${font}`;ctx.fillStyle=color;ctx.fillText(s,x,y);
}
function box(x,y,w,h,fill=C.panel,r=20){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function line(x1,y1,x2,y2,color=C.line,width=2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
function dot(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
function wrap(s,x,y,max,size=36,color=C.ink,leading=1.42){
 ctx.font=`${size}px Arial`; let row='',ys=y;
 for(const word of s.split(' ')){const n=row?row+' '+word:word;if(ctx.measureText(n).width>max&&row){text(row,x,ys,size,color);row=word;ys+=size*leading;}else row=n;}
 if(row)text(row,x,ys,size,color);return ys;
}
function pill(s,x,y,color=C.teal){ctx.font='bold 24px Arial';const w=ctx.measureText(s).width+38;box(x,y,w,44,color,22);text(s,x+19,y+30,24,C.bg,'Arial','bold');return w;}
function indicator(s,x,y,color,progress=1,size=42){ctx.font=`${size}px Arial`;const w=ctx.measureText(s).width;box(x-8,y-size+2,(w+16)*clamp(progress),size+14,color,8);text(s,x,y,size,C.bg);return w;}
function answer(type,words,x,y,color,progress=1){
 ctx.save();ctx.globalAlpha=ease(progress);ctx.translate(0,18*(1-ease(progress)));
 box(x,y,1016,94);pill(type,x+24,y+25,color);text('“'+words+'”',x+330,y+60,34,C.ink);ctx.restore();
}
function lamp(x,y,color,light=0){
 if(light>0){const g=ctx.createRadialGradient(x,y-44,0,x,y-44,145);g.addColorStop(0,`rgba(244,203,119,${.32*light})`);g.addColorStop(1,'rgba(244,203,119,0)');ctx.fillStyle=g;ctx.fillRect(x-160,y-200,320,320);}
 line(x,y,x,y+68,color,6);line(x-43,y+68,x+43,y+68,color,6);
 ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x-46,y);ctx.lineTo(x-27,y-65);ctx.lineTo(x+27,y-65);ctx.lineTo(x+46,y);ctx.closePath();ctx.fill();
}
function header(title,n){text('LSAT U  /  SPOT THE RELATIONSHIP',68,57,18,C.muted,'Arial','bold');text(title,68,129,48,C.ink,'Georgia');text(String(n).padStart(2,'0')+' / 08',1105,57,18,C.muted);}
function frame(t){
 ctx.fillStyle=C.bg;ctx.fillRect(0,0,W,H);
 // Quiet star field: stable positions, never competing with the sentence.
 for(let i=0;i<38;i++){const x=(i*317+97)%W,y=(i*193+71)%H;dot(x,y,i%4===0?1.4:.8,'#29404e');}
 let idx=plan.scenes.findIndex(s=>t<s.end+.9);if(idx<0)idx=plan.scenes.length-1;
 const s=plan.scenes[idx],u=t-s.start,p=clamp(u/(s.end-s.start));
 header(s.title,idx+1);
 const entrance=ease(u/.75);ctx.save();ctx.globalAlpha=entrance;ctx.translate(0,20*(1-entrance));
 if(s.id==='intro'){
  const centers=[[290,350,C.teal,'Conditional'],[640,350,C.gold,'Causal'],[990,350,C.lilac,'Comparative']];
  for(let i=0;i<3;i++){const [x,y,c,label]=centers[i];ctx.strokeStyle=c;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,112,86,-.25+i*.25,0,Math.PI*2);ctx.stroke();dot(x+Math.cos(t*.8+i)*112,y+Math.sin(t*.8+i)*86,6,c);dot(x,y,13,c);text(label,x-ctx.measureText(label).width/2,y+150,29,c);}
  text('Name the type. Find the words.',300,235,42,C.ink,'Georgia');
 } else if(s.id==='read'||s.id==='spot'){
  box(68,190,900,204);text('A lantern can be lit',100,263,42);text('only if',100,332,42);text('its wick is dry.',248,332,42);
  lamp(1102,333,C.gold,s.id==='spot'?0.5:0);
  if(s.id==='spot'){
   indicator('only if',100,332,C.teal,ease(u/.9));
   line(173,356,173,438,C.teal,3);dot(173,438,5,C.teal);
   pill('Conditional',100,456,C.teal);
   wrap('A dry wick is required for lighting the lantern.',100,554,1000,35,C.ink);
  }else{pill('Read the whole sentence',100,462,C.muted);}
 } else if(s.id==='answer'){
  text('Type',100,239,24,C.teal,'Arial','bold');text('Indicator words',430,239,24,C.muted,'Arial','bold');
  answer('Conditional','only if',100,274,C.teal,ease(u/.8));
  const typed='Conditional, “only if”'.slice(0,Math.floor(clamp((u-.8)/2.5)*22));
  box(100,426,1016,109,'#f4efe7');text(typed,130,493,40,'#1b1713');
  if(p>.5)text('Both parts belong in your answer.',100,594,31,C.muted);
 } else if(s.id==='cause'){
  box(68,192,1144,196);text('The room warmed',100,259,40);text('because the heater switched on.',100,326,40);
  if(p>.42)indicator('because',100,326,C.gold,ease((p-.42)*8),40);
  const q=ease((p-.18)*4);line(290,432,290+650*q,432,C.gold,3);dot(290+650*q,432,7,C.gold);
  text('Heater switches on',100,486,27,C.muted);text('Room warms',907,486,27,C.muted);
  if(p>.62)answer('Causal','because',100,528,C.gold,ease((p-.62)*8));
 } else if(s.id==='compare'){
  lamp(310,333,C.lilac,.8);lamp(970,333,C.muted,.12);text('This lamp',220,442,27,C.muted);text('That one',900,442,27,C.muted);
  text('This lamp is',430,254,34);indicator('brighter than',430,318,C.lilac,ease((p-.15)*4),42);text('that one.',430,380,34);
  if(p>.55)answer('Comparative','brighter than',100,528,C.lilac,ease((p-.55)*7));
 } else if(s.id==='mixed'){
  box(68,187,1144,157);text('If the lamp is on, the room is',100,248,37);text('brighter than the hallway.',100,308,37);
  if(p>.22)indicator('If',100,248,C.teal,ease((p-.22)*7),37);
  if(p>.49)indicator('brighter than',100,308,C.lilac,ease((p-.49)*7),37);
  if(p>.27)answer('Conditional','if',100,377,C.teal,ease((p-.27)*7));
  if(p>.54)answer('Comparative','brighter than',100,492,C.lilac,ease((p-.54)*7));
  if(p>.8)text('One sentence. Two relationship types.',100,645,30,C.muted);
 } else {
  const steps=['Read the sentence.','Name each relationship type.','Quote its indicator words.'];
  for(let i=0;i<3;i++){const a=ease((u-i*.7)/.6);ctx.save();ctx.globalAlpha=a;dot(115,240+i*95,20,[C.teal,C.gold,C.lilac][i]);text(String(i+1),108,248+i*95,23,C.bg,'Arial','bold');text(steps[i],161,252+i*95,37);ctx.restore();}
  if(p>.65){pill('Your turn',100,553,C.gold);line(275,576,382,576,C.gold,3);line(372,565,383,576,C.gold,3);line(372,587,383,576,C.gold,3);}
 }
 ctx.restore();
 // Film progress, separate from activity progress.
 line(68,692,1212,692,C.line,3);line(68,692,68+1144*clamp(t/plan.duration),692,C.teal,3);
 return canvas;
}
function stamp(t){const ms=Math.round(t*1000);return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`;}
async function main(){
 if(process.argv.includes('--stills')){
  frame(plan.scenes[2].start+2);fs.writeFileSync(path.join(output,'how-to-play-v1.webp'),canvas.toBuffer('image/webp'));
  const sheet=createCanvas(640*2,360*4),g=sheet.getContext('2d');
  for(let i=0;i<8;i++){const s=plan.scenes[i];frame(s.start+(s.end-s.start)*.75);g.drawImage(canvas,(i%2)*640,Math.floor(i/2)*360,640,360);}
  fs.writeFileSync(path.join(root,'.render/contact-sheet.jpg'),sheet.toBuffer('image/jpeg'));
  return;
 }
 const frames=path.join(root,'.render/frames');fs.mkdirSync(frames,{recursive:true});
 const total=Math.ceil(plan.duration*FPS);
 for(let f=0;f<total;f++){
  if(process.argv.includes('--encode-only'))break;
  frame(f/FPS);fs.writeFileSync(path.join(frames,String(f).padStart(5,'0')+'.jpg'),canvas.toBuffer('image/jpeg',92));
  if(f%(FPS*10)===0)console.log(`Frame ${f}/${total}`);
 }
 async function encode(args){
  console.log('FFmpeg',JSON.stringify(args));
  const ff=spawn(process.env.FFMPEG||'ffmpeg',['-nostdin','-y','-hide_banner',...args],{stdio:['ignore','inherit','inherit']});
  const timer=setTimeout(()=>ff.kill(),180000);
  try{const [code,signal]=await once(ff,'close');if(code!==0)throw new Error(`FFmpeg exited ${code} (${signal||'no signal'})`);}finally{clearTimeout(timer);}
 }
 // N-126374's default AAC coder stalls on this WAV. Fast succeeds; PNS off alone does not.
 // Encode audio separately so audio failures cannot leave a misleading video stall.
 const audio=path.join(root,'.render/narration-aac.m4a');
 await encode(['-loglevel','warning','-i',path.join(root,'.render/narration.wav'),'-vn','-c:a','aac','-aac_coder','fast','-aac_pns','0','-b:a','96k',audio]);
 await encode(['-loglevel','info','-threads','1','-filter_threads','1','-framerate',String(FPS),'-i',path.join(frames,'%05d.jpg'),'-i',audio,'-map','0:v:0','-map','1:a:0','-c:v','libx264','-threads','1','-preset','fast','-crf','22','-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart','-t',String(plan.duration),'-shortest',path.join(output,'how-to-play-v1.mp4')]);
 frame(plan.scenes[2].start+2);fs.writeFileSync(path.join(output,'how-to-play-v1.webp'),canvas.toBuffer('image/webp'));
 let vtt='WEBVTT\n\n';
 for(const s of plan.scenes){
  // Phrase-length captions keep the native track readable on a phone.
  const words=s.text.split(' '),pieces=[];for(let i=0;i<words.length;i+=11)pieces.push(words.slice(i,i+11).join(' '));
  for(let i=0;i<pieces.length;i++){const a=s.start+(s.end-s.start)*i/pieces.length,b=s.start+(s.end-s.start)*(i+1)/pieces.length;vtt+=`${stamp(a)} --> ${stamp(b)} line:90% position:50% size:90% align:center\n${pieces[i]}\n\n`;}
 }
 fs.writeFileSync(path.join(output,'how-to-play-v1.vtt'),vtt);
 const sheet=createCanvas(640*2,360*4),g=sheet.getContext('2d');
 for(let i=0;i<8;i++){const s=plan.scenes[i];frame(s.start+(s.end-s.start)*.75);g.drawImage(canvas,(i%2)*640,Math.floor(i/2)*360,640,360);}
 fs.writeFileSync(path.join(root,'.render/contact-sheet.jpg'),sheet.toBuffer('image/jpeg'));
 console.log(JSON.stringify({duration:plan.duration,frames:total,output}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
