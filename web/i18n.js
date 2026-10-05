'use strict';
// Keep original text bindings so switching language never replaces controls or images.
const translations = {
'Haluskan busur lengkung':'Smooth curved arcs','Kurangi gelombang piksel dan rapikan bagian yang mendekati busur lingkaran. Matikan untuk mengikuti tepi asli.':'Reduce pixel ripples and refine near-circular arcs. Turn off to follow the original edges.',
'Koreksi & bentuk':'Correction & shapes','Koreksi kemiringan (°)':'Straighten image (°)','Koreksi perspektif':'Perspective correction',
'Tentukan empat sudut bidang pada gambar sumber (%). Urutan: kiri atas, kanan atas, kanan bawah, kiri bawah.':'Enter the four corners on the source image (%): top left, top right, bottom right, bottom left.',
'Kiri atas':'Top left','Kanan atas':'Top right','Kanan bawah':'Bottom right','Kiri bawah':'Bottom left',
'Kiri atas X':'Top left X','Kiri atas Y':'Top left Y','Kanan atas X':'Top right X','Kanan atas Y':'Top right Y','Kanan bawah X':'Bottom right X','Kanan bawah Y':'Bottom right Y','Kiri bawah X':'Bottom left X','Kiri bawah Y':'Bottom left Y',
'X = horizontal, Y = vertikal. Koreksi diterapkan saat konversi.':'X = horizontal, Y = vertical. Correction is applied when converting.',
'Karakter sudut':'Corner style','Otomatis':'Automatic','Sudut tajam':'Sharp corners','Sudut membulat':'Rounded corners','Rapikan bentuk geometris':'Refine geometric shapes',
'Deteksi lingkaran, elips, dan persegi yang sejajar sumbu. Matikan jika detail logo berubah.':'Detect circles, ellipses, and axis-aligned rectangles. Turn off if logo details change.',
'ZIP per warna (SVG)':'ZIP by color (SVG)','SVG bergrup warna':'SVG color groups',
'Nilai koreksi tidak valid.':'Invalid correction value.','Empat sudut harus membentuk bidang cembung dan tidak bersilangan.':'The four corners must form a convex, non-crossing quadrilateral.',
'Konversi banyak gambar':'Batch conversion','Semua gambar memakai pengaturan saat ini. Maks. 15 MB per gambar.':'All images use the current settings. Max. 15 MB per image.',
'Konversi semua':'Convert all','Unduh ZIP':'Download ZIP','Menunggu':'Waiting','Memproses':'Processing','Selesai':'Done','Gagal':'Failed','Dibatalkan':'Canceled','Unduh':'Download',
'Batch selesai. Hasil tersedia di daftar gambar.':'Batch complete. Results are available in the image list.',
'Batch dibatalkan. Hasil yang sudah selesai tetap dapat diunduh.':'Batch canceled. Completed results can still be downloaded.',
'Pengaturan dipulihkan. Klik Buat vektor untuk memperbarui hasil.':'Settings restored. Click Create vector to update the result.',
'Pilih satu atau beberapa gambar sekaligus.':'Choose one or multiple images at once.',
'1 warna menghasilkan siluet hitam dengan latar transparan.':'1 color creates a black silhouette on a transparent background.',
'File tidak valid atau tidak dapat dibaca.':'Invalid or unreadable file.',
'↶ Undo':'↶ Undo','↷ Redo':'↷ Redo',
'DARI BITMAP KE VEKTOR':'FROM BITMAP TO VECTOR',
'Diproses di perangkatmu':'Processed on your device','LOKAL V2':'LOCAL V2','Pilihan bahasa':'Language selection',
'Unggah gambar. Atur detail. Buat siap diperbesar.':'Upload an image. Refine the details. Scale it up.',
'＋ Gambar baru':'＋ New image','Gambar sumber':'Source image','Pilih atau tarik gambar':'Choose or drop an image','JPG, PNG, WebP · Maks. 15 MB':'JPG, PNG, WebP · Max. 15 MB',
'Coba logo BNIGHT':'Try the BNIGHT logo','Atur hasil':'Adjust output','Pembersihan gambar':'Image cleanup','Asli · tanpa AI':'Original · no AI','Real-ESRGAN · 2× lokal':'Real-ESRGAN · 2× local',
'AI dapat mengubah detail huruf. Bandingkan dengan gambar asli.':'AI may alter lettering details. Compare with the original image.',
'Karakter gambar':'Image type','Logo & lettering':'Logo & lettering','Ilustrasi detail':'Detailed illustration','Hitam & putih':'Black & white','Pengaturan sendiri':'Custom settings',
'Jumlah warna':'Number of colors','Sederhana':'Simpler','Lebih kaya':'Richer','Kehalusan kurva':'Curve smoothing','Ikuti detail':'Keep details','Lebih halus':'Smoother','Buang bintik kecil':'Remove small specks',
'Nilai tinggi bisa menghilangkan ornamen kecil.':'Higher values may remove small ornaments.','Hapus latar putih':'Remove white background','Pertahankan garis lurus':'Preserve straight lines','Bandingkan hasil render':'Compare rendered results',
'Tepi subpiksel, sudut tajam, dan sambungan Bézier aktif. Tiga hasil dibandingkan saat pemeriksaan render aktif.':'Subpixel edges, sharp corners, and Bézier joins are enabled. Three results are compared when render checking is enabled.',
'Buat vektor':'Create vector','Batalkan proses':'Cancel processing','BNIGHT Geometry 2 · sepenuhnya lokal':'BNIGHT Geometry 2 · fully local','Gradasi masih berupa bidang warna.':'Gradients are represented as color regions.',
'Pratinjau gambar':'Image preview','Mode pratinjau':'Preview mode','Bandingkan':'Compare','Asli':'Original','Vektor':'Vector','Perkecil':'Zoom out','Atur ulang zoom':'Reset zoom','Perbesar':'Zoom in',
'GAMBAR ASLI':'ORIGINAL IMAGE','HASIL KONVERSI':'CONVERTED RESULT','VEKTOR':'VECTOR','Gambar asli':'Original image','Hasil vektorisasi':'Vectorized result',
'Mulai dari sebuah gambar.':'Start with an image.','Logo, lettering, atau ilustrasi favoritmu.':'Your favorite logo, lettering, or illustration.','HASIL VEKTOR':'VECTOR RESULT','Siap setelah kamu klik':'Ready after you click',
'Geser perbandingan gambar asli dan vektor':'Slide to compare the original image and vector','Menyusun kurva dan warna…':'Building curves and colors…','Gambar tetap di perangkatmu.':'Your image stays on your device.',
'Scroll untuk zoom · Tarik gambar saat diperbesar untuk menggeser.':'Scroll to zoom · Drag the enlarged image to pan.',
'Pilih gambar untuk mulai.':'Choose an image to start.','Siap untuk langkah berikutnya.':'Ready for the next step.','Vektor yang dapat diedit di aplikasi desainmu.':'Editable vectors for your design app.','Format unduhan':'Download format','↓ Unduh vektor':'↓ Download vector',
'Periksa huruf dan ornamen sebelum produksi. Hasil belum setara EPS acuan.':'Check lettering and ornaments before production. Results do not yet match the reference EPS.','Mesin & lisensi':'Engine & licenses',
'Ubah logo dan ilustrasi menjadi vektor. Atur warna, haluskan kurva, bandingkan hasil, lalu unduh SVG atau EPS.':'Turn logos and illustrations into vectors. Adjust colors, smooth curves, compare results, and download SVG or EPS.',
'Gambar siap. Klik Buat vektor untuk memproses.':'Image ready. Click Create vector to process.',
'Pilih gambar JPG, PNG, atau WebP. EPS dipakai sebagai hasil, bukan gambar masukan.':'Choose a JPG, PNG, or WebP image. EPS is an output format, not an input image.',
'Gambar melebihi 15 MB. Pilih file yang lebih kecil.':'Image exceeds 15 MB. Choose a smaller file.','Resolusi terlalu besar. Gunakan gambar di bawah 40 megapiksel.':'Resolution too large. Use an image under 40 megapixels.',
'File tidak dapat dibaca. Coba gambar lain.':'Cannot read this file. Try another image.','Contoh belum bisa dimuat. Silakan pilih gambar sendiri.':'Cannot load the sample. Please choose your own image.',
'Pilih gambar sebelum memproses.':'Choose an image before processing.','Memproses gambar…':'Processing image…','Real-ESRGAN membersihkan gambar di GPU lokal…':'Real-ESRGAN is cleaning the image on the local GPU…',
'AI lokal berjalan. Proses pertama dapat memerlukan waktu lebih lama.':'Local AI is running. The first run may take longer.','AI lokal gagal. Pilih Asli untuk memakai mesin geometri tanpa AI.':'Local AI failed. Choose Original to use the geometry engine without AI.',
'AI melewati batas waktu. Coba tanpa AI.':'AI timed out. Try without AI.','Proses terlalu lama. Coba kurangi jumlah warna atau ukuran gambar.':'Processing timed out. Try fewer colors or a smaller image.',
'Mesin konversi tidak dapat berjalan. Muat ulang halaman dan coba lagi.':'The conversion engine could not start. Reload the page and try again.',
'Proses dibatalkan. Proses AI yang sudah dimulai mungkin perlu beberapa saat untuk berhenti.':'Processing canceled. AI that has already started may take a while to stop.','Dibatalkan':'Canceled',
'Jenis kurva ini belum didukung untuk EPS. Unduh SVG.':'This curve type is not yet supported for EPS. Download SVG.',
'Pengaturan berubah. Klik Buat vektor untuk memperbarui hasil.':'Settings changed. Click Create vector to update the result.','Preset berubah. Klik Buat vektor untuk memperbarui hasil.':'Preset changed. Click Create vector to update the result.',
'Memisahkan bidang warna…':'Separating color regions…','Menyambung garis dan kurva Bézier…':'Joining lines and Bézier curves…','Konversi gagal.':'Conversion failed.',
'Komponen Real-ESRGAN tidak lengkap. Ekstrak seluruh paket V2, atau gunakan mode Asli.':'Real-ESRGAN components are missing. Extract the complete V2 package or use Original mode.',
'Masukan AI terlalu besar. Maksimal 1 megapiksel.':'AI input is too large. Maximum: 1 megapixel.',
'AI melewati 180 detik. Gunakan mode Asli atau gambar lebih kecil.':'AI exceeded 180 seconds. Use Original mode or a smaller image.',
'Real-ESRGAN gagal pada GPU/driver ini. Gunakan mode Asli; mesin geometri tetap bekerja.':'Real-ESRGAN failed on this GPU/driver. Use Original mode; the geometry engine still works.',
'Ukuran unggahan AI tidak valid.':'Invalid AI upload size.','Unggahan terputus.':'Upload interrupted.'
};
let language='id';
try{if(localStorage.getItem('bvs-language')==='en')language='en';}catch{}
function translate(message){
 if(language==='id')return message;
 if(translations[message])return translations[message];
 return message.replace(/^Menelusuri tepi subpiksel (.+)…$/,'Tracing subpixel edges $1…')
 .replace(/^Membandingkan hasil render (.+)…$/,'Comparing rendered results $1…')
 .replace(/^(\d+) garis · (\d+) kurva · (.+)$/,'$1 lines · $2 curves · $3')
 .replace(/^Selesai ([\d.]+) dtk( · AI lokal)? · (\d+) hasil diperiksa\.$/,(_,seconds,ai,count)=>`Done in ${seconds} s${ai?' · local AI':''} · ${count} results checked.`)
 .replace(/^(SVG|EPS) siap diunduh\.$/,'$1 ready to download.');
}
const languageBindings=[];
const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
while(walker.nextNode()){
 const node=walker.currentNode,original=node.textContent,key=original.trim();
 if(translations[key]&&!node.parentElement.closest('script,noscript'))languageBindings.push(()=>{node.textContent=original.replace(key,translate(key));});
}
for(const element of document.querySelectorAll('[aria-label],[alt],meta[name="description"]')){
 for(const attr of ['aria-label','alt','content']){
  const value=element.getAttribute(attr);
  if(translations[value])languageBindings.push(()=>element.setAttribute(attr,translate(value)));
 }
}
const dynamicMessages=new Map();
function localizedText(id,message){dynamicMessages.set(id,message);document.getElementById(id).textContent=translate(message);}
function setLanguage(value){
 language=value==='en'?'en':'id';document.documentElement.lang=language;
 languageBindings.forEach(render=>render());
 dynamicMessages.forEach((message,id)=>{document.getElementById(id).textContent=translate(message);});
 document.querySelectorAll('[data-language]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.language===language)));
 try{localStorage.setItem('bvs-language',language);}catch{} document.dispatchEvent(new Event('languagechange'));
}
document.querySelectorAll('[data-language]').forEach(button=>button.addEventListener('click',()=>setLanguage(button.dataset.language)));
setLanguage(language);





