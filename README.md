# B'night Vector Studio — GitHub Pages

Versi browser tanpa AI, terpisah dari aplikasi Windows lokal.
Gambar diproses di browser pengunjung, bukan diunggah ke server.

## Upload dan aktifkan Pages
1. Buat repository GitHub baru (public untuk GitHub Pages pada paket Free).
2. Unggah seluruh ISI folder github-pages ke root repository. Jangan hanya mengunggah ZIP atau folder pembungkus github-pages.
3. Pastikan index.html, app.js, local-settings.js, assets/, dan vendor/ ada di root beserta file lain paket ini.
4. Buka Settings > Pages > Build and deployment.
5. Pilih Deploy from a branch, branch main, folder / (root), lalu Save.
6. Tunggu deployment selesai. Buka URL yang ditampilkan GitHub Pages.

Contoh URL: https://USERNAME.github.io/NAMA-REPOSITORY/
Path aset relatif sehingga situs mendukung nama repository yang berbeda.
File .nojekyll disertakan; jika upload browser melewatkannya, buat file kosong
bernama .nojekyll melalui Add file > Create new file.

## Fitur
Konversi SVG/EPS, batch dan ZIP, Undo/Redo, koreksi perspektif/kemiringan,
kontrol sudut, deteksi geometris, perapian busur, ekspor warna, ID/EN.
Tidak ada Real-ESRGAN, program .exe, server PowerShell, atau endpoint /api/upscale.
Tidak perlu MULAI.bat, XAMPP, atau instalasi AI bagi pengunjung.

## Batasan
Gunakan browser modern. Performa bergantung pada perangkat pengunjung.
Antrean dan hasil hilang saat halaman dimuat ulang; unduh dahulu.
Versi ini tidak memasang service worker/offline cache.
SVG per warna memakai mask; ubah mask menjadi path sebelum digunakan untuk cutting.
Kebijakan penggunaan GitHub Pages tetap berlaku.

## Pengaturan dan lisensi
Ubah local-settings.js untuk nilai awal. Pertahankan ai: "none".
Pertahankan LICENSE-BNIGHT.txt dan vendor/LICENSE saat membagikan kode.
Folder assets/ berisi logo dan contoh bawaan; hak aset mengikuti pemiliknya.

Versi lokal utama dan cadangan ZIP berada di luar folder ini. Jangan unggah
folder backups, .run, atau ai saat mempublikasikan versi web ini.
