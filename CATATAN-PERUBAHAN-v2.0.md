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

## Tahap 2
- Share WA (Laporan): lampiran utama = peta tracking (titik sensus + garis jejak sesuai urutan jalan).
  Opsi tambahan: kolase maks 3 foto sampel (dipilih merata dari seluruh foto).
- Tombol NEXT: getar singkat (native) + bunyi "tut". Izin VIBRATE ditambahkan di workflow.
- Koreksi data: tombol merah "HAPUS POKOK" (dengan konfirmasi). Foto ikut terhapus; nomor pokok lain
  tidak berubah (nomor berikutnya = nomor terbesar + 1) sehingga foto/watermark tetap cocok.
- Buka dari WhatsApp ("Buka dengan"/Bagikan): GeoPDF, gambar peta, backup .sbk, data tim .json,
  layer GIS (zip/shp/kml/kmz/gpx/geojson/csv). Berkas dikenali dari ekstensi atau isinya.
  Intent-filter ditambahkan otomatis oleh workflow ke AndroidManifest.
- Riwayat: tombol "Rekap" -> "Lihat" (hanya sesi itu). Tab Rekap = data gabungan.
- Tab Rekap: pilih jenis sensus, blok, tanggal dari/sampai, petugas, baris, arah masuk, estate,
  afdeling; sesi yang cocok bisa dicentang/dikeluarkan satu per satu.
- Watermark foto & teks WA memuat "Volume disensus: N pokok" (plus total blok bila ada sesi lain
  dengan jenis+blok yang sama).

## Tahap 3
- Halaman sensus: tombol oranye kecil "↶ Pokok sebelumnya" di kanan judul kartu (jauh dari NEXT).
  Dengan konfirmasi, data + foto pokok terakhir dihapus, isian lama ditampilkan kembali, foto diambil ulang.
  Nonaktif bila belum ada pokok tersimpan.

## Tahap 4 — perbaikan share WA tanpa lampiran
- Penyebab dugaan: plugin Share bawaan mengirim banyak berkas dengan tipe "*/*" + teks; WhatsApp lalu hanya
  menerima teks. Sekarang berkas dikirim lewat Intent native (PdfMap.shareFiles: ACTION_SEND/SEND_MULTIPLE,
  tipe image/*, xlsx, csv, json yang sesuai, izin baca URI via FileProvider). Dipakai oleh Laporan (peta +
  kolase), Excel, CSV, Foto, dan Data Tim. Bila native gagal, otomatis kembali ke plugin Share lama.
- Log diagnosa kini mencatat berkas yang dikirim dan isi error konsol (sebelumnya tampil "[object Object]").

## Tahap 5
- Laporan dengan kolase kini dikirim sebagai SATU gambar (peta tracking di atas, kolase foto sampel di
  bawah) + teks, karena WhatsApp gagal menerima 2 gambar sekaligus dengan teks. Tanpa kolase tetap 1 gambar peta.
