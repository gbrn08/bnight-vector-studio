'use strict';
const $=id=>document.getElementById(id);
const state={image:null,sourceURL:null,resultURL:null,svg:null,name:'gambar',width:0,height:0,zoom:1,panX:0,panY:0,worker:null,busy:false,mode:'compare',loadId:0,timer:null,job:0,abort:null,reject:null,stats:null};
const settingsIds=['preset','colors','smooth','detail','remove-bg','straight','optimize','ai-mode',...advancedIds];
const settings=()=>({colors:Number($('colors').value),smooth:Number($('smooth').value),detail:Number($('detail').value),removeBg:$('remove-bg').checked,mono:$('preset').value==='mono',straight:$('straight').checked,optimize:$('optimize').checked,ai:$('ai-mode').value,cornerMode:$('corner-mode').value,detectShapes:$('detect-shapes').checked,smoothArcs:$('smooth-arcs').checked});
function status(message,type=''){ localizedText('status',message);$('status').className=type; }
function updateLabels(){ $('colors-value').textContent=$('colors').value;$('smooth-value').textContent=$('smooth').value+'%';$('detail-value').textContent=$('detail').value+' px'; }
function setBusy(busy){state.busy=busy;$('busy').hidden=!busy;$('cancel').hidden=!busy;$('convert').disabled=busy||!state.image;$('download').disabled=busy||!state.svg;settingsIds.forEach(id=>$(id).disabled=busy||batch.running);refreshActions();}
function clearResult(){if(state.sourceURL)$('original-image').src=state.sourceURL;if(state.resultURL)URL.revokeObjectURL(state.resultURL);state.resultURL=null;state.svg=null;$('vector-image').removeAttribute('src');$('canvas').classList.remove('has-result');$('download').disabled=true;['color-zip','color-groups'].forEach(id=>$(id).disabled=true);localizedText('stats','');$('split-line').hidden=true;$('compare-slider').hidden=true;$('result-placeholder').hidden=!state.image||state.mode==='original';}
function cancel(){batch.canceled=true;state.job++;state.abort?.abort();state.abort=null;if(state.worker){state.worker.terminate();state.worker=null;}if(state.reject){state.reject(new Error('Dibatalkan'));state.reject=null;}clearTimeout(state.timer);setBusy(false);status('Proses dibatalkan. Proses AI yang sudah dimulai mungkin perlu beberapa saat untuk berhenti.');}
async function loadFile(file){
  if(!file)return;
  const id=++state.loadId;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){status('Pilih gambar JPG, PNG, atau WebP. EPS dipakai sebagai hasil, bukan gambar masukan.','error');return;}
  if(file.size>15*1024*1024){status('Gambar melebihi 15 MB. Pilih file yang lebih kecil.','error');return;}
  const url=URL.createObjectURL(file),img=new Image();
  try{img.src=url;await img.decode();if(id!==state.loadId){URL.revokeObjectURL(url);return;}
    if(img.naturalWidth*img.naturalHeight>40000000)throw new Error('Resolusi terlalu besar. Gunakan gambar di bawah 40 megapiksel.');
    if(state.busy)cancel();
    if(state.sourceURL)URL.revokeObjectURL(state.sourceURL);
    state.image=img;state.sourceURL=url;state.name=file.name.replace(/\.[^.]+$/,'');state.width=img.naturalWidth;state.height=img.naturalHeight;
    clearResult();$('original-image').src=url;$('file-thumb').src=url;$('file-name').textContent=file.name;$('file-meta').textContent=`${state.width} × ${state.height} px · ${Math.round(file.size/1024)} KB`;$('file-card').hidden=false;$('empty').hidden=true;$('convert').disabled=false;
    resetView();setMode('compare');status('Gambar siap. Klik Buat vektor untuk memproses.');return true;
  }catch(error){URL.revokeObjectURL(url);status(error.message.startsWith('Resolusi')?error.message:'File tidak dapat dibaca. Coba gambar lain.','error');}
}
async function demo(){try{const response=await fetch('assets/bnight-original.jpg');if(!response.ok)throw new Error();const blob=await response.blob();await loadFile(new File([blob],'BNIGHT STUDIO.jpg',{type:'image/jpeg'}));}catch{status('Contoh belum bisa dimuat. Silakan pilih gambar sendiri.','error');}}
function setMode(mode){state.mode=mode;$('canvas').dataset.mode=mode;document.querySelectorAll('[data-mode][role=tab]').forEach(b=>{const active=b.dataset.mode===mode;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});$('result-placeholder').hidden=!state.image||!!state.svg||mode==='original';}
function renderView(){
  const viewport=$('viewport');
  const maxX=viewport.clientWidth*Math.max(0,state.zoom-1)/2;
  const maxY=viewport.clientHeight*Math.max(0,state.zoom-1)/2;
  state.panX=Math.max(-maxX,Math.min(maxX,state.panX));
  state.panY=Math.max(-maxY,Math.min(maxY,state.panY));
  $('stage').style.transform=`translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  $('canvas').classList.toggle('can-pan',!!state.image&&state.zoom>1);
  $('zoom-reset').textContent=Math.round(state.zoom*100)+'%';updateSplit();
}
function setZoom(value,anchor){
  const next=Math.max(.5,Math.min(4,value));
  if(anchor){
    const rect=$('viewport').getBoundingClientRect(),ratio=next/state.zoom;
    const x=anchor.clientX-rect.left-rect.width/2,y=anchor.clientY-rect.top-rect.height/2;
    state.panX=x-(x-state.panX)*ratio;state.panY=y-(y-state.panY)*ratio;
  }
  state.zoom=next;renderView();
}
function resetView(){state.panX=0;state.panY=0;setZoom(1);}
function updateSplit(){
  const p=Number($('compare-slider').value);
  const viewport=$('viewport').getBoundingClientRect(),canvas=$('canvas').getBoundingClientRect();
  const local=50+(p-50)/state.zoom-(viewport.width?state.panX/(viewport.width*state.zoom)*100:0);
  $('stage').style.setProperty('--split',Math.max(0,Math.min(100,local))+'%');
  $('split-line').style.left=(viewport.left-canvas.left+viewport.width*p/100)+'px';
}
async function convert(){
  if(!state.image||state.busy)return Promise.reject(new Error('Pilih gambar sebelum memproses.'));
  clearResult();setBusy(true);status('Memproses gambar…');const start=performance.now(),job=++state.job,opts=settings();let input=state.image,aiBitmap=null;let outputWidth=state.width,outputHeight=state.height;
  try {
    input=correctSource(state.image);outputWidth=input.naturalWidth||input.width;outputHeight=input.naturalHeight||input.height;if(input!==state.image){$('original-image').src=input.toDataURL('image/png');}else{$('original-image').src=state.sourceURL;}
    if(opts.ai==='realesrgan'){
      localizedText('progress-label','Real-ESRGAN membersihkan gambar di GPU lokal…');status('AI lokal berjalan. Proses pertama dapat memerlukan waktu lebih lama.');
      const prep=document.createElement('canvas'),ratio=Math.min(1,1000/Math.max(outputWidth,outputHeight));prep.width=Math.round(outputWidth*ratio);prep.height=Math.round(outputHeight*ratio);const pc=prep.getContext('2d');pc.fillStyle='white';pc.fillRect(0,0,prep.width,prep.height);pc.drawImage(input,0,0,prep.width,prep.height);
      const blob=await new Promise(resolve=>prep.toBlob(resolve,'image/png'));if(job!==state.job)throw new Error('Dibatalkan');
      state.abort=new AbortController();const timeout=setTimeout(()=>state.abort?.abort(),190000);let response;
      try{response=await fetch('/api/upscale',{method:'POST',headers:{'Content-Type':'application/octet-stream','X-Bnight-Token':window.BNIGHT_RUNTIME_TOKEN||''},body:blob,signal:state.abort.signal});}finally{clearTimeout(timeout);state.abort=null;}
      if(!response.ok){let message='AI lokal gagal. Pilih Asli untuk memakai mesin geometri tanpa AI.';try{message=(await response.json()).error||message;}catch{}throw new Error(message);}
      aiBitmap=await createImageBitmap(await response.blob());input=aiBitmap;
    }
    if(job!==state.job){aiBitmap?.close();throw new Error('Dibatalkan');}
  }catch(error){if(job===state.job){setBusy(false);status(error.name==='AbortError'?'AI melewati batas waktu. Coba tanpa AI.':error.message,'error');}throw error;}
  const iw=input.naturalWidth||input.width,ih=input.naturalHeight||input.height;
  const factor=Math.min(opts.ai==='realesrgan'?1:2,1280/Math.max(iw,ih));const width=Math.max(1,Math.round(iw*factor)),height=Math.max(1,Math.round(ih*factor));
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(input,0,0,width,height);aiBitmap?.close();const pixels=ctx.getImageData(0,0,width,height).data;
  return new Promise((resolve,reject)=>{
    const worker=new Worker('geometry-worker.js');state.worker=worker;state.reject=reject;
    const fail=message=>{worker.terminate();state.worker=null;state.reject=null;clearTimeout(state.timer);setBusy(false);status(message,'error');reject(new Error(message));};
    state.timer=setTimeout(()=>fail('Proses terlalu lama. Coba kurangi jumlah warna atau ukuran gambar.'),180000);
    worker.onerror=()=>fail('Mesin konversi tidak dapat berjalan. Muat ulang halaman dan coba lagi.');
    worker.onmessage=({data})=>{
      if(job!==state.job)return;
      if(data.progress){localizedText('progress-label',data.progress);status(data.progress);return;}
      if(data.error){fail(data.error);return;}
      clearTimeout(state.timer);worker.terminate();state.worker=null;state.reject=null;state.stats=data.stats;
      state.svg=data.svg;state.resultURL=URL.createObjectURL(new Blob([data.svg],{type:'image/svg+xml'}));$('vector-image').src=state.resultURL;$('canvas').classList.add('has-result');$('result-placeholder').hidden=true;$('split-line').hidden=false;$('compare-slider').hidden=false;
      const count=data.stats.cubics+data.stats.lines;const seconds=((performance.now()-start)/1000).toFixed(1);localizedText('stats',`${data.stats.lines} garis · ${data.stats.cubics} kurva · ${(new Blob([data.svg]).size/1024).toFixed(1)} KB`);
      setBusy(false);status(`Selesai ${seconds} dtk${opts.ai==='realesrgan'?' · AI lokal':''} · ${data.stats.compared} hasil diperiksa.`,'success');updateSplit();resolve({segments:count,width:state.width,height:state.height});
    };
    worker.postMessage({pixels:pixels.buffer,width,height,sourceWidth:outputWidth,sourceHeight:outputHeight,settings:opts},[pixels.buffer]);
  });
}
// Export the generated quadratic paths as cubic Bezier paths in true EPS.
function toEPS(svg){
 const doc=new DOMParser().parseFromString(svg,'image/svg+xml');const root=doc.documentElement;const box=root.getAttribute('viewBox').split(/\s+/).map(Number);const w=Number(root.getAttribute('width')),h=Number(root.getAttribute('height'));
 const n=value=>Number(value.toFixed(4)).toString();const lines=['%!PS-Adobe-3.0 EPSF-3.0','%%Creator: BNIGHT Vector Studio','%%BoundingBox: 0 0 '+Math.ceil(w)+' '+Math.ceil(h),'%%HiResBoundingBox: 0 0 '+w+' '+h,'%%LanguageLevel: 2','%%Pages: 1','%%EndComments','gsave',`0 ${h} translate`,`1 -1 scale`,`${n(w/box[2])} ${n(h/box[3])} scale`,'1 setlinejoin','1 setlinecap'];
 for(const path of doc.querySelectorAll('path')){
   const alpha=Number(path.getAttribute('opacity')??1);if(alpha===0)continue;
   const color=path.getAttribute('fill').match(/[\d.]+/g).map(Number);lines.push(color.slice(0,3).map(v=>n(v/255*alpha+1-alpha)).join(' ')+' setrgbcolor','newpath');
   const tokens=path.getAttribute('d').match(/[MLQCZmlqcz]|[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)||[];let i=0,x=0,y=0,sx=0,sy=0;
   while(i<tokens.length){const op=tokens[i++];if(op==='M'||op==='L'){x=Number(tokens[i++]);y=Number(tokens[i++]);lines.push(`${n(x)} ${n(y)} ${op==='M'?'moveto':'lineto'}`);if(op==='M'){sx=x;sy=y;}}
     else if(op==='Q'){const qx=Number(tokens[i++]),qy=Number(tokens[i++]),ex=Number(tokens[i++]),ey=Number(tokens[i++]);lines.push([x+2/3*(qx-x),y+2/3*(qy-y),ex+2/3*(qx-ex),ey+2/3*(qy-ey),ex,ey].map(n).join(' ')+' curveto');x=ex;y=ey;}
     else if(op==='C'){const values=tokens.slice(i,i+6).map(Number);i+=6;lines.push(values.map(n).join(' ')+' curveto');x=values[4];y=values[5];}
     else if(op.toUpperCase()==='Z'){lines.push('closepath');x=sx;y=sy;}else throw new Error('Jenis kurva ini belum didukung untuk EPS. Unduh SVG.');
   }
   const stroke=Number(path.getAttribute('stroke-width')||0);lines.push('gsave eofill grestore');if(stroke>0)lines.push(`${n(stroke)} setlinewidth stroke`);else lines.push('newpath');
 }
 lines.push('grestore','showpage','%%EOF');return lines.join('\n');
}
function download(){if(!state.svg)return;try{const format=$('format').value;const blob=new Blob([format==='eps'?toEPS(state.svg):state.svg],{type:format==='eps'?'application/postscript':'image/svg+xml'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=state.name+'-vector.'+format;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);status(`${format.toUpperCase()} siap diunduh.`,'success');}catch(error){status(error.message,'error');}}
$('file-input').addEventListener('change',event=>{void chooseFiles(event.target.files);event.target.value='';});['new-file','dropzone'].forEach(id=>$(id).addEventListener('click',()=>$('file-input').click()));
const dropzone=$('dropzone');['dragenter','dragover'].forEach(name=>dropzone.addEventListener(name,e=>{e.preventDefault();dropzone.classList.add('dragging');}));['dragleave','drop'].forEach(name=>dropzone.addEventListener(name,e=>{e.preventDefault();dropzone.classList.remove('dragging');}));dropzone.addEventListener('drop',e=>void chooseFiles(e.dataTransfer.files));
$('use-demo').addEventListener('click',demo);$('convert').addEventListener('click',()=>convert().catch(()=>{}));$('cancel').addEventListener('click',cancel);$('download').addEventListener('click',download);
document.querySelectorAll('[role=tab]').forEach(button=>{button.addEventListener('click',()=>setMode(button.dataset.mode));button.addEventListener('keydown',e=>{const modes=['compare','original','vector'];let index=modes.indexOf(state.mode);if(e.key==='ArrowRight')index=(index+1)%3;else if(e.key==='ArrowLeft')index=(index+2)%3;else return;e.preventDefault();setMode(modes[index]);$('tab-'+modes[index]).focus();});});
$('zoom-in').addEventListener('click',()=>setZoom(state.zoom+.25));$('zoom-out').addEventListener('click',()=>setZoom(state.zoom-.25));$('zoom-reset').addEventListener('click',resetView);$('compare-slider').addEventListener('input',updateSplit);window.addEventListener('resize',renderView);
new ResizeObserver(renderView).observe($('viewport'));
// Capture divider gestures separately so they never start image panning.
const divider=$('split-line');let splitPointer=null;
function moveDivider(event){
  const rect=$('viewport').getBoundingClientRect();
  if(!rect.width)return;
  $('compare-slider').value=Math.max(0,Math.min(100,(event.clientX-rect.left)/rect.width*100));
  updateSplit();
}
divider.addEventListener('pointerdown',event=>{
  if(event.button!==0||state.busy||!state.svg||state.mode!=='compare'||splitPointer!==null)return;
  event.preventDefault();event.stopPropagation();
  splitPointer=event.pointerId;divider.setPointerCapture(event.pointerId);
  $('compare-slider').focus({preventScroll:true});moveDivider(event);
});
divider.addEventListener('pointermove',event=>{
  if(event.pointerId===splitPointer){event.stopPropagation();moveDivider(event);}
});
function endDivider(event){
  if(event.pointerId!==splitPointer)return;
  splitPointer=null;
  if(divider.hasPointerCapture(event.pointerId))divider.releasePointerCapture(event.pointerId);
}
['pointerup','pointercancel','lostpointercapture'].forEach(name=>divider.addEventListener(name,endDivider));
const preview=$('canvas');let panGesture=null;
preview.addEventListener('wheel',event=>{
  if(!state.image||state.busy||!event.deltaY)return;
  event.preventDefault();
  const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?preview.clientHeight:1);
  setZoom(state.zoom*Math.exp(-Math.max(-100,Math.min(100,delta))*.002),event);
},{passive:false});
preview.addEventListener('pointerdown',event=>{
  if(!state.image||state.busy||state.zoom<=1||event.button!==0||event.target.closest('input,button,#split-line'))return;
  event.preventDefault();
  panGesture={id:event.pointerId,x:event.clientX,y:event.clientY,panX:state.panX,panY:state.panY};
  preview.setPointerCapture(event.pointerId);preview.classList.add('is-panning');
});
preview.addEventListener('pointermove',event=>{
  if(!panGesture||panGesture.id!==event.pointerId)return;
  state.panX=panGesture.panX+event.clientX-panGesture.x;
  state.panY=panGesture.panY+event.clientY-panGesture.y;renderView();
});
function endPan(event){
  if(!panGesture||panGesture.id!==event.pointerId)return;
  panGesture=null;preview.classList.remove('is-panning');
  if(preview.hasPointerCapture(event.pointerId))preview.releasePointerCapture(event.pointerId);
}
['pointerup','pointercancel','lostpointercapture'].forEach(name=>preview.addEventListener(name,endPan));
['colors','smooth','detail','remove-bg','straight','optimize','ai-mode'].forEach(id=>$(id).addEventListener('input',()=>{if(['colors','smooth','detail'].includes(id))$('preset').value='custom';updateLabels();if(state.svg){clearResult();status('Pengaturan berubah. Klik Buat vektor untuk memperbarui hasil.');}}));
$('preset').addEventListener('change',()=>{const presets={logo:[16,50,4],detail:[32,25,1],mono:[2,50,4]};const values=presets[$('preset').value];if(values)['colors','smooth','detail'].forEach((id,i)=>$(id).value=values[i]);updateLabels();if(state.svg){clearResult();status('Preset berubah. Klik Buat vektor untuk memperbarui hasil.');}});
if(document.modelContext?.registerTool){const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});try{Promise.resolve(document.modelContext.registerTool({name:'read_vector_status',description:'Read whether a source image and downloadable vector are ready.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:input=>{if(!input||Object.keys(input).length)throw new Error('Expected an empty object.');return {source:state.image?state.name:null,busy:state.busy,vectorReady:!!state.svg,width:state.width,height:state.height};}},{signal:lifecycle.signal})).catch(()=>{});}catch{}}
function applyLocalSettings(){
  const config=window.BNIGHT_LOCAL_SETTINGS;
  if(!config||typeof config!=='object')return;
  const bounded=(value,min,max,fallback)=>typeof value==='number'&&Number.isFinite(value)?Math.max(min,Math.min(max,Math.round(value))):fallback;
  $('preset').value=['logo','detail','mono','custom'].includes(config.preset)?config.preset:'logo';
  $('colors').value=$('preset').value==='mono'?2:bounded(config.jumlahWarna,1,64,16);
  $('smooth').value=bounded(config.kehalusan,0,100,50);
  $('detail').value=bounded(config.buangBintik,0,24,4);
  $('remove-bg').checked=config.hapusLatarPutih===true;
  $('format').value=config.formatUnduhan==='eps'?'eps':'svg';
  $('straight').checked=config.garisLurus!==false;
  $('optimize').checked=config.bandingkanRender!==false;
  $('ai-mode').value=config.ai==='realesrgan'?'realesrgan':'none';
}
applyLocalSettings();updateLabels();











