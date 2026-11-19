/* pin-engine.js: drawing code shared by the browser editor (public/index.html)
   and the Netlify function (netlify/functions/render-pin.mjs). It only needs a
   Canvas 2D context, so the same pin looks the same in both places. */
const PinEngine=(()=>{
const W={"Poppins":800,"Montserrat":800,"Oswald":700,"Bebas Neue":400,"Anton":400,"Playfair Display":800,"Abril Fatface":400,"Lora":700,"Pacifico":400,"Dancing Script":700,"Lobster":400,"Caveat":700,"Permanent Marker":400,"Fredoka":600,"Bangers":400,"Righteous":400};
const FONTS=Object.keys(W),fw=(f,s)=>`${W[f]||700} ${s}px "${f}", sans-serif`;
const CONTENT=["title","hl","hl2","sub","shl","btn","badge"];
/* every setting and its default */
const BASE={
 title:"Study Smarter, Not Harder",hl:"Smarter",hl2:"",sub:"Tips for a successful exam",shl:"",btn:"READ BELOW",badge:"",
 tOn:true,sOn:true,bgOn:true,btnOn:true,boxOn:true,lineOn:false,borderOn:false,ovOn:true,pfOn:false,
 caps:false,f1:"Poppins",f2:"Dancing Script",f3:"",tsize:90,ssize:50,
 tB:false,tI:false,sB:false,sI:false,bB:false,bI:false,nB:false,nI:false,
 outOn:false,ocol:"#000000",owid:6,shOn:false,
 tcol:"#ffffff",hcol:"#ffd54a",h2col:"#ff5a4d",scol:"#ffffff",shcol:"#ffd54a",
 zoom:100,ov:30,pfc:"#ffffff",pfw:12,
 box:"#1b1b1b",boxop:70,boxr:0,linec:"#ffffff",linew:5,lgap:16,
 bcol:"#ffffff",bwid:6,bgap:45,bstyle:"solid",brad:0,
 bdst:"circle",bds:90,bdc:"#111111",bdt:"#ffffff",bdw:8,bdr:"#ffffff",
 bshape:"pill",bpos:"center",bbg:"#ffd54a",btc:"#1a1a1a",
 grad:true,c1:"#f6e1da",c2:"#f1c9bd",ang:135
};
const RANGE={zoom:[100,250],ov:[0,80],pfw:[0,60],tsize:[30,200],ssize:[20,120],owid:[0,30],boxop:[0,100],boxr:[0,120],linew:[0,40],lgap:[-30,60],bwid:[0,60],bgap:[0,150],brad:[0,150],bds:[40,220],bdw:[0,30],ang:[0,360]};
const OPTS={bstyle:["solid","double","dashed"],bdst:["circle","plain"],bshape:["pill","rounded","square","arrow"],bpos:["left","center","right"]};
const COLOR=new Set(Object.keys(BASE).filter(k=>typeof BASE[k]==="string"&&BASE[k][0]==="#"));
const STYLE=Object.keys(BASE).filter(k=>!CONTENT.includes(k)&&k!=="zoom");

/* the templates: `style` overrides BASE, `sample` is the example text the editor shows,
   `api` are defaults used when the function is called without that field */
const TPL=[
{name:"Dark Box",style:{tcol:"#ffffff",hcol:"#f4a97a",scol:"#e8e8e8",box:"#111111",boxop:72,ov:20,f1:"Poppins",f2:"Poppins",tsize:80,ssize:44,boxr:24}},
{name:"Bold Headline",style:{tcol:"#ffffff",hcol:"#ffd54a",scol:"#ffffff",ov:40,caps:true,f1:"Poppins",f2:"Poppins",shOn:true,borderOn:true,bcol:"#ffffff",bwid:5,bgap:45,tsize:110,ssize:50,boxOn:false}},
{name:"Pastel + Photo",style:{tcol:"#111111",hcol:"#f44336",scol:"#111111",caps:true,f1:"Oswald",f2:"Dancing Script",tsize:100,ssize:64,boxOn:false}},
{name:"Pink Banner",style:{tcol:"#111111",hcol:"#c2185b",scol:"#ffffff",box:"#ecb7a6",boxop:100,ov:15,caps:true,f1:"Abril Fatface",f2:"Lobster",outOn:true,ocol:"#000000",owid:6,tsize:80,ssize:64,borderOn:true,bcol:"#111111",bwid:28,bgap:50,lineOn:true,linec:"#ffffff",linew:14,lgap:-7},sample:{badge:"3"}},
{name:"Split Stack",style:{tcol:"#111111",hcol:"#d81b60",scol:"#111111",box:"#fff3b0",boxop:100,f1:"Fredoka",f2:"Fredoka",tsize:84,ssize:50,lineOn:true,linec:"#000000",linew:22,lgap:0}},
{name:"Photo Collage",style:{tcol:"#ffffff",hcol:"#ff8a3d",scol:"#ffffff",box:"#4a4a4a",boxop:92,f1:"Playfair Display",f2:"Playfair Display",tsize:76,ssize:46},sample:{badge:"23"}},
{name:"Green Frame Ad",style:{tcol:"#111111",hcol:"#c2185b",scol:"#111111",c1:"#d4ecd5",c2:"#b7ddb9",f1:"Permanent Marker",f2:"Caveat",outOn:true,ocol:"#ffffff",tsize:84,ssize:72,borderOn:true,bcol:"#111111",bwid:10,bgap:25,bbg:"#1b5e20",btc:"#ffffff",boxOn:false}},
{name:"White Card",style:{tcol:"#111111",hcol:"#c2185b",scol:"#111111",box:"#ffffff",boxop:92,ov:10,caps:true,f1:"Montserrat",f2:"Poppins",tsize:78,ssize:36}},
{name:"Top Fade",style:{tcol:"#ffffff",hcol:"#ffd54a",scol:"#ffffff",box:"#000000",boxop:85,ov:10,caps:true,f1:"Anton",f2:"Caveat",shOn:true,tsize:120,ssize:70}},
{name:"Bottom Panel",style:{tcol:"#111111",hcol:"#e91e63",scol:"#444444",box:"#fff6e0",boxop:100,ovOn:false,f1:"Lora",f2:"Caveat",tsize:76,ssize:60,boxr:60}},
{name:"Number Box",style:{tcol:"#ffffff",hcol:"#ffd54a",scol:"#ffffff",box:"#222222",boxop:68,ov:15,f1:"Poppins",f2:"Playfair Display",tsize:84,ssize:50,bdt:"#ffd54a",lineOn:true,linec:"#ffffff",linew:5,lgap:16},sample:{badge:"20"}},
{name:"Circle Photo",style:{tcol:"#111111",hcol:"#f44336",scol:"#111111",c1:"#ffe5ec",c2:"#ffc2d4",caps:true,f1:"Bebas Neue",f2:"Pacifico",tsize:130,ssize:56,pfOn:true,pfc:"#ffffff",pfw:16,boxOn:false}},
/* your three pins */
{name:"Teal Photo Frame",style:{grad:false,c1:"#009688",tcol:"#000000",scol:"#000000",shcol:"#ffffff",f1:"Fredoka",f2:"Fredoka",f3:"Abril Fatface",tsize:84,ssize:66,pfOn:true,pfc:"#000000",pfw:12,bdc:"#000000",bdt:"#ffffff",bdw:0,boxOn:false,ovOn:false},
 sample:{title:"Struggling as a new mom?",hl:"",sub:"Topnotch|Parenting Advice|for you",shl:"Parenting Advice",btn:"",badge:"3"}},
{name:"Dark Frame Number",style:{ovOn:false,box:"#000000",boxop:62,lineOn:true,linec:"#ffffff",linew:6,lgap:0,borderOn:true,bcol:"#ffffff",bwid:8,bgap:78,bstyle:"double",brad:12,tcol:"#e6e6e6",scol:"#ffffff",shcol:"#ff5a4d",f1:"Poppins",f2:"Poppins",f3:"Abril Fatface",tsize:88,ssize:72,bdst:"plain",bdt:"#f44336"},
 sample:{title:"New to Parenting?",hl:"",sub:"Simple Advice for|new moms",shl:"new moms",btn:"",badge:"3"}},
{name:"Study Guide Box",style:{ovOn:false,box:"#000000",boxop:62,lineOn:true,linec:"#ffffff",linew:4,lgap:20,tcol:"#ffffff",hcol:"#ee4035",f1:"Fredoka",f2:"Fredoka",tsize:84,ssize:50,bshape:"arrow",bpos:"right",bbg:"#e9503f",btc:"#ffffff"},
 sample:{title:"A Simple Class 10|Study Guide|For|CBSE Maths|Preparation",hl:"Class 10 CBSE Maths",sub:"",btn:"Swipe for|more",badge:""},api:{btn:"Swipe for|more"}}
];
TPL.forEach(t=>t.id=t.name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""));
const styleOf=i=>{const o={};STYLE.forEach(k=>o[k]=BASE[k]);return Object.assign(o,TPL[i].style)};
const sampleOf=(i,k)=>TPL[i].sample&&k in TPL[i].sample?TPL[i].sample[k]:BASE[k];

/* ---------- drawing helpers ---------- */
let IM=[];
const E={L:[],h:0,size:0,f:"",lh:0,sp:0};
const hb=s=>s.btnOn&&s.btn;
const normHex=h=>/^#[0-9a-f]{3}$/i.test(h)?"#"+[...h.slice(1)].map(c=>c+c).join(""):h;
const hexA=(h,a)=>{h=normHex(h);return`rgba(${parseInt(h.slice(1,3),16)},${parseInt(h.slice(3,5),16)},${parseInt(h.slice(5,7),16)},${a})`};
function rr(g,x,y,w,h,r){g.beginPath();r>0&&g.roundRect?g.roundRect(x,y,w,h,r):g.rect(x,y,w,h)}
function bgFill(g,s,x,y,w,h){if(s.grad){const a=s.ang*Math.PI/180,cx=x+w/2,cy=y+h/2,d=Math.hypot(w,h)/2,dx=Math.cos(a)*d,dy=Math.sin(a)*d,gr=g.createLinearGradient(cx-dx,cy-dy,cx+dx,cy+dy);gr.addColorStop(0,s.c1);gr.addColorStop(1,s.c2);g.fillStyle=gr}else g.fillStyle=s.c1;g.fillRect(x,y,w,h)}
function ph(g,s,i,x,y,w,h){const im=IM.length?IM[i%IM.length]:null;g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
 if(im){const k=Math.max(w/im.width,h/im.height)*s.zoom/100,dw=im.width*k,dh=im.height*k;g.drawImage(im,x+(w-dw)/2,y+(h-dh)/2,dw,dh)}
 else{const gr=g.createLinearGradient(x,y,x+w,y+h);gr.addColorStop(0,"#8fa3bd");gr.addColorStop(1,"#4e5f78");g.fillStyle=gr;g.fillRect(x,y,w,h);if(s._ph){g.fillStyle="rgba(255,255,255,.75)";g.font="600 44px sans-serif";g.textAlign="center";g.fillText("Add your photo",x+w/2,y+h/2);g.textAlign="left"}}
 g.restore()}
function pf(g,s,i,x,y,w,h){if(s.pfOn&&s.pfw>0){g.fillStyle=s.pfc;g.fillRect(x-s.pfw,y-s.pfw,w+2*s.pfw,h+2*s.pfw)}ph(g,s,i,x,y,w,h)}
const shade=(g,s,x,y,w,h)=>{if(s.ovOn&&s.ov>0){g.fillStyle=`rgba(0,0,0,${s.ov/100})`;g.fillRect(x,y,w,h)}};
function bfill(g,s,x,y,w,h){if(!s.boxOn)return;g.save();g.globalAlpha=s.boxop/100;g.fillStyle=s.box;rr(g,x,y,w,h,s.boxr);g.fill();g.restore()}
function bline(g,s,x,y,w,h){if(!s.lineOn||s.linew<=0)return;const d=s.lgap;g.save();g.strokeStyle=s.linec;g.lineWidth=s.linew;g.lineJoin="miter";rr(g,x+d,y+d,w-2*d,h-2*d,Math.max(0,s.boxr-d));g.stroke();g.restore()}
const box=(g,s,x,y,w,h)=>{bfill(g,s,x,y,w,h);bline(g,s,x,y,w,h)};
function band(g,s,x,y,w,h){if(!s.boxOn)return;g.save();g.globalAlpha=s.boxop/100;g.fillStyle=s.box;g.fillRect(x,y,w,h);g.restore()}
function pb(g,s){if(!s.borderOn||s.bwid<=0)return;const d=s.bgap,w=1000-2*d,h=1500-2*d,one=(o,lw)=>{g.lineWidth=lw;rr(g,d+o,d+o,w-2*o,h-2*o,Math.max(0,s.brad-o));g.stroke()};
 g.save();g.strokeStyle=s.bcol;g.lineJoin="miter";if(s.bstyle==="dashed")g.setLineDash([s.bwid*3,s.bwid*2]);one(0,s.bwid);
 if(s.bstyle==="double"){g.setLineDash([]);one(s.bwid*2.2,Math.max(1.5,s.bwid/2.5))}g.restore()}

/* ---------- text: **bold**, *italic*, | = new line ---------- */
function parse(t){const out=[[]];let b=0,i=0,cur="",cb=0,ci=0;const fl=()=>{if(cur){out[out.length-1].push({w:cur,b:cb,i:ci});cur=""}};
 for(let k=0;k<t.length;k++){const c=t[k];
  if(c==="*"){if(t[k+1]==="*"){b^=1;k++}else i^=1;continue}
  if(c==="|"||c==="\n"){fl();out.push([]);continue}
  if(/\s/.test(c)){fl();continue}
  if(!cur){cb=b;ci=i}cur+=c}
 fl();return out}
function lay(g,t,size,f,maxW,h1,h2,B,I){g.font=fw(f,size);
 const set=x=>new Set(String(x||"").toLowerCase().split(/[\s,]+/).map(v=>v.replace(/[^\w']/g,"")).filter(Boolean)),a=set(h1),b=set(h2),sp=g.measureText(" ").width,L=[];
 parse(String(t)).forEach(par=>{let cur=[],cw=0;
  par.forEach(o=>{o.ww=g.measureText(o.w).width+((B||o.b)?size*.045:0);const k=o.w.toLowerCase().replace(/[^\w']/g,"");o.c=a.has(k)?1:b.has(k)?2:0;
   if(cur.length&&cw+sp+o.ww>maxW){L.push({a:cur,w:cw});cur=[];cw=0}cw+=(cur.length?sp:0)+o.ww;cur.push(o)});
  L.push({a:cur,w:cw})});
 return{L,size,f,sp,lh:size*1.2,h:L.length*size*1.2,B,I}}
/* draws one word: italic = slant, bold = extra stroke, plus optional outline / shadow */
function word(g,s,o,x,y,B,col,fx){g.save();g.font=fw(B.f,B.size);g.textAlign="left";g.lineJoin="round";g.miterLimit=2;g.translate(x,y);
 if((B.I||o.i))g.transform(1,0,-.2,1,0,0);
 let sh=fx&&s.shOn;const on=()=>{g.shadowColor="rgba(0,0,0,.65)";g.shadowBlur=B.size*.18;g.shadowOffsetY=B.size*.06},off=()=>{g.shadowColor="rgba(0,0,0,0)";g.shadowBlur=0;g.shadowOffsetY=0};
 if(fx&&s.outOn&&s.owid>0){if(sh)on();g.lineWidth=s.owid*2;g.strokeStyle=s.ocol;g.strokeText(o.w,0,0);off();sh=false}
 if(sh)on();g.fillStyle=col;g.fillText(o.w,0,0);off();
 if(B.B||o.b){g.lineWidth=B.size*.045;g.strokeStyle=col;g.strokeText(o.w,0,0)}
 g.restore()}
function dr(g,s,B,cx,top,base,c1,c2){B.L.forEach((ln,i)=>{let x=cx-ln.w/2;const y=top+i*B.lh+B.lh*.82;
 ln.a.forEach(o=>{word(g,s,o,x,y,B,o.c===1?c1:o.c===2?c2:base,true);x+=o.ww+B.sp})})}
const dT=(g,s,B,cx,top)=>dr(g,s,B,cx,top,s.tcol,s.hcol,s.h2col),dS=(g,s,B,cx,top)=>dr(g,s,B,cx,top,s.scol,s.shcol,s.shcol);
function blocks(g,s,maxW,subW){return[s.tOn&&s.title?lay(g,s.caps?s.title.toUpperCase():s.title,s.tsize,s.f1,maxW,s.hl,s.hl2,s.tB,s.tI):E,s.sOn&&s.sub?lay(g,s.sub,s.ssize,s.f2,subW||maxW,s.shl,"",s.sB,s.sI):E]}
const gp=(t,u,gap)=>t.h&&u.h?gap:0,bh=(t,u,gap)=>t.h+u.h+gp(t,u,gap);
const put=(g,s,t,u,cx,top,gap)=>{dT(g,s,t,cx,top);dS(g,s,u,cx,top+t.h+gp(t,u,gap))};
/* optional box behind a block of text (for designs that don't have a built-in box) */
function tbx(g,s,t,u,cx,top,gap,px,py){if(!s.boxOn&&!s.lineOn)return;const w=Math.max(0,...t.L.map(l=>l.w),...u.L.map(l=>l.w))+px*2;if(bh(t,u,gap)>0)box(g,s,cx-w/2,top-py,w,bh(t,u,gap)+py*2)}
function badge(g,s,cx,cy,r){if(!s.bgOn||!s.badge)return;const R=r*s.bds/90,plain=s.bdst==="plain",fs=plain?R*2.3:R*1.1,f=s.f3||s.f1;g.save();
 if(!plain){g.beginPath();g.arc(cx,cy,R,0,7);g.fillStyle=s.bdc;g.fill();if(s.bdw>0){g.lineWidth=s.bdw;g.strokeStyle=s.bdr;g.stroke()}}
 g.font=fw(f,fs);const w=g.measureText(s.badge).width;word(g,s,{w:String(s.badge)},cx-w/2,cy+fs*.345,{size:fs,f,B:s.nB,I:s.nI},s.bdt,false);g.restore()}
function btn(g,s,y){if(!hb(s))return;const ls=String(s.btn).split(/\||\n/),n=ls.length,sz=n>1?40:44,f=s.f1,ar=s.bshape==="arrow";g.save();g.font=fw(f,sz);
 const tw=Math.max(...ls.map(l=>g.measureText(l).width)),w=tw+(ar?150:120),h=n>1?n*sz*1.2+36:110,x=s.bpos==="left"?70:s.bpos==="right"?930-w:500-w/2;
 g.shadowColor="rgba(0,0,0,.3)";g.shadowBlur=18;g.shadowOffsetY=6;g.fillStyle=s.bbg;
 if(ar){const k=Math.min(48,h/2);g.beginPath();g.moveTo(x,y);g.lineTo(x+w-k,y);g.lineTo(x+w,y+h/2);g.lineTo(x+w-k,y+h);g.lineTo(x,y+h);g.closePath()}else rr(g,x,y,w,h,s.bshape==="pill"?h/2:s.bshape==="rounded"?22:0);
 g.fill();g.restore();
 const cx=x+(ar?(w-24)/2:w/2),top=y+(h-n*sz*1.2)/2;
 ls.forEach((l,i)=>{g.font=fw(f,sz);const lw=g.measureText(l).width;word(g,s,{w:l},cx-lw/2,top+i*sz*1.2+sz*1.2*.82,{size:sz,f,B:s.bB,I:s.bI},s.btc,false)})}

/* ---------- the designs ---------- */
const DRAW=[
/*1 Dark Box*/(g,s)=>{ph(g,s,0,0,0,1000,1500);shade(g,s,0,0,1000,1500);pb(g,s);const[t,u]=blocks(g,s,760),h=bh(t,u,30)+120,y=(hb(s)?640:720)-h/2;box(g,s,60,y,880,h);put(g,s,t,u,500,y+60,30);badge(g,s,500,y,90);btn(g,s,1300)},
/*2 Bold Headline*/(g,s)=>{ph(g,s,0,0,0,1000,1500);shade(g,s,0,0,1000,1500);pb(g,s);const[t,u]=blocks(g,s,800),y=(hb(s)?640:720)-bh(t,u,50)/2;tbx(g,s,t,u,500,y,50,50,40);put(g,s,t,u,500,y,50);badge(g,s,500,200,100);btn(g,s,1290)},
/*3 Pastel + Photo*/(g,s)=>{bgFill(g,s,0,0,1000,1500);pb(g,s);const[t,u]=blocks(g,s,860),py=110+t.h+50;tbx(g,s,t,E,500,110,0,40,24);dT(g,s,t,500,110);pf(g,s,0,50,py,900,1130-py);dS(g,s,u,500,1160);badge(g,s,500,py,90);btn(g,s,1330)},
/*4 Pink Banner*/(g,s)=>{ph(g,s,0,0,0,1000,1500);shade(g,s,0,0,1000,1500);pb(g,s);const[t,u]=blocks(g,s,740),h=t.h+90,y=s.badge&&s.bgOn?560:480;box(g,s,94,y,812,h);dT(g,s,t,500,y+45);dS(g,s,u,500,y+h+50);badge(g,s,500,300,115);btn(g,s,1290)},
/*5 Split Stack*/(g,s)=>{ph(g,s,0,0,0,1000,560);ph(g,s,1,0,960,1000,540);bgFill(g,s,0,560,1000,400);band(g,s,0,560,1000,400);
 if(s.lineOn&&s.linew>0){g.fillStyle=s.linec;g.fillRect(0,560,1000,s.linew);g.fillRect(0,960-s.linew,1000,s.linew)}pb(g,s);const[t,u]=blocks(g,s,860);put(g,s,t,u,500,760-bh(t,u,24)/2,24);badge(g,s,500,560,80);btn(g,s,1300)},
/*6 Photo Collage*/(g,s)=>{bgFill(g,s,0,0,1000,1500);[[0,0],[505,0],[0,760],[505,760]].forEach(([x,y],i)=>ph(g,s,i,x,y,495,740));band(g,s,0,540,1000,420);bline(g,s,0,540,1000,420);pb(g,s);const[t,u]=blocks(g,s,860);put(g,s,t,u,500,750-bh(t,u,24)/2,24);badge(g,s,500,540,95);btn(g,s,1330)},
/*7 Green Frame Ad*/(g,s)=>{bgFill(g,s,0,0,1000,1500);pb(g,s);const[t,u]=blocks(g,s,860),py=70+bh(t,u,10)+40;tbx(g,s,t,u,500,70,10,40,24);put(g,s,t,u,500,70,10);g.save();g.shadowColor="rgba(0,0,0,.3)";g.shadowBlur=24;g.fillStyle="#fff";g.fillRect(190,py,620,1230-py);g.restore();pf(g,s,0,190,py,620,1230-py);badge(g,s,190,py,80);btn(g,s,1270)},
/*8 White Card*/(g,s)=>{ph(g,s,0,0,0,1000,1500);shade(g,s,0,0,1000,1500);pb(g,s);const[t,u]=blocks(g,s,700),h=70+bh(t,u,30)+70,y=(hb(s)?620:700)-h/2;box(g,s,90,y,820,h);put(g,s,t,u,500,y+70,30);badge(g,s,500,y,85);btn(g,s,1300)},
/*9 Top Fade*/(g,s)=>{ph(g,s,0,0,0,1000,1500);shade(g,s,0,0,1000,1500);pb(g,s);if(s.boxOn){const f=g.createLinearGradient(0,0,0,950);f.addColorStop(0,hexA(s.box,s.boxop/100));f.addColorStop(1,hexA(s.box,0));g.fillStyle=f;g.fillRect(0,0,1000,950)}
 const[t,u]=blocks(g,s,860);put(g,s,t,u,500,90,20);badge(g,s,500,bh(t,u,20)+230,85);btn(g,s,1300)},
/*10 Bottom Panel*/(g,s)=>{bgFill(g,s,0,0,1000,1500);ph(g,s,0,0,0,1000,980);shade(g,s,0,0,1000,980);pb(g,s);bfill(g,s,0,900,1000,700);bline(g,s,0,900,1000,600);const[t,u]=blocks(g,s,840);put(g,s,t,u,500,980,20);badge(g,s,500,900,85);btn(g,s,1330)},
/*11 Number Box*/(g,s)=>{ph(g,s,0,0,0,1000,1500);shade(g,s,0,0,1000,1500);pb(g,s);const[t,u]=blocks(g,s,660),nOn=s.bgOn&&s.badge,n=nOn?260:0,h=70+n+bh(t,u,30)+70,y=(hb(s)?640:720)-h/2;box(g,s,110,y,780,h);
 if(nOn){const f=s.f3||s.f1;g.font=fw(f,220);const w=g.measureText(s.badge).width;word(g,s,{w:String(s.badge)},500-w/2,y+260,{size:220,f,B:s.nB,I:s.nI},s.bdt,false)}put(g,s,t,u,500,y+70+n,30);btn(g,s,1300)},
/*12 Circle Photo*/(g,s)=>{bgFill(g,s,0,0,1000,1500);pb(g,s);const[t,u]=blocks(g,s,860),cy=110+t.h+60+340;tbx(g,s,t,E,500,110,0,40,24);dT(g,s,t,500,110);g.save();g.beginPath();g.arc(500,cy,340,0,7);g.clip();ph(g,s,0,160,cy-340,680,680);g.restore();
 if(s.pfOn&&s.pfw>0){g.beginPath();g.arc(500,cy,340,0,7);g.lineWidth=s.pfw;g.strokeStyle=s.pfc;g.stroke()}dS(g,s,u,500,cy+340+50);badge(g,s,820,cy-250,90);btn(g,s,1330)},
/*13 Teal Photo Frame (your pin 1)*/(g,s)=>{g.fillStyle="#fff";g.fillRect(0,0,1000,1500);bgFill(g,s,28,25,944,1450);pb(g,s);const[t,u]=blocks(g,s,880,800),py=Math.max(120,32+t.h+24);tbx(g,s,t,E,500,32,0,40,16);dT(g,s,t,500,32);
 pf(g,s,0,64,py,872,1118-py);badge(g,s,500,1118,110);dS(g,s,u,500,1215);btn(g,s,1370)},
/*14 Dark Frame Number (your pin 2)*/(g,s)=>{ph(g,s,0,0,0,1000,1500);const d=s.bgap+(s.borderOn?s.bwid*(s.bstyle==="double"?4:2):0)+6;shade(g,s,d,d,1000-2*d,1500-2*d);bfill(g,s,d,d,1000-2*d,1500-2*d);pb(g,s);
 const[t,u]=blocks(g,s,780,720);dT(g,s,t,500,134);badge(g,s,500,835,100);bline(g,s,d+8,938,1000-2*(d+8),234);dS(g,s,u,500,1055-u.h/2);btn(g,s,1330)},
/*15 Study Guide Box (your pin 3)*/(g,s)=>{ph(g,s,0,0,0,1000,1500);shade(g,s,0,0,1000,1500);pb(g,s);box(g,s,48,50,884,886);const[t,u]=blocks(g,s,780),h=bh(t,u,30);put(g,s,t,u,490,50+(886-h)/2-15,30);badge(g,s,500,990,90);btn(g,s,1285)}
];
function draw(g,s,imgs,k,i){IM=imgs||[];g.save();g.setTransform(k,0,0,k,0,0);g.beginPath();g.rect(0,0,1000,1500);g.clip();g.fillStyle="#fff";g.fillRect(0,0,1000,1500);g.textBaseline="alphabetic";g.textAlign="left";DRAW[i](g,s);g.restore()}

/* ---------- used by the function: pick a template, check and merge options ---------- */
function resolveTemplate(t){if(t==null||t==="")return 0;const n=Number(t);if(Number.isInteger(n))return n>=1&&n<=TPL.length?n-1:-1;
 const q=String(t).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");return TPL.findIndex(x=>x.id===q)}
function sanitize(opts){const out={},bad=[];
 for(const[k,v]of Object.entries(opts||{})){if(!(k in BASE)){bad.push(k);continue}const d=BASE[k];let val;
  if(typeof d==="boolean")val=[true,"true",1,"1"].includes(v)?true:[false,"false",0,"0"].includes(v)?false:undefined;
  else if(typeof d==="number"){val=Number(v);val=Number.isFinite(val)?(RANGE[k]?Math.min(RANGE[k][1],Math.max(RANGE[k][0],val)):val):undefined}
  else{val=String(v).slice(0,600);if(COLOR.has(k)){val=/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(val)?normHex(val):undefined}
   else if(["f1","f2","f3"].includes(k)){if(val&&!W[val])val=undefined}else if(OPTS[k]&&!OPTS[k].includes(val))val=undefined}
  if(val===undefined)bad.push(k);else out[k]=val}
 return{out,bad}}
/* settings for one API request: template look + your text + any option overrides */
function build(i,content,options){const s=Object.assign({},BASE,styleOf(i),{title:"",hl:"",hl2:"",sub:"",shl:"",btn:"",badge:""},TPL[i].api||{},content||{});
 const{out,bad}=sanitize(options);Object.assign(s,out);return{s,bad}}

return{W,FONTS,fw,BASE,CONTENT,STYLE,RANGE,OPTS,COLOR,TPL,styleOf,sampleOf,draw,resolveTemplate,sanitize,build};
})();
if(typeof module!=="undefined"&&module.exports)module.exports=PinEngine;else window.PinEngine=PinEngine;
