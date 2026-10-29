# Upload Sensus Blok ke Google Sheets — petunjuk pemasangan

Hasil: folder **sensus** di Google Drive Anda → 1 file per estate → 1 tab per jenis sensus.
Hanya akun Anda yang memiliki/dapat membuka file (tidak dibagikan ke siapa pun). Foto tidak diupload.

## Pasang skrip (sekali saja)
1. Buka https://script.google.com → **Proyek baru**.
2. Hapus isi default, tempel seluruh isi `Code.gs`.
3. Ubah baris `const KUNCI = '...'` menjadi kata sandi rahasia buatan Anda (campur huruf & angka, min. 16 karakter).
4. Klik **Terapkan → Deployment baru** → jenis **Aplikasi web**:
   - Jalankan sebagai: **Saya**
   - Yang memiliki akses: **Siapa saja**
   (akses file spreadsheet tetap hanya milik Anda; yang "siapa saja" hanya URL penerima, dan dilindungi KUNCI)
5. Klik **Terapkan**, izinkan akses Drive & Sheets (akun Anda sendiri; bila muncul "aplikasi belum diverifikasi" pilih Lanjutan → Lanjutkan).
6. Salin **URL aplikasi web** (berakhiran `/exec`).

## Hubungkan aplikasi
Aplikasi → Pengaturan → Umum → **Upload ke Spreadsheet**: isi URL dan Kunci yang sama → **Simpan** → **Tes koneksi**.

## Memakai
Tab Rekap (atau Lihat dari Riwayat) → **☁️ Upload ke Spreadsheet**.
- Data dikirim per estate (nama estate pada data menentukan nama file) dan per jenis sensus (nama tab).
- Upload ulang aman: setiap pokok punya ID unik, baris yang sama diperbarui, tidak dobel.
- Setelah mengubah kode skrip, buat **Deployment baru** (URL tetap sama bila memilih "Kelola deployment → edit → versi baru").
- Jaga konsistensi nama estate ("SM2" dan "SM 2" dianggap sama; huruf besar/kecil diabaikan).
