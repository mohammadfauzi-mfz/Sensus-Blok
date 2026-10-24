# Sensus Blok v2.0 — catatan perubahan

## Penyebab HP hang saat import GeoPDF (v1.9)
Log diagnosa menunjukkan 2 kali ANR ("Input dispatching timed out") tepat saat import peta. Penyebabnya:
pdf.js merender halaman PDF sampai 16.384 px di thread utama WebView, memotongnya jadi tile 512 px,
meng-encode JPEG ratusan kali, lalu menulis semuanya ke IndexedDB. Selama itu layar tidak bisa disentuh.

## Perbaikan (meniru cara CKPReport)
- Plugin native baru `PdfMapPlugin` (android.graphics.pdf.PdfRenderer), berjalan di thread latar sendiri.
- Impor: PDF disalin ke penyimpanan aplikasi -> data georeferensi dibaca -> SATU kali render JPEG
  (maks 4096 px, otomatis lebih kecil di HP RAM kecil) -> selesai. Tidak ada lagi piramida tile / pdf.js.
- Saat zoom dekat, hanya wilayah yang terlihat dirender ulang dari PDF asli (tajam, ringan, antrean
  mendahulukan tile yang sedang terlihat).
- pdf.js (+ font, cmaps) dihapus: aplikasi lebih kecil dan startup lebih cepat.

## Fitur
1. Tab Rekap: sesi dengan jenis sensus + blok yang sama otomatis digabung (nama blok tidak peka
   huruf besar/kecil & spasi). Tersedia tombol "Share Excel + Foto (WA)": file .xlsx berisi sheet
   Rekap (ringkasan + peta areal) dan sheet Data (satu baris per data + foto tertanam).
   Share teks, CSV, laporan peta+foto, data tim, dan export GIS ikut memakai data gabungan.
2. Kunci GPS: siap bila akurasi <= 15 m (konstanta GPS_MAX di app.js).
3. Struktur & kinerja:
   - JavaScript dipisah dari index.html menjadi app.js.
   - Sensor lux: polling 1 detik, UI hanya diperbarui bila nilai berubah berarti, berhenti saat app di latar.
   - Pratinjau foto tidak digambar ulang bila teks watermark tidak berubah.
   - Daftar "Koreksi Data" di rekap menampilkan 100 data terakhir (tombol "Tampilkan semua").
