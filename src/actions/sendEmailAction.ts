'use server';

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: 587,          // <-- Ubah ke port 587
  secure: false,      // <-- Ubah ke false untuk port 587 (TLS)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmailNotification(data: {
  to: string;
  namaPemohon: string;
  nomorTiket: string;
  jenisLayanan: string;
  status: 'masuk' | 'selesai';
  namaPetugas?: string;
  noHpPetugas?: string;
  linkSuratTugas?: string;
  catatanAdmin?: string;
  trackingUrl?: string;
}) {
  try {
    if (!data.to) {
      return { success: false, message: 'Alamat email pemohon tidak tersedia.' };
    }

    const isSelesai = data.status === 'selesai';
    const subject = isSelesai
      ? `[SELESAI] Permohonan PTSP #${data.nomorTiket} - Kemenag Kab. Pohuwato`
      : `[DITERIMA] Bukti Pengajuan PTSP #${data.nomorTiket} - Kemenag Kab. Pohuwato`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb; }
          .header { background: linear-gradient(135deg, #064e3b 0%, #047857 100%); color: #ffffff; padding: 28px 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 18px; letter-spacing: 0.5px; }
          .header p { margin: 4px 0 0; font-size: 12px; color: #a7f3d0; }
          .content { padding: 28px 24px; color: #1f2937; font-size: 14px; line-height: 1.6; }
          .badge { display: inline-block; padding: 6px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold; margin-bottom: 16px; }
          .badge-masuk { background-color: #fef3c7; color: #92400e; }
          .badge-selesai { background-color: #d1fae5; color: #065f46; }
          .box { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 16px 0; }
          .box-row { margin-bottom: 8px; font-size: 13px; }
          .box-label { color: #6b7280; display: inline-block; width: 150px; }
          .box-val { font-weight: bold; color: #111827; }
          .btn { display: inline-block; background-color: #059669; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: bold; font-size: 13px; margin-top: 12px; }
          .footer { background-color: #f9fafb; padding: 18px 24px; text-align: center; font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SEKSI BIMBINGAN MASYARAKAT ISLAM</h1>
            <p>Kantor Kementerian Agama Kabupaten Pohuwato</p>
          </div>
          <div class="content">
            <span class="badge ${isSelesai ? 'badge-selesai' : 'badge-masuk'}">
              ${isSelesai ? '✅ PERMOHONAN SELESAI DIPROSES' : '📩 PERMOHONAN BERHASIL DITERIMA'}
            </span>
            <p>Assalamu'alaikum Warahmatullahi Wabarakatuh, <strong>${data.namaPemohon}</strong>.</p>
            <p>
              ${
                isSelesai
                  ? 'Permohonan layanan PTSP Anda telah selesai diverifikasi dan ditindaklanjuti oleh tim kami. Berikut adalah rincian penyelesaian layanan Anda:'
                  : 'Terima kasih telah menggunakan layanan PTSP Online Kemenag Kabupaten Pohuwato. Permohonan Anda telah masuk ke sistem kami dengan rincian sebagai berikut:'
              }
            </p>

            <div class="box">
              <div class="box-row"><span class="box-label">Nomor Tiket:</span> <span class="box-val">#${data.nomorTiket}</span></div>
              <div class="box-row"><span class="box-label">Jenis Layanan:</span> <span class="box-val">${data.jenisLayanan}</span></div>
              <div class="box-row"><span class="box-label">Status Saat Ini:</span> <span class="box-val">${isSelesai ? 'Selesai' : 'Menunggu Verifikasi'}</span></div>
              ${
                isSelesai && data.namaPetugas
                  ? `<div class="box-row"><span class="box-label">Petugas Ditugaskan:</span> <span class="box-val">${data.namaPetugas}</span></div>`
                  : ''
              }
              ${
                isSelesai && data.noHpPetugas
                  ? `<div class="box-row"><span class="box-label">Kontak Petugas:</span> <span class="box-val">${data.noHpPetugas}</span></div>`
                  : ''
              }
              ${
                data.catatanAdmin
                  ? `<div class="box-row"><span class="box-label">Catatan Admin:</span> <span class="box-val">${data.catatanAdmin}</span></div>`
                  : ''
              }
            </div>

            ${
              isSelesai && data.linkSuratTugas
                ? `<p><a href="${data.linkSuratTugas}" class="btn" target="_blank">📄 Unduh Surat Tugas / Dokumen Hasil</a></p>`
                : ''
            }

            ${
              data.trackingUrl
                ? `<p style="margin-top: 16px;">Anda dapat memantau riwayat dan detail tiket kapan saja melalui tautan berikut:<br/>
                   <a href="${data.trackingUrl}" style="color: #059669; font-weight: bold;">${data.trackingUrl}</a></p>`
                : ''
            }
          </div>
          <div class="footer">
            Pesan ini dikirim secara otomatis oleh Sistem Informasi Manajemen Bimas Islam.<br/>
            Kantor Kementerian Agama Kabupaten Pohuwato • Gorontalo
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"PTSP Bimas Islam Pohuwato" <${process.env.SMTP_USER}>`,
      to: data.to,
      subject,
      html: htmlContent,
    });

    return { success: true, message: 'Email berhasil dikirim.' };
  } catch (err: any) {
    console.error('Error Nodemailer:', err);
    return { success: false, message: err.message || 'Gagal mengirim email.' };
  }
}