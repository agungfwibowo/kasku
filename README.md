# Kasku

Aplikasi web sederhana untuk konfirmasi pembayaran via QR code — cocok untuk warung, jualan pre-order, atau event yang butuh cara cepat mencatat siapa sudah bayar apa.

## Cara kerja

1. Admin membuat **produk** (nama + harga) dan **gencode** (QR code) yang mengarah ke produk tersebut.
2. QR code dicetak dan ditempel permanen (di dinding, meja, kemasan, dll) — bisa dipakai berkali-kali.
3. Pembeli scan QR dengan kamera HP (tanpa install app), lalu isi form: nama, jumlah, metode bayar (Cash/Transfer/QRIS), dan status (Lunas/Bayar Nanti).
4. Admin bisa memantau semua riwayat konfirmasi, validasi pembayaran, dan kelola kontak pembeli dari dashboard.

## Fitur

- QR code generator berbasis produk (gencode bisa dipakai ulang untuk produk berbeda tanpa cetak ulang)
- Halaman konfirmasi publik tanpa perlu login/app
- Kelola kontak pembeli dengan autocomplete
- Notifikasi WhatsApp otomatis setelah konfirmasi
- Pelacakan tunggakan (bayar nanti) dan pelunasan sekaligus
- Riwayat pembayaran dengan filter, validasi, dan edit
- Pengaturan info bank/QRIS untuk metode transfer

## Tech stack

Node.js, Express, EJS, penyimpanan berbasis file JSON (tanpa database).

## Instalasi

```bash
npm install
cp env.example .env
```

Isi `.env` sesuai kebutuhan (lihat `env.example` untuk daftar variabel), lalu jalankan:

```bash
npm start
```

## Syarat dan Ketentuan

- Aplikasi ini disediakan "sebagaimana adanya" (as-is), tanpa jaminan apa pun, untuk membantu proses pencatatan konfirmasi pembayaran.
- Aplikasi **tidak memproses transaksi keuangan** secara langsung (tidak terhubung ke payment gateway, bank, atau penyedia pembayaran mana pun). Semua pembayaran (cash, transfer, QRIS) dilakukan di luar sistem ini; aplikasi hanya mencatat laporan/konfirmasi dari pembeli.
- Admin bertanggung jawab penuh untuk memverifikasi kebenaran setiap konfirmasi pembayaran (misal mencocokkan dengan mutasi rekening atau bukti transfer) sebelum menandainya sebagai "Lunas" dan tervalidasi.
- Data yang dimasukkan oleh pembeli (nama, jumlah, metode) tidak diverifikasi identitasnya oleh sistem — akurasi bergantung pada kejujuran pengisi form.
- Pemilik/pengelola aplikasi tidak bertanggung jawab atas kerugian yang timbul dari kesalahan input, penyalahgunaan tautan konfirmasi, atau kelalaian admin dalam memvalidasi pembayaran.
- Dengan menggunakan aplikasi ini, admin dan pengguna dianggap menyetujui bahwa fungsi utamanya adalah alat bantu pencatatan, bukan sistem pembayaran resmi.

## Keamanan (Security)

- Panel admin dilindungi password tunggal (`ADMIN_PASSWORD`) via session (`express-session`) — gunakan password yang kuat dan jangan dibagikan.
- Wajib set `SESSION_SECRET` dengan nilai acak yang unik dan rahasia di `.env`; jangan gunakan nilai contoh/default di lingkungan produksi.
- Jalankan aplikasi di belakang HTTPS saat digunakan secara publik agar sesi login dan data form tidak bisa disadap.
- Halaman konfirmasi publik (`/confirm/:code`) tidak memerlukan login — siapa pun yang memiliki/scan QR code dapat mengisi form. Jangan memasukkan data sensitif (kata sandi, nomor kartu, dll.) ke field apa pun di form ini.
- File `.env` (kredensial) tidak boleh di-commit ke repository — sudah termasuk di `.gitignore`.
- Data disimpan sebagai file JSON lokal di folder `data/` tanpa enkripsi; batasi akses server/hosting hanya untuk pihak yang berwenang.
- Upload gambar QRIS menggunakan validasi tipe file gambar (multer) — tetap disarankan membatasi ukuran file dan memantau folder upload secara berkala.

## Privasi (Privacy)

- Data yang dikumpulkan dari pembeli terbatas pada: nama, jumlah pembayaran, metode bayar, dan status — tidak ada pengumpulan data pribadi sensitif lain (KTP, email, dll.) secara default.
- Data kontak dan riwayat konfirmasi disimpan secara lokal (file JSON di server) dan hanya dapat diakses oleh admin yang login.
- Nomor WhatsApp admin yang diset di Pengaturan digunakan untuk membuka deep-link `wa.me` guna menerima notifikasi konfirmasi — nomor ini tidak dibagikan ke pihak ketiga mana pun oleh aplikasi.
- Admin disarankan untuk menghapus data riwayat/kontak yang sudah tidak diperlukan secara berkala, terutama jika berisi informasi pembeli yang tidak lagi relevan.
- Aplikasi ini tidak mengirim data ke layanan analytics, iklan, atau pihak ketiga mana pun selain WhatsApp (via deep-link, diinisiasi oleh perangkat pengguna sendiri, bukan oleh server).
