importScripts('vendor/imagetracer.js','geometry.js');
const G=BnightGeometry;
function interiorPalette(rgba,w,h,k){
 const bins=new Map();
 // Learn colors from quiet interiors rather than treating antialias fringes as paint.
 for(let y=2;y<h-2;y+=2)for(let x=2;x<w-2;x+=2){const i=(y*w+x)*4;let variation=0;
   for(const offset of [-8,8,-w*8,w*8])for(let c=0;c<3;c++)variation=Math.max(variation,Math.abs(rgba[i+c]-rgba[i+offset+c]));
   if(variation>25)continue;
   const key=(rgba[i]>>3)*1024+(rgba[i+1]>>3)*32+(rgba[i+2]>>3);if(!bins.has(key))bins.set(key,[0,0,0,0]);const b=bins.get(key);for(let c=0;c<3;c++)b[c]+=rgba[i+c];b[3]++;
 }
 let samples=[...bins.values()].filter(b=>b[3]>=Math.max(3,w*h*.00002)).map(b=>({v:b.slice(0,3).map(n=>n/b[3]),n:b[3]}));
 if(samples.length<2)return null;samples.sort((a,b)=>b.n-a.n);
 const distance=(a,b)=>a.reduce((sum,v,c)=>sum+(v-b[c])**2,0),centers=[samples[0].v];
 while(centers.length<Math.min(k,samples.length)){let candidate=null,best=-1;for(const s of samples){const score=Math.min(...centers.map(c=>distance(s.v,c)))*Math.sqrt(s.n);if(score>best){best=score;candidate=s.v;}}if(best<1)break;centers.push(candidate);}
 for(let iter=0;iter<12;iter++){const sums=centers.map(()=>[0,0,0,0]);for(const s of samples){let best=Infinity,idx=0;centers.forEach((c,j)=>{const d=distance(s.v,c);if(d<best){best=d;idx=j;}});for(let c=0;c<3;c++)sums[idx][c]+=s.v[c]*s.n;sums[idx][3]+=s.n;}
   sums.forEach((s,i)=>{if(s[3])centers[i]=s.slice(0,3).map(v=>v/s[3]);});
 }
 return centers.map(c=>({r:Math.round(c[0]),g:Math.round(c[1]),b:Math.round(c[2]),a:255}));
}
function softMask(labels,palette,rank,layer,rgba,w,h,removeBg){
 const fw=w+2,fh=h+2,field=new Float32Array(fw*fh),tmp=new Float32Array(fw*fh);
 const active=id=>id>=0&&rank[id]>=layer&&(!removeBg||Math.min(palette[id].r,palette[id].g,palette[id].b)<240);
 const color=id=>[palette[id].r,palette[id].g,palette[id].b];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const id=labels[y+1][x+1],inside=active(id),idx=(y+1)*fw+x+1;let value=inside?1:0;
   // Estimate occupancy from source RGB between neighboring region colors.
   let best=Infinity,opposite=-1;
   for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){const neighbor=labels[y+1+dy]?.[x+1+dx];if(neighbor<0||neighbor===undefined||active(neighbor)===inside)continue;
     const c=color(neighbor),p=(y*w+x)*4,d=c.reduce((sum,v,k)=>sum+(v-rgba[p+k])**2,0);if(d<best){best=d;opposite=neighbor;}
   }
   if(opposite>=0){const a=color(inside?id:opposite),b=color(inside?opposite:id),p=(y*w+x)*4;let top=0,den=0;for(let k=0;k<3;k++){top+=(rgba[p+k]-b[k])*(a[k]-b[k]);den+=(a[k]-b[k])**2;}
     if(den>300)value=Math.max(0,Math.min(1,top/den));
   }field[idx]=value;
 }
 for(let y=1;y<=h;y++)for(let x=1;x<=w;x++){const i=y*fw+x;tmp[i]=.18*field[y*fw+Math.max(1,x-1)]+.64*field[i]+.18*field[y*fw+Math.min(w,x+1)];}
 for(let y=1;y<=h;y++)for(let x=1;x<=w;x++){const i=y*fw+x;field[i]=.18*tmp[Math.max(1,y-1)*fw+x]+.64*tmp[i]+.18*tmp[Math.min(h,y+1)*fw+x];}
 return {field,w:fw,h:fh};
}
function geometricFit(p,options){
 if(!options.detectShapes||p.length<24)return null;
 let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
 for(const [x,y] of p){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 const rx=(right-left)/2,ry=(bottom-top)/2,cx=(left+right)/2,cy=(top+bottom)/2,tol=Math.min(2*options.scale,Math.min(rx,ry)*.05);
 if(Math.min(rx,ry)<6*options.scale)return null;
 const rectangleError=p.reduce((max,[x,y])=>Math.max(max,Math.min(x-left,right-x,y-top,bottom-y)),0);
 const coverage=Math.abs(G.area(p))/(4*rx*ry);
 if(options.cornerMode!=='round'&&rectangleError<=tol&&coverage>.97){const corners=[[left,top],[right,top],[right,bottom],[left,bottom]];return {segments:corners.map((v,i)=>({type:'L',c:[v,corners[(i+1)%4]],error:rectangleError})),corners:4};}
 const radialError=p.reduce((max,[x,y])=>Math.max(max,Math.abs(Math.hypot((x-cx)/rx,(y-cy)/ry)-1)*Math.max(rx,ry)),0);
 if(radialError>tol||Math.abs(Math.abs(G.area(p))/(Math.PI*rx*ry)-1)>.02)return null;
 const k=.5522847498307936,pts=[[[cx+rx,cy],[cx+rx,cy+k*ry],[cx+k*rx,cy+ry],[cx,cy+ry]],[[cx,cy+ry],[cx-k*rx,cy+ry],[cx-rx,cy+k*ry],[cx-rx,cy]],[[cx-rx,cy],[cx-rx,cy-k*ry],[cx-k*rx,cy-ry],[cx,cy-ry]],[[cx,cy-ry],[cx+k*rx,cy-ry],[cx+rx,cy-k*ry],[cx+rx,cy]]];
 return {segments:pts.map(c=>({type:'C',c,error:radialError})),corners:0};
}
function contourFit(p,options){
 const shape=geometricFit(p,options);if(shape)return shape;
 if(options.cornerMode==='round'){
  const radius=Math.max(2,Math.round(2*options.scale));
  p=p.map((_,i)=>{const sum=[0,0];for(let j=-radius;j<=radius;j++){const point=p[(i+j+p.length)%p.length];sum[0]+=point[0];sum[1]+=point[1];}return sum.map(v=>v/(radius*2+1));});
 }
 return G.fitLoop(p,options);
}
function build(layers,options){
 const result=[],stats={lines:0,cubics:0,corners:0,contours:0,maxSampleError:0};
 for(const layer of layers){const loops=[];for(const p of layer.contours){const fit=contourFit(p,options);if(!fit.segments.length)continue;loops.push(fit.segments);stats.corners+=fit.corners;stats.contours++;
   for(const s of fit.segments){if(s.type==='L')stats.lines++;else stats.cubics++;stats.maxSampleError=Math.max(stats.maxSampleError,s.error/options.scale);}}
   if(loops.length)result.push({color:layer.color,loops});
 }return {layers:result,stats};
}
function rasterScore(result,target,w,h){
 const rw=target.width,rh=target.height,canvas=new OffscreenCanvas(rw,rh),ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='white';ctx.fillRect(0,0,rw,rh);ctx.scale(rw/w,rh/h);
 for(const layer of result.layers){const path=new Path2D(layer.loops.map(s=>G.pathData(s)).join(' '));ctx.fillStyle=layer.color;ctx.fill(path,'evenodd');}
 const pixels=ctx.getImageData(0,0,rw,rh).data;let error=0,weightSum=0;
 for(let i=0;i<pixels.length;i+=4){const weight=target.weights[i/4];for(let c=0;c<3;c++)error+=weight*((pixels[i+c]-target.data[i+c])/255)**2;weightSum+=3*weight;}
 return error/weightSum;
}
self.onmessage=({data})=>{
 try {
   const {width:w,height:h,sourceWidth,sourceHeight}=data;const settings={...data.settings};if(Number(settings.colors)===1){settings.mono=true;settings.removeBg=true;}const rgba=new Uint8ClampedArray(data.pixels),scale=w/sourceWidth;
   for(let i=0;i<rgba.length;i+=4){const a=rgba[i+3]/255;for(let c=0;c<3;c++)rgba[i+c]=rgba[i+c]*a+255*(1-a);rgba[i+3]=255;
     if(Math.min(rgba[i],rgba[i+1],rgba[i+2])>239)rgba[i]=rgba[i+1]=rgba[i+2]=255;
     if(settings.mono){const g=.2126*rgba[i]+.7152*rgba[i+1]+.0722*rgba[i+2];rgba[i]=rgba[i+1]=rgba[i+2]=g;}
   }
   self.postMessage({progress:'Memisahkan bidang warna…'});
   const learned=interiorPalette(rgba,w,h,settings.colors);
   const options=ImageTracer.checkoptions({numberofcolors:settings.mono?2:settings.colors,colorquantcycles:learned?1:5,colorsampling:2,mincolorratio:0,blurradius:1,blurdelta:22});
   if(learned)options.pal=learned;
   if(settings.mono)options.pal=[{r:0,g:0,b:0,a:255},{r:255,g:255,b:255,a:255}];
   const quant=ImageTracer.colorquantization({data:rgba,width:w,height:h},options),counts=new Int32Array(quant.palette.length);
   for(let y=1;y<=h;y++)for(let x=1;x<=w;x++)counts[quant.array[y][x]]++;
   const byArea=[...counts.keys()].filter(i=>counts[i]>0).sort((a,b)=>counts[b]-counts[a]);
   const luminance=id=>{const c=quant.palette[id];return .2126*c.r+.7152*c.g+.0722*c.b;};
   const order=byArea.length?[byArea[0],...byArea.slice(1).sort((a,b)=>luminance(b)-luminance(a))]:[],rank=new Int16Array(counts.length);rank.fill(-1);order.forEach((id,i)=>rank[id]=i);
   const layers=[];for(let i=0;i<order.length;i++){
     const c=quant.palette[order[i]];if(settings.removeBg&&Math.min(c.r,c.g,c.b)>239)continue;
     self.postMessage({progress:`Menelusuri tepi subpiksel ${i+1}/${order.length}…`});
     const mask=softMask(quant.array,quant.palette,rank,i,rgba,w,h,settings.removeBg);
     const contours=G.marching(mask.field,mask.w,mask.h).filter(p=>Math.abs(G.area(p))>=Math.max(.15,settings.detail)*scale*scale).map(p=>G.resample(p,.85)).filter(p=>p.length>=8);
     layers.push({color:`rgb(${c.r},${c.g},${c.b})`,contours});
   }
   const tolerance=(.18+settings.smooth/100*.62)*scale;
   const fitOptions={tolerance,scale,smooth:settings.smooth,smoothArcs:settings.smoothArcs,step:.85,cornerAngle:settings.cornerMode==='sharp'?30:settings.cornerMode==='round'?180:55,straight:settings.cornerMode!=='round'&&settings.straight!==false,cornerMode:settings.cornerMode,detectShapes:settings.detectShapes};
   let target;
   if(settings.optimize&&typeof OffscreenCanvas!=='undefined'&&typeof Path2D!=='undefined'){
     const ratio=Math.min(1,512/Math.max(w,h)),rw=Math.round(w*ratio),rh=Math.round(h*ratio),source=new OffscreenCanvas(w,h);source.getContext('2d').putImageData(new ImageData(rgba,w,h),0,0);
     const scaled=new OffscreenCanvas(rw,rh),ctx=scaled.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0,rw,rh);const pixels=ctx.getImageData(0,0,rw,rh).data,weights=new Float32Array(rw*rh);
     for(let i=0;i<weights.length;i++){const j=i*4,k=(i%rw<rw-1?i+1:i)*4;weights[i]=1+Math.min(6,Math.abs(pixels[j]-pixels[k])/20+Math.abs(pixels[j+1]-pixels[k+1])/20+Math.abs(pixels[j+2]-pixels[k+2])/20);}
     target={width:rw,height:rh,data:pixels,weights};
   }
   const candidates=target?[1,.8,.6]:[1];let best=null,bestScore=Infinity,baselineError=null;
   for(let i=0;i<candidates.length;i++){
     self.postMessage({progress:target?`Membandingkan hasil render ${i+1}/3…`:'Menyambung garis dan kurva Bézier…'});
     const result=build(layers,{...fitOptions,tolerance:tolerance*candidates[i]});const rasterError=target?rasterScore(result,target,w,h):null;
     if(i===0)baselineError=rasterError;const score=target?rasterError:0;
     if(!best||score<bestScore-1e-10||Math.abs(score-bestScore)<1e-10&&(result.stats.cubics+result.stats.lines)<(best.stats.cubics+best.stats.lines)){best=result;bestScore=score;best.stats.selectedTolerance=fitOptions.tolerance*candidates[i]/scale;}
   }
   const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${sourceWidth}" height="${sourceHeight}" viewBox="0 0 ${sourceWidth} ${sourceHeight}">`+best.layers.map(layer=>`<path fill="${layer.color}" fill-rule="evenodd" d="${layer.loops.map(s=>G.pathData(s,scale)).join(' ')}"/>`).join('')+'</svg>';
   self.postMessage({svg,width:w,height:h,stats:{...best.stats,engine:'BNIGHT Geometry 2',compared:candidates.length,rasterError:target?bestScore:null,baselineError}});
 }catch(e){self.postMessage({error:e.message||'Konversi gagal.'});}
};





