'use strict';
const advancedIds=['smooth-arcs','deskew','perspective','tl-x','tl-y','tr-x','tr-y','br-x','br-y','bl-x','bl-y','corner-mode','detect-shapes'];
function correctSource(image){
 const read=(id,min,max)=>{const value=Number(document.getElementById(id).value);if(!Number.isFinite(value)||value<min||value>max)throw new Error('Nilai koreksi tidak valid.');return value;};
 const degrees=read('deskew',-45,45),perspective=document.getElementById('perspective').checked;
 if(!degrees&&!perspective)return image;
 const scale=Math.min(1,1280/Math.max(image.naturalWidth,image.naturalHeight));
 let source=document.createElement('canvas');source.width=Math.max(1,Math.round(image.naturalWidth*scale));source.height=Math.max(1,Math.round(image.naturalHeight*scale));source.getContext('2d').drawImage(image,0,0,source.width,source.height);
 if(perspective){
  const points=['tl','tr','br','bl'].map(key=>[read(key+'-x',0,100)/100*(source.width-1),read(key+'-y',0,100)/100*(source.height-1)]);
  const crosses=points.map((a,i)=>{const b=points[(i+1)%4],c=points[(i+2)%4];return (b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);});
  if(crosses.some(x=>x<=1))throw new Error('Empat sudut harus membentuk bidang cembung dan tidak bersilangan.');
  const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  const width=Math.max(2,Math.round((distance(points[0],points[1])+distance(points[3],points[2]))/2)),height=Math.max(2,Math.round((distance(points[0],points[3])+distance(points[1],points[2]))/2));
  const matrix=[];[[0,0],[1,0],[1,1],[0,1]].forEach(([u,v],i)=>{const [x,y]=points[i];matrix.push([u,v,1,0,0,0,-x*u,-x*v,x],[0,0,0,u,v,1,-y*u,-y*v,y]);});
  for(let i=0;i<8;i++){let pivot=i;for(let j=i+1;j<8;j++)if(Math.abs(matrix[j][i])>Math.abs(matrix[pivot][i]))pivot=j;[matrix[i],matrix[pivot]]=[matrix[pivot],matrix[i]];const d=matrix[i][i];if(Math.abs(d)<1e-9)throw new Error('Nilai koreksi tidak valid.');for(let k=i;k<=8;k++)matrix[i][k]/=d;for(let j=0;j<8;j++)if(j!==i){const f=matrix[j][i];for(let k=i;k<=8;k++)matrix[j][k]-=f*matrix[i][k];}}
  const h=matrix.map(row=>row[8]),src=source.getContext('2d').getImageData(0,0,source.width,source.height),out=document.createElement('canvas');out.width=width;out.height=height;const ctx=out.getContext('2d'),dest=ctx.createImageData(width,height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const u=x/(width-1),v=y/(height-1),d=h[6]*u+h[7]*v+1;const sx=Math.max(0,Math.min(source.width-1,(h[0]*u+h[1]*v+h[2])/d)),sy=Math.max(0,Math.min(source.height-1,(h[3]*u+h[4]*v+h[5])/d));const x0=Math.floor(sx),y0=Math.floor(sy),fx=sx-x0,fy=sy-y0;for(let c=0;c<4;c++){let value=0;for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)value+=src.data[(Math.min(y0+dy,source.height-1)*source.width+Math.min(x0+dx,source.width-1))*4+c]*(dx?fx:1-fx)*(dy?fy:1-fy);dest.data[(y*width+x)*4+c]=value;}}
  ctx.putImageData(dest,0,0);source=out;
 }
 if(degrees){const angle=degrees*Math.PI/180,c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle)),out=document.createElement('canvas');out.width=Math.ceil(source.width*c+source.height*s);out.height=Math.ceil(source.width*s+source.height*c);const ctx=out.getContext('2d');ctx.translate(out.width/2,out.height/2);ctx.rotate(angle);ctx.drawImage(source,-source.width/2,-source.height/2);source=out;}
 return source;
}
function colorFiles(svg,name){
 const doc=new DOMParser().parseFromString(svg,'image/svg+xml'),root=doc.documentElement,paths=[...root.querySelectorAll('path')],colors=[...new Set(paths.map(p=>p.getAttribute('fill')))];
 return colors.map((color,index)=>{
  const output=root.cloneNode(false),ns=root.namespaceURI,defs=doc.createElementNS(ns,'defs');output.append(defs);
  paths.forEach((path,i)=>{if(path.getAttribute('fill')!==color)return;const group=doc.createElementNS(ns,'g'),mask=doc.createElementNS(ns,'mask');mask.id='visible-'+i;mask.setAttribute('maskUnits','userSpaceOnUse');mask.setAttribute('x','0');mask.setAttribute('y','0');mask.setAttribute('width',root.getAttribute('width'));mask.setAttribute('height',root.getAttribute('height'));
   const rect=doc.createElementNS(ns,'rect');rect.setAttribute('width','100%');rect.setAttribute('height','100%');rect.setAttribute('fill','white');mask.append(rect);
   paths.slice(i+1).forEach(later=>{const cut=later.cloneNode(true);cut.setAttribute('fill','black');mask.append(cut);});defs.append(mask);group.setAttribute('mask',`url(#${mask.id})`);group.append(path.cloneNode(true));output.append(group);
  });
  return {name:`${name.replace(/[\\/:*?"<>|]/g,'_')}-color-${index+1}.svg`,text:new XMLSerializer().serializeToString(output)};
 });
}
function groupedColors(svg){const doc=new DOMParser().parseFromString(svg,'image/svg+xml'),root=doc.documentElement;[...root.querySelectorAll('path')].forEach((path,i)=>{const group=doc.createElementNS(root.namespaceURI,'g');group.id='color-'+(i+1);group.setAttribute('data-color',path.getAttribute('fill'));path.replaceWith(group);group.append(path);});return new XMLSerializer().serializeToString(root);}
document.addEventListener('DOMContentLoaded',()=>{
 advancedIds.forEach(id=>document.getElementById(id).addEventListener('input',()=>{if(state.svg)clearResult();status('Pengaturan berubah. Klik Buat vektor untuk memperbarui hasil.');}));
 document.getElementById('color-zip').addEventListener('click',()=>{if(state.svg)saveBlob(zipFiles(colorFiles(state.svg,state.name)),state.name+'-colors.zip');});
 document.getElementById('color-groups').addEventListener('click',()=>{if(state.svg)saveBlob(new Blob([groupedColors(state.svg)],{type:'image/svg+xml'}),state.name+'-grouped.svg');});
});

