'use strict';
const batch={items:[],running:false,canceled:false};
const undoStack=[],redoStack=[];
const snapshotSettings=()=>Object.fromEntries(settingsIds.map(id=>[id,$(id).type==='checkbox'?$(id).checked:$(id).value]));
let lastSettings=snapshotSettings();
function refreshActions(){
 const locked=state.busy||batch.running;
 ['new-file','dropzone','use-demo','file-input'].forEach(id=>$(id).disabled=locked);
 $('convert').disabled=locked||!state.image;['color-zip','color-groups'].forEach(id=>$(id).disabled=locked||!state.svg);
 $('cancel').hidden=!locked;
 $('undo-settings').disabled=locked||!undoStack.length;
 $('redo-settings').disabled=locked||!redoStack.length;
 $('batch-convert').disabled=locked||!batch.items.length;
 $('batch-download').disabled=locked||!batch.items.some(item=>item.svg);
 settingsIds.forEach(id=>$(id).disabled=locked);
}
function recordSettings(){
 const next=snapshotSettings();
 if(JSON.stringify(next)===JSON.stringify(lastSettings))return;
 undoStack.push(lastSettings);if(undoStack.length>100)undoStack.shift();
 lastSettings=next;redoStack.length=0;refreshActions();
}
function restoreSettings(from,to){
 if(state.busy||batch.running||!from.length)return;
 to.push(snapshotSettings());const previous=from.pop();
 settingsIds.forEach(id=>{if($(id).type==='checkbox')$(id).checked=previous[id];else $(id).value=previous[id];});
 lastSettings=snapshotSettings();updateLabels();clearResult();
 status('Pengaturan dipulihkan. Klik Buat vektor untuk memperbarui hasil.');refreshActions();
}
settingsIds.forEach(id=>$(id).addEventListener('change',recordSettings));
$('undo-settings').addEventListener('click',()=>restoreSettings(undoStack,redoStack));
$('redo-settings').addEventListener('click',()=>restoreSettings(redoStack,undoStack));
document.addEventListener('keydown',event=>{
 if(!(event.ctrlKey||event.metaKey)||event.altKey||event.target.closest('input,textarea,select,[contenteditable=true]'))return;
 const key=event.key.toLowerCase();
 if(key==='z'||key==='y'){event.preventDefault();if(key==='y'||event.shiftKey)restoreSettings(redoStack,undoStack);else restoreSettings(undoStack,redoStack);}
});
function saveBlob(blob,name){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function resultName(item,index,format){return `${String(index+1).padStart(3,'0')}-${item.file.name.replace(/\.[^.]+$/,'').replace(/[\\/:*?"<>|]/g,'_')}-vector.${format}`;}
function resultText(item,format){return format==='eps'?toEPS(item.svg):item.svg;}
function renderBatch(){
 $('batch-panel').hidden=batch.items.length<2;
 $('batch-list').replaceChildren();
 batch.items.forEach((item,index)=>{
  const row=document.createElement('div');row.className='batch-row';
  const name=document.createElement('strong');name.textContent=`${index+1}. ${item.file.name}`;
  const label=document.createElement('span');label.textContent=translate(item.status)+(item.error?' · '+translate(item.error):'');row.append(name,label);
  if(item.svg){const download=document.createElement('button');download.className='secondary';download.textContent=translate('Unduh');download.disabled=batch.running;download.addEventListener('click',()=>{const format=$('format').value;saveBlob(new Blob([resultText(item,format)]),resultName(item,index,format));});row.append(download);}
  $('batch-list').append(row);
 });refreshActions();
}
async function chooseFiles(files){
 if(state.busy||batch.running)return;
 const list=Array.from(files);if(!list.length)return;
 batch.items=list.map(file=>({file,status:'Menunggu',svg:null,error:null}));renderBatch();
 await loadFile(list[0]);refreshActions();
}
async function convertBatch(){
 if(state.busy||batch.running)return;
 batch.running=true;batch.canceled=false;
 batch.items.forEach(item=>{item.status='Menunggu';item.error=null;item.svg=null;});renderBatch();
 try{
  for(const item of batch.items){
   if(batch.canceled)break;
   item.status='Memproses';renderBatch();
   try{
    const loaded=await loadFile(item.file);
    if(batch.canceled){item.status='Dibatalkan';break;}
    if(!loaded)throw new Error('File tidak valid atau tidak dapat dibaca.');
    await convert();
    if(batch.canceled){item.status='Dibatalkan';break;}
    item.svg=state.svg;item.status='Selesai';
   }catch(error){item.status=batch.canceled?'Dibatalkan':'Gagal';item.error=batch.canceled?null:error.message;}
   renderBatch();
  }
 }finally{
  batch.running=false;
  if(batch.canceled)batch.items.forEach(item=>{if(item.status==='Menunggu')item.status='Dibatalkan';});
  setBusy(false);renderBatch();status(batch.canceled?'Batch dibatalkan. Hasil yang sudah selesai tetap dapat diunduh.':'Batch selesai. Hasil tersedia di daftar gambar.');
 }
}
// ZIP STORE: no network dependencies and no browser multiple-download prompts.
function zipFiles(files){
 const encoder=new TextEncoder(),parts=[],directory=[];let offset=0,centralSize=0;
 const crc32=bytes=>{let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;};
 for(const file of files){
  const name=encoder.encode(file.name),data=encoder.encode(file.text),crc=crc32(data);
  const local=new Uint8Array(30+name.length),lv=new DataView(local.buffer);
  lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0x800,true);lv.setUint32(14,crc,true);lv.setUint32(18,data.length,true);lv.setUint32(22,data.length,true);lv.setUint16(26,name.length,true);local.set(name,30);
  const central=new Uint8Array(46+name.length),cv=new DataView(central.buffer);
  cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);central.set(name,46);
  parts.push(local,data);directory.push(central);offset+=local.length+data.length;centralSize+=central.length;
 }
 const end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);
 return new Blob([...parts,...directory,end],{type:'application/zip'});
}
$('batch-convert').addEventListener('click',convertBatch);
$('batch-download').addEventListener('click',()=>{
 try{const format=$('format').value;const files=batch.items.flatMap((item,index)=>item.svg?[{name:resultName(item,index,format),text:resultText(item,format)}]:[]);if(files.length)saveBlob(zipFiles(files),'BNIGHT-vectors.zip');}catch(error){status(error.message,'error');}
});
document.addEventListener('languagechange',renderBatch);
refreshActions();void demo();



