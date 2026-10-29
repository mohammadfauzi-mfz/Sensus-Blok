/**
 * SENSUS BLOK — penerima upload ke Google Sheets
 *
 * Struktur di Google Drive (milik akun yang memasang skrip ini):
 *   folder "sensus"
 *     └─ 1 file spreadsheet per estate (nama file = nama estate)
 *          └─ 1 tab per jenis sensus (nama tab = jenis sensus)
 *
 * Kolom A tiap tab = ID unik pokok. Upload ulang data yang sama memperbarui baris itu (tidak dobel).
 * Foto tidak diupload. Seluruh file hanya dapat dibuka oleh pemilik akun (tidak dibagikan).
 *
 * Penggunaan: lihat PETUNJUK.md
 */

// ===== UBAH INI: kunci rahasia (harus sama dengan yang diisi di aplikasi) =====
const KUNCI = 'GANTI-DENGAN-KUNCI-RAHASIA-ANDA';
const NAMA_FOLDER = 'sensus';

const norm = s => String(s == null ? '' : s).toLowerCase().replace(/\s+/g, '');
const out = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);

function doGet(e) {                       // tes koneksi dari aplikasi
  const p = (e && e.parameter) || {};
  if (p.key !== KUNCI) return out({ ok: false, error: 'Kunci salah.' });
  const f = folder_(false);
  return out({ ok: true, pesan: 'Terhubung', folder: NAMA_FOLDER, folderAda: !!f });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const d = JSON.parse(e.postData.contents);
    if (d.key !== KUNCI) return out({ ok: false, error: 'Kunci salah.' });
    if (!d.estate || !String(d.estate).trim()) return out({ ok: false, error: 'Nama estate kosong.' });
    if (!d.jenis) return out({ ok: false, error: 'Jenis sensus kosong.' });
    if (!d.headers || !d.headers.length || d.headers[0] !== 'ID') return out({ ok: false, error: 'Format data tidak valid.' });
    const rows = d.rows || [];
    const ss = spreadsheet_(String(d.estate).trim());
    const sh = sheet_(ss, String(d.jenis));
    const r = tulis_(sh, d.headers, rows);
    return out({ ok: true, estate: ss.getName(), tab: sh.getName(), baru: r.baru, diperbarui: r.upd, url: ss.getUrl() });
  } catch (err) {
    return out({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function folder_(buat) {
  const it = DriveApp.getFoldersByName(NAMA_FOLDER);
  if (it.hasNext()) return it.next();
  return buat ? DriveApp.createFolder(NAMA_FOLDER) : null;
}

function spreadsheet_(estate) {
  const fo = folder_(true), it = fo.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    if (f.getMimeType() === MimeType.GOOGLE_SHEETS && norm(f.getName()) === norm(estate)) return SpreadsheetApp.openById(f.getId());
  }
  const ss = SpreadsheetApp.create(estate);
  DriveApp.getFileById(ss.getId()).moveTo(fo);          // pindah dari root Drive ke folder "sensus"
  return ss;
}

function sheet_(ss, jenis) {
  const nama = String(jenis).replace(/[\[\]\*\?\/\\:]/g, '-').slice(0, 99);
  let sh = ss.getSheets().filter(s => norm(s.getName()) === norm(nama))[0];
  if (!sh) {
    sh = ss.insertSheet(nama);
    const lain = ss.getSheets();                         // hapus "Sheet1" bawaan bila masih kosong
    if (lain.length > 1) {
      const s1 = lain.filter(s => s.getName() === 'Sheet1' && s.getLastRow() === 0)[0];
      if (s1) ss.deleteSheet(s1);
    }
  }
  return sh;
}

function tulis_(sh, headers, rows) {
  // 1. header: samakan berdasarkan NAMA kolom; kolom baru ditambahkan di kanan
  let lastCol = sh.getLastColumn();
  let cur = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
  if (!cur.length) {
    cur = headers.slice();
    sh.getRange(1, 1, 1, cur.length).setValues([cur]).setFontWeight('bold').setBackground('#e8f5e9');
    sh.setFrozenRows(1);
    sh.getRange(1, 1, sh.getMaxRows(), 1).setNumberFormat('@');      // ID selalu teks
  } else {
    const baru = headers.filter(h => cur.indexOf(h) < 0);
    if (baru.length) {
      sh.getRange(1, cur.length + 1, 1, baru.length).setValues([baru]).setFontWeight('bold').setBackground('#e8f5e9');
      cur = cur.concat(baru);
    }
  }
  const W = cur.length, idx = headers.map(h => cur.indexOf(h));
  const susun = r => { const a = new Array(W).fill(''); idx.forEach((c, i) => { a[c] = r[i] == null ? '' : r[i]; }); return a; };

  // 2. peta ID -> nomor baris
  const last = sh.getLastRow();
  const ids = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map(x => String(x[0])) : [];
  const pos = {}; ids.forEach((id, i) => { pos[id] = i + 2; });

  // 3. pisahkan baru / pembaruan
  const tambah = [], ubah = [], tpos = {};
  rows.forEach(r => {
    const id = String(r[0]);
    if (pos[id]) ubah.push([pos[id], susun(r)]);
    else if (tpos[id] !== undefined) tambah[tpos[id]] = susun(r);        // ID ganda dalam satu kiriman: yang terakhir dipakai
    else { tpos[id] = tambah.length; tambah.push(susun(r)); }
  });

  // 4. tulis
  if (ubah.length > 200 && last > 1) {                   // banyak pembaruan: tulis ulang blok sekaligus
    const rng = sh.getRange(2, 1, last - 1, W), vals = rng.getValues();
    ubah.forEach(([row, a]) => {
      const old = vals[row - 2];
      // pertahankan isi kolom yang tidak dikirim aplikasi (mis. kolom tambahan manual)
      for (let c = 0; c < W; c++) if (idx.indexOf(c) < 0) a[c] = old[c];
      vals[row - 2] = a;
    });
    rng.setValues(vals);
  } else {
    ubah.forEach(([row, a]) => {
      const old = sh.getRange(row, 1, 1, W).getValues()[0];
      for (let c = 0; c < W; c++) if (idx.indexOf(c) < 0) a[c] = old[c];
      sh.getRange(row, 1, 1, W).setValues([a]);
    });
  }
  if (tambah.length) {
    const start = Math.max(sh.getLastRow(), 1) + 1;
    if (start + tambah.length - 1 > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), start + tambah.length - 1 - sh.getMaxRows());
    sh.getRange(start, 1, tambah.length, W).setValues(tambah);
  }
  return { baru: tambah.length, upd: ubah.length };
}
