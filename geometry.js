/* BNIGHT geometry engine v2. Original implementation; MIT license, see LICENSE-BNIGHT.txt. */
(function(root){
'use strict';
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]], sub=(a,b)=>[a[0]-b[0],a[1]-b[1]], mul=(a,s)=>[a[0]*s,a[1]*s];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1], norm=a=>Math.hypot(...a), unit=a=>mul(a,1/(norm(a)||1));
const dist=(a,b)=>norm(sub(a,b)), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angle=(a,b)=>Math.acos(clamp(dot(unit(a),unit(b)),-1,1))*180/Math.PI;
function area(p){let a=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];a+=p[i][0]*q[1]-q[0]*p[i][1];}return a/2;}
function marching(field,w,h){
  const nodes=new Map(),nh=(w-1)*h;
  const at=(edge,x,y,v)=>{
    let id,a,b,pa,pb;
    if(edge===0){id=y*(w-1)+x;a=v[0];b=v[1];pa=[x,y];pb=[x+1,y];}
    else if(edge===1){id=nh+y*w+x+1;a=v[1];b=v[2];pa=[x+1,y];pb=[x+1,y+1];}
    else if(edge===2){id=(y+1)*(w-1)+x;a=v[3];b=v[2];pa=[x,y+1];pb=[x+1,y+1];}
    else{id=nh+y*w+x;a=v[0];b=v[3];pa=[x,y];pb=[x,y+1];}
    if(!nodes.has(id)){const t=clamp((.5-a)/(b-a),0,1);nodes.set(id,{p:[pa[0]+t*(pb[0]-pa[0])-.5,pa[1]+t*(pb[1]-pa[1])-.5],links:[],seen:false});}return id;
  };
  const table={1:[[3,0]],2:[[0,1]],3:[[3,1]],4:[[1,2]],6:[[0,2]],7:[[3,2]],8:[[2,3]],9:[[2,0]],11:[[2,1]],12:[[1,3]],13:[[1,0]],14:[[0,3]]};
  for(let y=0;y<h-1;y++)for(let x=0;x<w-1;x++){
    const i=y*w+x,v=[field[i],field[i+1],field[i+w+1],field[i+w]];
    const code=v.reduce((s,n,k)=>s+(n>=.5?(1<<k):0),0);if(code===0||code===15)continue;
    let pairs=table[code];const high=(v[0]+v[1]+v[2]+v[3])>=2;
    if(code===5)pairs=high?[[0,1],[2,3]]:[[3,0],[1,2]];
    if(code===10)pairs=high?[[3,0],[1,2]]:[[0,1],[2,3]];
    for(const [a,b] of pairs){const ia=at(a,x,y,v),ib=at(b,x,y,v);nodes.get(ia).links.push(ib);nodes.get(ib).links.push(ia);}
  }
  const loops=[];
  for(const [start,node] of nodes){if(node.seen)continue;const p=[];let id=start,prev=-1,closed=false;
    for(let guard=0;guard<=nodes.size;guard++){const n=nodes.get(id);if(!n||n.seen){closed=id===start;break;}n.seen=true;p.push(n.p);const next=n.links.find(k=>k!==prev);prev=id;id=next;}
    if(closed&&p.length>=4)loops.push(p);
  }return loops;
}
function resample(p,step){
 const lengths=[0];for(let i=0;i<p.length;i++)lengths.push(lengths[i]+dist(p[i],p[(i+1)%p.length]));
 const total=lengths.at(-1);if(total<1e-6)return[];const n=Math.max(8,Math.ceil(total/step)),out=[];let j=0;
 for(let i=0;i<n;i++){const t=i*total/n;while(j<p.length-1&&lengths[j+1]<t)j++;const a=p[j],b=p[(j+1)%p.length],f=(t-lengths[j])/(lengths[j+1]-lengths[j]||1);out.push(add(a,mul(sub(b,a),f)));}return out;
}
function detectCorners(p,k,threshold){
 const n=p.length;k=Math.max(2,Math.min(k,Math.floor(n/8)));const turn=i=>angle(sub(p[i],p[(i-k+n)%n]),sub(p[(i+k)%n],p[i]));
 const candidates=[];
 for(let i=0;i<n;i++){const inner=turn(i),outer=angle(sub(p[i],p[(i-2*k+n)%n]),sub(p[(i+2*k)%n],p[i]));
   if(inner>threshold&&inner>outer*.66)candidates.push({i,score:inner});
 }
 candidates.sort((a,b)=>b.score-a.score);const selected=[];
 for(const c of candidates)if(selected.every(j=>Math.min((c.i-j+n)%n,(j-c.i+n)%n)>k))selected.push(c.i);
 return selected.sort((a,b)=>a-b);
}
function chord(p){const u=[0];for(let i=1;i<p.length;i++)u.push(u[i-1]+dist(p[i],p[i-1]));const d=u.at(-1);return u.map((v,i)=>d?v/d:i/(p.length-1));}
function bez(c,t){const v=1-t;return add(add(mul(c[0],v*v*v),mul(c[1],3*v*v*t)),add(mul(c[2],3*v*t*t),mul(c[3],t*t*t)));}
function d1(c,t){const v=1-t;return add(add(mul(sub(c[1],c[0]),3*v*v),mul(sub(c[2],c[1]),6*v*t)),mul(sub(c[3],c[2]),3*t*t));}
function d2(c,t){return add(mul(add(sub(c[2],mul(c[1],2)),c[0]),6*(1-t)),mul(add(sub(c[3],mul(c[2],2)),c[1]),6*t));}
function generate(p,u,t1,t2){
 let c00=0,c01=0,c11=0,x0=0,x1=0;const a=p[0],b=p.at(-1),length=dist(a,b);
 for(let i=0;i<p.length;i++){const v=1-u[i],b0=v*v*v,b1=3*v*v*u[i],b2=3*v*u[i]*u[i],b3=u[i]**3;
   const A=mul(t1,b1),B=mul(t2,b2),tmp=sub(p[i],add(mul(a,b0+b1),mul(b,b2+b3)));
   c00+=dot(A,A);c01+=dot(A,B);c11+=dot(B,B);x0+=dot(A,tmp);x1+=dot(B,tmp);
 }
 const det=c00*c11-c01*c01;let h1=det?((x0*c11-x1*c01)/det):0,h2=det?((c00*x1-c01*x0)/det):0;
 if(h1<length*1e-5||h2<length*1e-5||h1>length*2||h2>length*2){h1=length/3;h2=length/3;}
 return [a,add(a,mul(t1,h1)),add(b,mul(t2,h2)),b];
}
function singleFit(p,t1,t2,tolerance){
 let u=chord(p),c=generate(p,u,t1,t2),worst=0,split=1;
 for(let iteration=0;iteration<6;iteration++){
   worst=0;for(let i=1;i<p.length-1;i++){const e=dist(bez(c,u[i]),p[i]);if(e>worst){worst=e;split=i;}}
   if(worst<=tolerance)return {c,error:worst,split};
   const next=u.map((t,i)=>{if(i===0)return 0;if(i===p.length-1)return 1;const delta=sub(bez(c,t),p[i]),v=d1(c,t),den=dot(v,v)+dot(delta,d2(c,t));return Math.abs(den)>1e-10?clamp(t-dot(delta,v)/den,0,1):t;});
   if(next.some((t,i)=>i>0&&t<=next[i-1]))break;u=next;c=generate(p,u,t1,t2);
 }
 return {c,error:worst,split};
}
function fit(p,t1,t2,tolerance,offset=0,depth=0){
 const attempt=singleFit(p,t1,t2,tolerance);
 if(attempt.error<=tolerance||p.length===2)return [{type:'C',c:attempt.c,a:offset,b:offset+p.length-1,error:attempt.error}];
 const s=clamp(attempt.split,1,p.length-2),t=unit(sub(p[s+1],p[s-1]));
 if(depth>45)throw new Error('Kontur terlalu kompleks. Kurangi jumlah warna.');
 return [...fit(p.slice(0,s+1),t1,mul(t,-1),tolerance,offset,depth+1),...fit(p.slice(s),t,t2,tolerance,offset+s,depth+1)];
}
function lineError(p){const a=p[0],b=p.at(-1),v=sub(b,a),len=norm(v);if(len<1e-8)return Infinity;let error=0,last=-1;
 for(const point of p){const d=sub(point,a),t=dot(d,v)/(len*len);if(t<last-.02||t<-.02||t>1.02)return Infinity;last=t;error=Math.max(error,Math.abs(d[0]*v[1]-d[1]*v[0])/len);}return error;
}
function rdpIndices(p,tol,a=0,b=p.length-1){
 const v=sub(p[b],p[a]),den=dot(v,v);let worst=0,index=-1;
 for(let i=a+1;i<b;i++){const t=den?clamp(dot(sub(p[i],p[a]),v)/den,0,1):0;const d=dist(p[i],add(p[a],mul(v,t)));if(d>worst){worst=d;index=i;}}
 if(worst<=tol||index<0)return[a,b];const left=rdpIndices(p,tol,a,index),right=rdpIndices(p,tol,index,b);return [...left.slice(0,-1),...right];
}
// Fit a circle through both endpoints. Keeping endpoints exact prevents gaps.
function fitCircularArc(p,tolerance,t1,t2){
 if(p.length<20)return null;
 const a=p[0],b=p.at(-1),length=dist(a,b);if(length<12)return null;
 const mid=mul(add(a,b),.5),normal=unit([a[1]-b[1],b[0]-a[0]]);
 let numerator=0,denominator=0;
 for(const point of p){const v=sub(point,mid),coefficient=2*dot(v,normal),rhs=dot(v,v)-length*length/4;numerator+=coefficient*rhs;denominator+=coefficient*coefficient;}
 if(denominator<1e-8)return null;
 const center=add(mid,mul(normal,numerator/denominator)),radius=dist(a,center);
 if(!Number.isFinite(radius)||radius<6||radius>length*8)return null;
 let error=0,sweep=0,last=Math.atan2(a[1]-center[1],a[0]-center[0]),direction=0;
 const start=last;
 for(const point of p.slice(1)){
  error=Math.max(error,Math.abs(dist(point,center)-radius));if(error>tolerance)return null;
  const current=Math.atan2(point[1]-center[1],point[0]-center[0]);let delta=current-last;
  while(delta>Math.PI)delta-=2*Math.PI;while(delta< -Math.PI)delta+=2*Math.PI;
  if(Math.abs(delta)>.3)return null;
  if(!direction&&Math.abs(delta)>.0001)direction=Math.sign(delta);
  if(delta*direction<-.002)return null;sweep+=delta;last=current;
 }
 if(Math.abs(sweep)<Math.PI/9||Math.abs(sweep)>Math.PI*1.8)return null;
 const tangent=theta=>[ -Math.sin(theta)*direction,Math.cos(theta)*direction ];
 if(t1&&angle(tangent(start),t1)>15||t2&&angle(tangent(start+sweep),mul(t2,-1))>15)return null;
 const count=Math.ceil(Math.abs(sweep)/(Math.PI/4)),segments=[];
 for(let i=0;i<count;i++){
  const u=start+sweep*i/count,v=start+sweep*(i+1)/count,k=4/3*Math.tan((v-u)/4)*radius;
  const first=i===0?a:add(center,[radius*Math.cos(u),radius*Math.sin(u)]),lastPoint=i===count-1?b:add(center,[radius*Math.cos(v),radius*Math.sin(v)]);
  segments.push({type:'C',c:[first,add(first,[-Math.sin(u)*k,Math.cos(u)*k]),sub(lastPoint,[-Math.sin(v)*k,Math.cos(v)*k]),lastPoint],error,arc:true});
 }
 return segments;
}
function smoothContour(p,options){
 if(!options.smoothArcs||p.length<24)return p;
 const support=Math.max(2,Math.round(2.4*options.scale/options.step)),corners=detectCorners(p,support,Math.min(options.cornerAngle,55));
 const radius=Math.min(10,Math.max(2,Math.round((1+options.smooth/100*2)*options.scale/options.step)));
 return p.map((point,i)=>{
  if(corners.some(c=>Math.min((i-c+p.length)%p.length,(c-i+p.length)%p.length)<=radius))return point;
  let sum=[0,0],weight=0;for(let j=-radius;j<=radius;j++){const w=radius+1-Math.abs(j);sum=add(sum,mul(p[(i+j+p.length)%p.length],w));weight+=w;}
  const delta=sub(mul(sum,1/weight),point),limit=(.15+options.smooth/100*.55)*options.scale;
  return add(point,mul(delta,Math.min(1,limit/(norm(delta)||1))));
 });
}
function fitLoop(p,options){
 p=smoothContour(p,options);
 const n=p.length;if(n<4)return {segments:[],corners:0};
 const corners=detectCorners(p,Math.max(2,Math.round(2.4*options.scale/options.step)),options.cornerAngle),cornerSet=new Set(corners),anchors=new Set(corners),tangents=new Map(),straight=new Map();
 if(options.straight){
   // Split the ring into two open halves for RDP, then accept only long, low-turn spans.
   const half=Math.floor(n/2),ranges=[[0,half],[half,n]],candidates=[];
   for(const [a,b] of ranges){const q=Array.from({length:b-a+1},(_,j)=>p[(a+j)%n]);const ids=rdpIndices(q,.18*options.scale);
     for(let j=0;j<ids.length-1;j++){const s=ids[j],e=ids[j+1],part=q.slice(s,e+1),len=dist(part[0],part.at(-1));if(part.length<6||len<8*options.scale)continue;
       const k=Math.max(2,Math.floor(part.length/4));const turn=angle(sub(part[k],part[0]),sub(part.at(-1),part[part.length-1-k]));
       if(turn<3&&lineError(part)<=.18*options.scale)candidates.push({a:(a+s)%n,b:(a+e)%n,t:unit(sub(part.at(-1),part[0]))});
     }
   }
   for(const c of candidates){if(corners.some(i=>(i-c.a+n)%n>0&&(i-c.a+n)%n<(c.b-c.a+n)%n))continue;
     anchors.add(c.a);anchors.add(c.b);straight.set(c.a,c);if(!cornerSet.has(c.a))tangents.set(c.a,c.t);if(!cornerSet.has(c.b))tangents.set(c.b,c.t);
   }
 }
 if(anchors.size<2){for(let i=0;i<4;i++)anchors.add(Math.floor(i*n/4));}
 const indices=[...anchors].sort((a,b)=>a-b),segments=[];
 const span=options.smoothArcs?Math.max(2,Math.round(3*options.scale/options.step)):2;const central=i=>unit(sub(p[(i+span)%n],p[(i-span+n)%n]));
 for(let j=0;j<indices.length;j++){
   const a=indices[j],b=indices[(j+1)%indices.length],count=(b-a+n)%n,q=Array.from({length:count+1},(_,k)=>p[(a+k)%n]);
   if(count===0)continue;
   if(straight.get(a)?.b===b){segments.push({type:'L',c:[q[0],q.at(-1)],error:lineError(q),cornerStart:cornerSet.has(a),cornerEnd:cornerSet.has(b)});continue;}
   const k=Math.min(2,q.length-1),t1=tangents.get(a)||(cornerSet.has(a)?unit(sub(q[k],q[0])):central(a));
   const t2=mul(tangents.get(b)||(cornerSet.has(b)?unit(sub(q.at(-1),q[q.length-1-k])):central(b)),-1);
      const arc=options.smoothArcs?fitCircularArc(q,Math.max(options.tolerance,(.4+options.smooth/100*.8)*options.scale),cornerSet.has(a)?null:t1,cornerSet.has(b)?null:t2):null;
   if(arc){arc[0].cornerStart=cornerSet.has(a);arc.at(-1).cornerEnd=cornerSet.has(b);segments.push(...arc);continue;}
   let curves=fit(q,t1,t2,options.tolerance);
   // Greedy pair refit reduces nodes only if the original sampled points still fit.
   for(let pass=0;pass<2;pass++){const reduced=[];for(let i=0;i<curves.length;i++){
     const first=curves[i],second=curves[i+1];if(second){const pts=q.slice(first.a,second.b+1),start=unit(sub(first.c[1],first.c[0])),end=unit(sub(second.c[2],second.c[3]));const f=singleFit(pts,start,end,options.tolerance);
       if(f.error<=options.tolerance){reduced.push({type:'C',c:f.c,a:first.a,b:second.b,error:f.error});i++;continue;}}
     reduced.push(first);}curves=reduced;
   }
   curves[0].cornerStart=cornerSet.has(a);curves.at(-1).cornerEnd=cornerSet.has(b);segments.push(...curves);
 }
 return {segments,corners:corners.length};
}
function pathData(segments,scale=1){const f=p=>p.map(x=>+(x/scale).toFixed(3)).join(' ');if(!segments.length)return'';return'M'+f(segments[0].c[0])+segments.map(s=>s.type==='L'?'L'+f(s.c[1]):'C'+s.c.slice(1).map(f).join(' ')).join('')+'Z';}
const api={fitCircularArc,smoothContour,marching,resample,detectCorners,fitLoop,pathData,area,bez,fit,singleFit,lineError,angle};root.BnightGeometry=api;if(typeof module!=='undefined')module.exports=api;
})(typeof self!=='undefined'?self:globalThis);

