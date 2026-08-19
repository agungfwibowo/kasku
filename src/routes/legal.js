const express = require('express');

const router = express.Router();

const pages = {
  terms: {
    title: 'Syarat & Ketentuan',
    body: `
      <ul>
        <li>Aplikasi ini disediakan "sebagaimana adanya" (as-is), tanpa jaminan apa pun, untuk membantu proses pencatatan konfirmasi pembayaran.</li>
        <li>Aplikasi <strong>tidak memproses transaksi keuangan</strong> secara langsung (tidak terhubung ke payment gateway, bank, atau penyedia pembayaran mana pun). Semua pembayaran (cash, transfer, QRIS) dilakukan di luar sistem ini; aplikasi hanya mencatat laporan/konfirmasi dari pembeli.</li>
        <li>Admin bertanggung jawab penuh untuk memverifikasi kebenaran setiap konfirmasi pembayaran (misal mencocokkan dengan mutasi rekening atau bukti transfer) sebelum menandainya sebagai "Lunas" dan tervalidasi.</li>
        <li>Data yang dimasukkan oleh pembeli (nama, jumlah, metode) tidak diverifikasi identitasnya oleh sistem — akurasi bergantung pada kejujuran pengisi form.</li>
        <li>Pemilik/pengelola aplikasi tidak bertanggung jawab atas kerugian yang timbul dari kesalahan input, penyalahgunaan tautan konfirmasi, atau kelalaian admin dalam memvalidasi pembayaran.</li>
        <li>Dengan menggunakan aplikasi ini, admin dan pengguna dianggap menyetujui bahwa fungsi utamanya adalah alat bantu pencatatan, bukan sistem pembayaran resmi.</li>
      </ul>
    `,
  },
  security: {
    title: 'Keamanan',
    body: `
      <ul>
        <li>Panel admin dilindungi password tunggal dan sesi login — gunakan password yang kuat dan jangan dibagikan ke pihak lain.</li>
        <li>Disarankan mengakses aplikasi ini melalui HTTPS saat digunakan secara publik, agar sesi login dan data form tidak bisa disadap.</li>
        <li>Halaman konfirmasi publik tidak memerlukan login — siapa pun yang memiliki/scan QR code dapat mengisi form. Jangan memasukkan data sensitif (kata sandi, nomor kartu, dll.) ke field apa pun di form ini.</li>
        <li>Data disimpan secara lokal di server tanpa enkripsi tambahan; akses ke server dibatasi hanya untuk pihak yang berwenang.</li>
        <li>Gambar QRIS yang diunggah divalidasi sebagai file gambar sebelum disimpan.</li>
      </ul>
    `,
  },
  privacy: {
    title: 'Privasi',
    body: `
      <ul>
        <li>Data yang dikumpulkan dari pembeli terbatas pada: nama, jumlah pembayaran, metode bayar, dan status — tidak ada pengumpulan data pribadi sensitif lain (KTP, email, dll.) secara default.</li>
        <li>Data kontak dan riwayat konfirmasi hanya dapat diakses oleh admin yang login.</li>
        <li>Nomor WhatsApp admin digunakan untuk menerima notifikasi konfirmasi pembayaran — nomor ini tidak dibagikan ke pihak ketiga mana pun oleh aplikasi.</li>
        <li>Aplikasi ini tidak mengirim data ke layanan analytics, iklan, atau pihak ketiga mana pun selain WhatsApp, dan pengiriman ke WhatsApp itu sendiri diinisiasi oleh perangkat pengguna, bukan oleh server.</li>
        <li>Admin disarankan menghapus data riwayat/kontak yang sudah tidak diperlukan secara berkala.</li>
      </ul>
    `,
  },
};

router.get('/:page', (req, res, next) => {
  const page = pages[req.params.page];
  if (!page) return next();
  res.render('public/legal', { title: page.title, body: page.body });
});

module.exports = router;
