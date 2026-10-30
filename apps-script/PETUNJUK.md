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

## Hubungkan aplikasi (pengguna lain tidak perlu mengisi apa pun)
**Bawaan saat ini:** URL dan kunci sudah tertulis sebagai isian bawaan di `www/app.js` (konstanta `GS_URL_B`, `GS_KEY_B`), sehingga tidak perlu secret. Secret `GS_URL`/`GS_KEY` (di bawah) bila diisi akan menimpa bawaan itu.\n\n**Opsional — ditanam saat build (GitHub Secrets):**
1. Di GitHub repo: Settings → Secrets and variables → Actions → New repository secret.
2. Buat secret `GS_URL` (isi URL `/exec`) dan `GS_KEY` (isi kunci yang sama dengan `KUNCI` di skrip).
3. Build ulang. APK hasil build sudah berisi URL & kunci, jadi tombol Upload langsung bisa dipakai di semua HP.

**Halaman admin tersembunyi (mengubah/menguji tanpa build ulang, hanya di HP itu):**
Menu ⓘ (About) → ketuk tulisan **Mohammad Fauzi** 5× (jeda antar ketukan maks. 3 detik) →
halaman "Pengaturan Upload": ubah URL/kunci, **Tes koneksi**, **Simpan**, atau **Kembalikan ke bawaan aplikasi**.

Catatan keamanan: kunci yang tertanam di APK dapat dibongkar oleh orang yang memegang APK. Orang itu hanya bisa
menambah/memperbarui baris (skrip tidak pernah mengirim isi spreadsheet), tetapi bisa mengotori data. Bila kunci bocor:
ganti `KUNCI` di skrip + secret `GS_KEY`, lalu build ulang. Ketuk-5× bukan pengaman sungguhan, hanya menyembunyikan menu.

## Memakai
Tab Rekap (atau Lihat dari Riwayat) → **☁️ Upload ke Spreadsheet**.
- Data dikirim per estate (nama estate pada data menentukan nama file) dan per jenis sensus (nama tab).
- Upload ulang aman: setiap pokok punya ID unik, baris yang sama diperbarui, tidak dobel.
- Setelah mengubah kode skrip, buat **Deployment baru** (URL tetap sama bila memilih "Kelola deployment → edit → versi baru").
- Jaga konsistensi nama estate ("SM2" dan "SM 2" dianggap sama; huruf besar/kecil diabaikan).
