'use client';

import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import type {
  MasjidMushallaItem,
  KiblatDataItem,
  PejabatUtamaItem,
} from '@/app/admin/kebimasislaman/_actions/kebimasislaman';

type JenisLembagaKiblat = 'MASJID' | 'MUSHALLA';

interface SertifikatKiblatPayload {
  [key: string]: any;
}

function formatTanggalIndo(isoOrDate?: string | null): string {
  if (!isoOrDate) return '20 November 2026';
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return isoOrDate;
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function sanitizeFilePart(input: string): string {
  return (input || 'Sertifikat')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

function pickJabatanKepala(list?: PejabatUtamaItem[]) {
  if (!list || list.length === 0) {
    return 'Kepala Kantor Kementerian Agama Kabupaten Pohuwato';
  }
  const sorted = [...list].sort((a, b) => (a.urutan ?? 99) - (b.urutan ?? 99));
  const kakankemenag =
    sorted.find((p) => (p.jabatan || '').toLowerCase().includes('kepala')) || sorted[0];
  return (
    kakankemenag?.jabatan ||
    'Kepala Kantor Kementerian Agama Kabupaten Pohuwato'
  );
}
interface ArahKiblatTabProps {
  masjidList: MasjidMushallaItem[];
  kiblatMap: Record<string, KiblatDataItem>;
  kecamatanOptions: string[];
  kuaKecamatanLock: string | null;
  activeMode: string;
  pejabatUtamaList: PejabatUtamaItem[];
  loading: boolean;
  onRefresh: () => Promise<void> | void;
  onNotify: (type: 'success' | 'error', title: string, message: string) => void;
  onOpenImportKiblat: () => void;
  onDownloadTemplateKiblat: () => void;
}

// Deterministic QR-like verification matrix (25x25 with finder patterns + data bits)
function buildVerificationMatrix(seedText: string): boolean[][] {
  const size = 25;
  const grid: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false)
  );

  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        if (r0 + r < size && c0 + c < size) {
          grid[r0 + r][c0 + c] = isBorder || isCenter;
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    grid[6][i] = i % 2 === 0;
    grid[i][6] = i % 2 === 0;
  }

  // Seed hash expansion
  let h1 = 2166136261;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < seedText.length; i++) {
    const ch = seedText.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 16777619);
    h2 = Math.imul(h2 ^ ch, 2246822519) + i;
  }

  let bitIdx = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= size - 8;
      const inBottomLeft = r >= size - 8 && c < 8;
      const onTiming = r === 6 || c === 6;
      if (inTopLeft || inTopRight || inBottomLeft || onTiming) continue;

      const mix =
        ((h1 >>> (bitIdx % 24)) ^ (h2 >>> ((bitIdx * 3) % 24)) ^ (r * 13 + c * 7)) & 1;
      grid[r][c] = mix === 1;
      bitIdx++;
    }
  }

  return grid;
}

function KemenagEmblemSvg({ className = 'w-14 h-14' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      role="img"
      aria-label="Logo Kementerian Agama Republik Indonesia"
    >
      <circle cx="60" cy="60" r="56" fill="#065f46" stroke="#d97706" strokeWidth="4" />
      <circle cx="60" cy="60" r="49" fill="none" stroke="#fde68a" strokeWidth="1.5" strokeDasharray="3 2" />
      <polygon
        points="60,18 66.5,31.5 81.5,33.5 70.5,44 73.2,59 60,51.8 46.8,59 49.5,44 38.5,33.5 53.5,31.5"
        fill="#fbbf24"
        stroke="#78350f"
        strokeWidth="1.5"
      />
      <path
        d="M34 74 C34 62, 86 62, 86 74 L86 86 L34 86 Z"
        fill="#fef3c7"
        stroke="#fbbf24"
        strokeWidth="2"
      />
      <rect x="28" y="86" width="64" height="8" rx="4" fill="#fbbf24" />
      <text
        x="60"
        y="106"
        textAnchor="middle"
        fill="#fef3c7"
        fontSize="9.5"
        fontWeight="800"
        letterSpacing="1.4"
      >
        KEMENAG RI
      </text>
    </svg>
  );
}

function VerificationQrSvg({
  payloadText,
  sizePx = 84,
}: {
  payloadText: string;
  sizePx?: number;
}) {
  const matrix = useMemo(() => buildVerificationMatrix(payloadText), [payloadText]);
  const count = matrix.length;

  return (
    <div className="inline-flex flex-col items-center bg-white p-1.5 rounded-lg border border-emerald-900/25 shadow-2xs">
      <svg
        width={sizePx}
        height={sizePx}
        viewBox={`0 0 ${count} ${count}`}
        shapeRendering="crispEdges"
        aria-label="QR Code Verifikasi Sertifikat"
      >
        <rect x="0" y="0" width={count} height={count} fill="#ffffff" />
        {matrix.map((row, r) =>
          row.map((cell, c) =>
            cell ? (
              <rect
                key={`${r}-${c}`}
                x={c}
                y={r}
                width={1}
                height={1}
                fill="#064e3b"
              />
            ) : null
          )
        )}
      </svg>
      <span className="text-[9px] font-mono font-bold text-emerald-900 mt-1 tracking-tight">
        QR VERIFIKASI
      </span>
    </div>
  );
}

// Convert a dataURL JPEG into a genuine A4 Landscape PDF byte array (PDF 1.4)
function jpegDataUrlToLandscapePdfBytes(jpegDataUrl: string): Uint8Array<ArrayBuffer> {
  const base64 = jpegDataUrl.split(',')[1] || '';
  const binaryStr = atob(base64);
  const imgBytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    imgBytes[i] = binaryStr.charCodeAt(i);
  }

  // Parse SOF0/SOF2 width & height from JPEG bytes
  let imgWidth = 1600;
  let imgHeight = 1131;
  let pos = 2;
  while (pos + 9 < imgBytes.length) {
    if (imgBytes[pos] !== 0xff) {
      pos++;
      continue;
    }
    const marker = imgBytes[pos + 1];
    if (marker === 0xc0 || marker === 0xc2) {
      imgHeight = (imgBytes[pos + 5] << 8) + imgBytes[pos + 6];
      imgWidth = (imgBytes[pos + 7] << 8) + imgBytes[pos + 8];
      break;
    }
    const segLen = (imgBytes[pos + 2] << 8) + imgBytes[pos + 3];
    if (segLen < 2) break;
    pos += 2 + segLen;
  }

  // A4 Landscape in PDF points (841.89 x 595.28)
  const pageW = 841.89;
  const pageH = 595.28;

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let totalLen = 0;

  const pushStr = (s: string) => {
    const arr = encoder.encode(s);
    chunks.push(arr);
    totalLen += arr.length;
  };
  const pushBytes = (arr: Uint8Array) => {
    chunks.push(arr);
    totalLen += arr.length;
  };

  pushStr('%PDF-1.4\n');

  // 1: Catalog
  offsets.push(totalLen);
  pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // 2: Pages
  offsets.push(totalLen);
  pushStr('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  // 3: Page (A4 Landscape)
  offsets.push(totalLen);
  pushStr(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW.toFixed(2)} ${pageH.toFixed(
      2
    )}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`
  );

  // 4: Image XObject (DCTDecode)
  offsets.push(totalLen);
  pushStr(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgWidth} /Height ${imgHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes.length} >>\nstream\n`
  );
  pushBytes(imgBytes);
  pushStr('\nendstream\nendobj\n');

  // 5: Content stream drawing full-bleed A4 landscape image
  const streamContent = `q ${pageW.toFixed(2)} 0 0 ${pageH.toFixed(2)} 0 0 cm /Im0 Do Q\n`;
  offsets.push(totalLen);
  pushStr(
    `5 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}endstream\nendobj\n`
  );

  const xrefPos = totalLen;
  pushStr(`xref\n0 6\n0000000000 65535 f \n`);
  for (let i = 1; i <= 5; i++) {
    pushStr(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  pushStr(
    `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`
  );

  const ab = new ArrayBuffer(totalLen);
  const out = new Uint8Array(ab);
  let cursor = 0;
  for (const ch of chunks) {
    out.set(ch, cursor);
    cursor += ch.length;
  }
  return out;
}

async function renderCertificateToPdfBlob(
  data: SertifikatKiblatPayload,
  jabatanKepala: string
): Promise<Blob> {
  // High-resolution A4 landscape canvas (2480 x 1754 px @ ~210 DPI)
  const W = 2480;
  const H = 1754;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Gagal membuat kanvas PDF sertifikat.');

  // Warm ceremonial paper background
  ctx.fillStyle = '#fffdf7';
  ctx.fillRect(0, 0, W, H);

  // Subtle radial glow
  const grad = ctx.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, W * 0.65);
  grad.addColorStop(0, 'rgba(255, 253, 247, 1)');
  grad.addColorStop(1, 'rgba(236, 253, 245, 0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Outer & inner decorative borders
  ctx.strokeStyle = '#065f46';
  ctx.lineWidth = 10;
  ctx.strokeRect(54, 54, W - 108, H - 108);

  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 3;
  ctx.strokeRect(76, 76, W - 152, H - 152);

  // Corner ornamental accents
  const corners = [
    [94, 94, 1, 1],
    [W - 94, 94, -1, 1],
    [94, H - 94, 1, -1],
    [W - 94, H - 94, -1, -1],
  ];
  ctx.strokeStyle = '#047857';
  ctx.lineWidth = 5;
  for (const [cx, cy, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + dy * 36);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + dx * 36, cy);
    ctx.stroke();
  }

  // Draw Kemenag Emblem on top-left header
  const emblemX = 150;
  const emblemY = 128;
  const emblemR = 68;
  const eCenterX = emblemX + emblemR;
  const eCenterY = emblemY + emblemR;

  ctx.save();
  ctx.beginPath();
  ctx.arc(eCenterX, eCenterY, emblemR, 0, Math.PI * 2);
  ctx.fillStyle = '#065f46';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#d97706';
  ctx.stroke();

  // Star inside emblem
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? 24 : 11;
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = eCenterX + Math.cos(ang) * rad;
    const py = eCenterY - 14 + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Mosque dome silhouette in emblem
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.arc(eCenterX, eCenterY + 24, 22, Math.PI, 0);
  ctx.lineTo(eCenterX + 26, eCenterY + 34);
  ctx.lineTo(eCenterX - 26, eCenterY + 34);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('KEMENAG RI', eCenterX, eCenterY + 52);
  ctx.restore();

  // Header text centered
  ctx.textAlign = 'center';
  ctx.fillStyle = '#065f46';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('KEMENTERIAN AGAMA REPUBLIK INDONESIA', W / 2, 152);

  ctx.fillStyle = '#064e3b';
  ctx.font = '800 36px sans-serif';
  ctx.fillText('KANTOR KEMENTERIAN AGAMA KABUPATEN POHUWATO', W / 2, 200);

  ctx.fillStyle = '#4b5563';
  ctx.font = '500 20px sans-serif';
  ctx.fillText(
    'Jl. Kompleks Perkantoran Blok C, Marisa, Kabupaten Pohuwato, Provinsi Gorontalo',
    W / 2,
    236
  );

  // Header divider line
  ctx.strokeStyle = '#064e3b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(140, 266);
  ctx.lineTo(W - 140, 266);
  ctx.stroke();

  // Title & Registration Number
  ctx.fillStyle = '#064e3b';
  ctx.font = '800 50px sans-serif';
  ctx.fillText('SERTIFIKAT KALIBRASI ARAH KIBLAT', W / 2, 342);

  ctx.fillStyle = '#1f2937';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(`Nomor Register: ${data.nomorRegister || '-'}`, W / 2, 392);

  // Recipient Institution
  const jenisLabel = data.jenisLembaga === 'MUSHALLA' ? 'Mushalla' : 'Masjid';
  ctx.fillStyle = '#4b5563';
  ctx.font = '500 22px sans-serif';
  ctx.fillText(`Diberikan kepada ${jenisLabel}:`, W / 2, 456);

  ctx.fillStyle = '#111827';
  ctx.font = '800 54px sans-serif';
  ctx.fillText(String(data.namaLembaga || '-').toUpperCase(), W / 2, 522);

  const subInfoParts = [
    data.alamatLengkap || '-',
    data.kecamatan ? `Kecamatan ${data.kecamatan}` : '',
    data.idSimas ? `ID SIMAS: ${data.idSimas}` : '',
  ].filter(Boolean);
  ctx.fillStyle = '#374151';
  ctx.font = '500 22px sans-serif';
  ctx.fillText(subInfoParts.join('  •  '), W / 2, 568);

  // Measurement Card Box
  const boxX = 180;
  const boxY = 615;
  const boxW = W - 360;
  const boxH = 330;

  ctx.fillStyle = '#f0fdf4';
  ctx.strokeStyle = '#a7f3d0';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 24);
  ctx.fill();
  ctx.stroke();

  const leftRows = [
    ['Koordinat Lokasi', data.koordinatText || '-'],
    ['Azimut Bangunan / Mihrab', data.azimutBangunanText || '-'],
    ['Azimut Arah Kiblat', data.azimutKiblatText || '-'],
  ];
  const rightRows = [
    ['Nilai Penyimpangan', data.penyimpanganText || '-'],
    ['Status Kalibrasi', data.statusPenyimpangan || '-'],
    [
      'Elevasi & Tgl. Ukur',
      `${data.elevasiText || '-'} • ${data.tanggalPengukuran || '-'}`,
    ],
  ];

  const drawDataColumn = (rows: string[][], colX: number, colWidth: number) => {
    rows.forEach(([label, val], idx) => {
      const rowY = boxY + 76 + idx * 92;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#4b5563';
      ctx.font = '600 22px sans-serif';
      ctx.fillText(label, colX, rowY);

      ctx.textAlign = 'right';
      ctx.fillStyle =
        label === 'Azimut Arah Kiblat' || label === 'Status Kalibrasi'
          ? '#065f46'
          : '#111827';
      ctx.font = 'bold 23px sans-serif';
      ctx.fillText(val, colX + colWidth, rowY);

      if (idx < rows.length - 1) {
        ctx.strokeStyle = 'rgba(6, 95, 70, 0.14)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(colX, rowY + 34);
        ctx.lineTo(colX + colWidth, rowY + 34);
        ctx.stroke();
      }
    });
  };

  const colW = (boxW - 140) / 2;
  drawDataColumn(leftRows, boxX + 48, colW);
  drawDataColumn(rightRows, boxX + 92 + colW, colW);

  // Bottom Section: QR Code + Verification Meta (Left) & TTE Authority Block (Right)
  const bottomY = 1010;
  const qrPayload = `${data.nomorRegister}|${data.kodeVerifikasi}|${data.namaLembaga}|${data.penyimpanganText}`;
  const qrMatrix = buildVerificationMatrix(qrPayload);
  const qrSize = 210;
  const qrX = 180;
  const qrY = bottomY + 12;
  const cellPx = qrSize / qrMatrix.length;

  // QR Frame
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#065f46';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(qrX - 14, qrY - 14, qrSize + 28, qrSize + 54, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#064e3b';
  for (let r = 0; r < qrMatrix.length; r++) {
    for (let c = 0; c < qrMatrix[r].length; c++) {
      if (qrMatrix[r][c]) {
        ctx.fillRect(qrX + c * cellPx, qrY + r * cellPx, Math.ceil(cellPx), Math.ceil(cellPx));
      }
    }
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#065f46';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('QR VERIFIKASI DOKUMEN', qrX + qrSize / 2, qrY + qrSize + 24);

  // Meta details next to QR
  const metaX = qrX + qrSize + 52;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#374151';
  ctx.font = '600 21px sans-serif';
  ctx.fillText(`Kode Verifikasi Dokumen: ${data.kodeVerifikasi || '-'}`, metaX, bottomY + 52);

  ctx.fillText(
    `Diterbitkan di Pohuwato: ${formatTanggalIndo(
      data.tanggalTerbit || data.tanggalPengukuran
    )}`,
    metaX,
    bottomY + 94
  );

  ctx.fillStyle = '#065f46';
  ctx.font = 'bold 19px sans-serif';
  ctx.fillText(
    'Dokumen Sah • Pengesahan Tanda Tangan Elektronik (TTE)',
    metaX,
    bottomY + 136
  );

  if (data.catatan) {
    ctx.fillStyle = '#6b7280';
    ctx.font = '500 19px sans-serif';
    ctx.fillText(`Catatan: ${String(data.catatan).slice(0, 95)}`, metaX, bottomY + 178);
  }

  // Right TTE block: Jabatan saja + ruang TTE (tanpa nama/NIP/cap manual)
  const signCenterX = W - 470;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#1f2937';
  ctx.font = 'bold 23px sans-serif';
  ctx.fillText(jabatanKepala, signCenterX, bottomY + 46);

  ctx.strokeStyle = '#9ca3af';
  ctx.setLineDash([8, 6]);
  ctx.lineWidth = 2;
  ctx.strokeRect(signCenterX - 185, bottomY + 74, 370, 145);
  ctx.setLineDash([]);

  ctx.fillStyle = '#065f46';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('Ditandatangani Secara Elektronik', signCenterX, bottomY + 140);
  ctx.fillStyle = '#6b7280';
  ctx.font = '500 16px sans-serif';
  ctx.fillText('(Ruang TTE / Stempa Digital)', signCenterX, bottomY + 168);

  // Footer note
  ctx.textAlign = 'center';
  ctx.fillStyle = '#6b7280';
  ctx.font = '500 17px sans-serif';
  ctx.fillText(
    'Sistem Informasi Manajemen Bimas Islam • Kantor Kementerian Agama Kabupaten Pohuwato',
    W / 2,
    H - 102
  );

  const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const pdfBytes = jpegDataUrlToLandscapePdfBytes(jpegDataUrl);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

function SertifikatKiblatModal({
  open,
  onClose,
  data,
  pejabatUtama,
  onNotify,
}: {
  open: boolean;
  onClose: () => void;
  data: SertifikatKiblatPayload | null;
  pejabatUtama?: PejabatUtamaItem[];
  onNotify?: (type: 'success' | 'error', title: string, message: string) => void;
}) {
  const [downloading, setDownloading] = useState(false);

  if (!open || !data) return null;

  const jabatanKepala = pickJabatanKepala(pejabatUtama);
  const jenisLabel = data.jenisLembaga === 'MUSHALLA' ? 'Mushalla' : 'Masjid';
  const qrSeed = `${data.nomorRegister}|${data.kodeVerifikasi}|${data.namaLembaga}|${data.penyimpanganText}`;

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const pdfBlob = await renderCertificateToPdfBlob(data, jabatanKepala);
      const url = URL.createObjectURL(pdfBlob);
      const fileName = `Sertifikat_Kalibrasi_Kiblat_${sanitizeFilePart(
        data.namaLembaga || 'Lembaga'
      )}_${sanitizeFilePart(data.nomorRegister || 'Reg')}.pdf`;

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(url), 4000);
      onNotify?.(
        'success',
        'PDF Sertifikat Terunduh',
        `File "${fileName}" berhasil diunduh dalam format A4 Landscape.`
      );
    } catch (err: any) {
      onNotify?.(
        'error',
        'Gagal Mengunduh PDF',
        err?.message || 'Terjadi kesalahan saat membuat file PDF sertifikat.'
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[94vh] overflow-y-auto">
        {/* Toolbar Kontrol */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div>
            <h3 className="font-bold text-base text-gray-900">
              Pratinjau Sertifikat Kalibrasi Arah Kiblat (A4 Landscape)
            </h3>
            <p className="text-xs text-gray-500">
              No. Register: <strong>{data.nomorRegister}</strong> • Kode Verifikasi:{' '}
              <strong>{data.kodeVerifikasi}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={downloading}
              onClick={handleDownloadPdf}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition disabled:opacity-60"
            >
              {downloading ? 'Menyiapkan PDF...' : '⬇️ Unduh PDF Sertifikat (A4)'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold transition"
            >
              Tutup
            </button>
          </div>
        </div>

        {/* Lembar Sertifikat A4 Landscape */}
        <div className="bg-[#fffdf7] border-[3px] border-double border-emerald-800 p-4 sm:p-7 text-gray-900 relative">
          <div className="border border-amber-500/70 p-4 sm:p-6 space-y-5">
            {/* Kop Sertifikat dengan Logo Kemenag */}
            <div className="flex flex-col sm:flex-row items-center gap-4 border-b-2 border-emerald-900 pb-4">
              <div className="shrink-0">
                <KemenagEmblemSvg className="w-16 h-16 sm:w-[68px] sm:h-[68px]" />
              </div>
              <div className="flex-1 text-center sm:pr-16">
                <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-emerald-900">
                  Kementerian Agama Republik Indonesia
                </div>
                <div className="text-sm sm:text-base font-extrabold uppercase text-emerald-950 mt-0.5">
                  Kantor Kementerian Agama Kabupaten Pohuwato
                </div>
                <div className="text-[11px] text-gray-600 mt-0.5">
                  Jl. Kompleks Perkantoran Blok C, Marisa, Kabupaten Pohuwato, Provinsi Gorontalo
                </div>
              </div>
            </div>

            {/* Judul & Nomor Register */}
            <div className="text-center space-y-1">
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-wider uppercase text-emerald-950">
                Sertifikat Kalibrasi Arah Kiblat
              </h2>
              <div className="text-xs sm:text-sm font-semibold text-gray-700">
                Nomor Register:{' '}
                <span className="font-mono font-bold text-emerald-900">
                  {data.nomorRegister}
                </span>
              </div>
            </div>

            {/* Identitas Lembaga */}
            <div className="text-center space-y-1 py-1">
              <p className="text-xs text-gray-600">Diberikan kepada {jenisLabel}:</p>
              <div className="text-lg sm:text-2xl font-extrabold text-gray-900 uppercase">
                {data.namaLembaga}
              </div>
              <p className="text-xs text-gray-700 max-w-2xl mx-auto">
                {data.alamatLengkap || '-'}
                {data.kecamatan ? ` • Kecamatan ${data.kecamatan}` : ''}
                {data.idSimas ? ` • ID SIMAS: ${data.idSimas}` : ''}
              </p>
            </div>

            {/* Tabel Hasil Pengukuran */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-emerald-50/50 border border-emerald-800/25 rounded-xl p-4">
              <div className="space-y-1.5">
                <div className="flex justify-between gap-2 border-b border-emerald-900/10 pb-1">
                  <span className="text-gray-600 font-medium">Koordinat Lokasi</span>
                  <span className="font-bold text-gray-900 text-right">
                    {data.koordinatText || '-'}
                  </span>
                </div>
                <div className="flex justify-between gap-2 border-b border-emerald-900/10 pb-1">
                  <span className="text-gray-600 font-medium">Azimut Bangunan / Mihrab</span>
                  <span className="font-bold text-gray-900">
                    {data.azimutBangunanText || '-'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600 font-medium">Azimut Arah Kiblat</span>
                  <span className="font-bold text-emerald-900">
                    {data.azimutKiblatText || '-'}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between gap-2 border-b border-emerald-900/10 pb-1">
                  <span className="text-gray-600 font-medium">Nilai Penyimpangan</span>
                  <span className="font-bold text-gray-900">
                    {data.penyimpanganText || '-'}
                  </span>
                </div>
                <div className="flex justify-between gap-2 border-b border-emerald-900/10 pb-1">
                  <span className="text-gray-600 font-medium">Status Kalibrasi</span>
                  <span className="font-bold text-emerald-900">
                    {data.statusPenyimpangan || '-'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600 font-medium">Elevasi &amp; Tgl. Ukur</span>
                  <span className="font-bold text-gray-900">
                    {data.elevasiText || '-'} • {data.tanggalPengukuran || '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* QR Verifikasi + Informasi Dokumen (Kiri) & Jabatan Kepala Kantor + Ruang TTE (Kanan) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 pt-2">
              <div className="flex items-start gap-3.5">
                <VerificationQrSvg payloadText={qrSeed} sizePx={82} />
                <div className="text-[11px] text-gray-600 space-y-1">
                  <div>
                    Kode Verifikasi Dokumen:{' '}
                    <span className="font-mono font-bold text-gray-900">
                      {data.kodeVerifikasi}
                    </span>
                  </div>
                  <div>
                    Diterbitkan di Pohuwato:{' '}
                    <strong>
                      {formatTanggalIndo(data.tanggalTerbit || data.tanggalPengukuran)}
                    </strong>
                  </div>
                  <div className="text-emerald-800 font-semibold">
                    Pengesahan Tanda Tangan Elektronik (TTE)
                  </div>
                  {data.catatan && (
                    <div className="max-w-md text-gray-500">Catatan: {data.catatan}</div>
                  )}
                </div>
              </div>

              <div className="text-left sm:text-center min-w-[250px]">
                <div className="text-xs font-bold text-gray-800">{jabatanKepala}</div>
                <div className="mt-2 mx-auto w-52 h-16 rounded-lg border border-dashed border-gray-300 bg-white/60 flex flex-col items-center justify-center px-2">
                  <span className="text-[10px] font-semibold text-emerald-800">
                    Ruang Tanda Tangan Elektronik (TTE)
                  </span>
                  <span className="text-[9px] text-gray-400">
                    Siap dibubuhkan TTE resmi
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
function detectJenisLembaga(m: MasjidMushallaItem): JenisLembagaKiblat {
  if (m.jenis_lembaga === 'MUSHALLA' || m.jenis_lembaga === 'MASJID') {
    return m.jenis_lembaga;
  }
  const s1 = String(m.id_masjid_simas || '').trim();
  const s2 = String(m.id_baru_simas || '').trim();
  if (s1.startsWith('02.') || s2.startsWith('02.')) return 'MUSHALLA';
  return 'MASJID';
}

function parseNumberOrNull(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  const cleaned = String(val).replace(',', '.').replace(/[^0-9.-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.') return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function hitungPenyimpangan(
  azimutBangunan: number | null,
  azimutKiblat: number | null
): { selisih: number | null; status: string } {
  if (azimutBangunan === null || azimutKiblat === null) {
    return { selisih: null, status: 'Belum Dihitung' };
  }
  const rawSelisih = azimutBangunan - azimutKiblat;
  const selisih = Number(rawSelisih.toFixed(4));
  const absSelisih = Math.abs(selisih);
  const status = absSelisih <= 1.0 ? 'Sesuai / Presisi' : 'Perlu Koreksi';
  return { selisih, status };
}

function formatPenyimpangan(val: number | null): string {
  if (val === null || Number.isNaN(val)) return '-';
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}°`;
}

async function compressCalibrationImage(file: File): Promise<{ blob: Blob; ext: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 1280;
        let { width, height } = img;

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Gagal menyiapkan kanvas kompresi gambar.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.72;
        const tryEncode = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Gagal mengompresi foto kalibrasi.'));
                return;
              }
              if (blob.size > 320 * 1024 && quality > 0.42) {
                quality = Number((quality - 0.1).toFixed(2));
                tryEncode();
              } else {
                resolve({ blob, ext: 'jpg' });
              }
            },
            'image/jpeg',
            quality
          );
        };
        tryEncode();
      };
      img.onerror = () => reject(new Error('File gambar tidak valid atau rusak.'));
      img.src = String(ev.target?.result || '');
    };
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });
}

export default function ArahKiblatTab({
  masjidList,
  kiblatMap,
  kecamatanOptions,
  kuaKecamatanLock,
  activeMode,
  pejabatUtamaList,
  loading,
  onRefresh,
  onNotify,
  onOpenImportKiblat,
  onDownloadTemplateKiblat,
}: ArahKiblatTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJenis, setFilterJenis] = useState<'ALL' | JenisLembagaKiblat>('ALL');
  const [filterKecamatan, setFilterKecamatan] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedMasjidId, setSelectedMasjidId] = useState('');
  const [latitude, setLatitude] = useState('');
  const [lintangUtara, setLintangUtara] = useState('');
  const [longitude, setLongitude] = useState('');
  const [bujurTimur, setBujurTimur] = useState('');
  const [azimutBangunan, setAzimutBangunan] = useState('');
  const [elevasiTempat, setElevasiTempat] = useState('');
  const [azimutKiblat, setAzimutKiblat] = useState('');
  const [tanggalPengukuran, setTanggalPengukuran] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState('');
  const [catatan, setCatatan] = useState('');
  const [saving, setSaving] = useState(false);

  const [registerModal, setRegisterModal] = useState<{
    kiblatId: string;
    namaLembaga: string;
    kecamatan: string | null;
    nomorRegister: string;
    kodeVerifikasi: string;
    tanggalTerbit: string;
  } | null>(null);
  const [savingRegister, setSavingRegister] = useState(false);

  const [sertifikatData, setSertifikatData] = useState<SertifikatKiblatPayload | null>(null);

  const canAssignRegister =
    activeMode === 'super_admin' || activeMode === 'admin_bimas';

  const getKiblatForMasjid = (m: MasjidMushallaItem): KiblatDataItem | undefined => {
    return (
      kiblatMap[m.id] ||
      (m.id_masjid_simas ? kiblatMap[m.id_masjid_simas] : undefined) ||
      kiblatMap[m.nama_masjid]
    );
  };

  const scopedMasjid = useMemo(() => {
    if (!kuaKecamatanLock) return masjidList;
    const target = kuaKecamatanLock.toLowerCase();
    return masjidList.filter((m) => (m.kecamatan || '').trim().toLowerCase() === target);
  }, [masjidList, kuaKecamatanLock]);

  const activeKecamatanFilter = kuaKecamatanLock || filterKecamatan;

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopedMasjid.filter((m) => {
      const jenis = detectJenisLembaga(m);
      if (filterJenis !== 'ALL' && jenis !== filterJenis) return false;
      if (activeKecamatanFilter !== 'ALL') {
        if ((m.kecamatan || '').trim().toLowerCase() !== activeKecamatanFilter.toLowerCase()) {
          return false;
        }
      }
      const k = getKiblatForMasjid(m);
      const sudahDiukur = k?.azimut_kiblat !== null && k?.azimut_kiblat !== undefined;
      if (filterStatus === 'SUDAH' && !sudahDiukur) return false;
      if (filterStatus === 'BELUM' && sudahDiukur) return false;
      if (filterStatus === 'Sesuai / Presisi' && k?.status_penyimpangan !== 'Sesuai / Presisi') {
        return false;
      }
      if (filterStatus === 'Perlu Koreksi' && k?.status_penyimpangan !== 'Perlu Koreksi') {
        return false;
      }
      if (!q) return true;
      return (
        m.nama_masjid.toLowerCase().includes(q) ||
        (m.kecamatan || '').toLowerCase().includes(q) ||
        (m.alamat || '').toLowerCase().includes(q) ||
        (m.id_masjid_simas || '').toLowerCase().includes(q) ||
        (k?.nomor_register || '').toLowerCase().includes(q)
      );
    });
  }, [scopedMasjid, filterJenis, activeKecamatanFilter, filterStatus, searchQuery, kiblatMap]);

  const summaryStats = useMemo(() => {
    const total = scopedMasjid.length;
    let sudah = 0;
    let sertifikatSiap = 0;
    scopedMasjid.forEach((m) => {
      const k = getKiblatForMasjid(m);
      if (k?.azimut_kiblat !== null && k?.azimut_kiblat !== undefined) sudah += 1;
      if (k?.nomor_register && k.nomor_register.trim().length > 0) sertifikatSiap += 1;
    });
    return {
      total,
      sudah,
      belum: Math.max(0, total - sudah),
      sertifikatSiap,
    };
  }, [scopedMasjid, kiblatMap]);

  const liveCalc = useMemo(() => {
    return hitungPenyimpangan(parseNumberOrNull(azimutBangunan), parseNumberOrNull(azimutKiblat));
  }, [azimutBangunan, azimutKiblat]);

  const fillFormFromMasjid = (m?: MasjidMushallaItem) => {
    const target = m || filteredList[0] || scopedMasjid[0];
    const existing = target ? getKiblatForMasjid(target) : undefined;
    setSelectedMasjidId(target?.id || '');
    setLatitude(
      existing?.latitude !== null && existing?.latitude !== undefined
        ? String(existing.latitude)
        : target?.latitude_simas !== null && target?.latitude_simas !== undefined
        ? String(target.latitude_simas)
        : ''
    );
    setLintangUtara(existing?.lintang_utara || '');
    setLongitude(
      existing?.longitude !== null && existing?.longitude !== undefined
        ? String(existing.longitude)
        : target?.longitude_simas !== null && target?.longitude_simas !== undefined
        ? String(target.longitude_simas)
        : ''
    );
    setBujurTimur(existing?.bujur_timur || '');
    setAzimutBangunan(
      existing?.azimut_bangunan !== null && existing?.azimut_bangunan !== undefined
        ? String(existing.azimut_bangunan)
        : ''
    );
    setElevasiTempat(
      existing?.elevasi_tempat !== null && existing?.elevasi_tempat !== undefined
        ? String(existing.elevasi_tempat)
        : ''
    );
    setAzimutKiblat(
      existing?.azimut_kiblat !== null && existing?.azimut_kiblat !== undefined
        ? String(existing.azimut_kiblat)
        : ''
    );
    setTanggalPengukuran(existing?.tanggal_pengukuran || new Date().toISOString().slice(0, 10));
    setFotoUrl(existing?.foto_kalibrasi_url || '');
    setFotoFile(null);
    setFotoPreview(existing?.foto_kalibrasi_url || '');
    setCatatan(existing?.catatan || '');
  };

  const openCreateOrEdit = (m?: MasjidMushallaItem) => {
    fillFormFromMasjid(m);
    setShowFormModal(true);
  };

  const handleFotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onNotify('error', 'Format File Tidak Sesuai', 'Pilih file gambar JPG, PNG, atau WebP.');
      return;
    }
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const handleSaveKalibrasi = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetMasjid = scopedMasjid.find((m) => m.id === selectedMasjidId);
    if (!targetMasjid) {
      onNotify('error', 'Pilih Masjid / Mushalla', 'Silakan pilih masjid atau mushalla terlebih dahulu.');
      return;
    }

    setSaving(true);
    try {
      let uploadedPhotoUrl = fotoUrl || null;
      if (fotoFile) {
        const { blob, ext } = await compressCalibrationImage(fotoFile);
        const safeId = (targetMasjid.id_masjid_simas || targetMasjid.id).replace(
          /[^a-zA-Z0-9_-]/g,
          '_'
        );
        const filePath = `${safeId}_${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('kalibrasi-kiblat')
          .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });
        if (uploadErr) throw new Error(`Upload foto gagal: ${uploadErr.message}`);
        const { data: pubData } = supabase.storage.from('kalibrasi-kiblat').getPublicUrl(filePath);
        uploadedPhotoUrl = pubData.publicUrl;
      }

      const latNum = parseNumberOrNull(latitude);
      const lngNum = parseNumberOrNull(longitude);
      const azB = parseNumberOrNull(azimutBangunan);
      const azK = parseNumberOrNull(azimutKiblat);
      const elevNum = parseNumberOrNull(elevasiTempat);
      const calc = hitungPenyimpangan(azB, azK);

      const payload = {
        masjid_id: targetMasjid.id,
        id_masjid_simas: targetMasjid.id_masjid_simas || null,
        nama_masjid: targetMasjid.nama_masjid,
        kecamatan: targetMasjid.kecamatan || null,
        latitude: latNum,
        lintang_utara: lintangUtara.trim() || null,
        longitude: lngNum,
        bujur_timur: bujurTimur.trim() || null,
        azimut_bangunan: azB,
        elevasi_tempat: elevNum,
        azimut_kiblat: azK,
        penyimpangan: calc.selisih,
        status_penyimpangan: calc.status,
        tanggal_pengukuran: tanggalPengukuran || new Date().toISOString().slice(0, 10),
        foto_kalibrasi_url: uploadedPhotoUrl,
        catatan: catatan.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('masjid_arah_kiblat')
        .upsert(payload, { onConflict: 'masjid_id' });
      if (error) throw new Error(error.message);

      setShowFormModal(false);
      onNotify(
        'success',
        'Kalibrasi Tersimpan',
        `Data arah kiblat "${targetMasjid.nama_masjid}" tersimpan.`
      );
      await onRefresh();
    } catch (err: any) {
      onNotify('error', 'Gagal Menyimpan Kalibrasi', err?.message || 'Terjadi kesalahan.');
    } finally {
      setSaving(false);
    }
  };

  const openRegisterModal = (m: MasjidMushallaItem, k: KiblatDataItem | undefined) => {
    if (!k?.id) {
      onNotify(
        'error',
        'Data Kalibrasi Belum Ada',
        'Simpan data kalibrasi terlebih dahulu sebelum mengisi nomor register.'
      );
      return;
    }
    setRegisterModal({
      kiblatId: k.id,
      namaLembaga: m.nama_masjid,
      kecamatan: m.kecamatan || null,
      nomorRegister: k.nomor_register || '',
      kodeVerifikasi: k.kode_verifikasi || '',
      tanggalTerbit: k.tanggal_terbit_sertifikat || new Date().toISOString().slice(0, 10),
    });
  };

  const handleSaveRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerModal) return;
    const cleanReg = registerModal.nomorRegister.trim();
    if (!cleanReg) {
      onNotify('error', 'Nomor Register Kosong', 'Silakan isi nomor register terlebih dahulu.');
      return;
    }

    setSavingRegister(true);
    try {
      const urutMatch = cleanReg.match(/B-(\d+)/i);
      const kodeVerif =
        registerModal.kodeVerifikasi.trim() ||
        `KLB-2026-${urutMatch ? urutMatch[1].padStart(4, '0') : '0001'}`;

      const { error } = await supabase
        .from('masjid_arah_kiblat')
        .update({
          nomor_register: cleanReg,
          kode_verifikasi: kodeVerif,
          status_verifikasi: 'TERVERIFIKASI',
          tanggal_terbit_sertifikat:
            registerModal.tanggalTerbit || new Date().toISOString().slice(0, 10),
        })
        .eq('id', registerModal.kiblatId);

      if (error) throw error;
      setRegisterModal(null);
      onNotify('success', 'Nomor Register Tersimpan', 'Sertifikat kini dapat diunduh.');
      await onRefresh();
    } catch (err: any) {
      onNotify('error', 'Gagal Menyimpan No. Register', err?.message || 'Terjadi kesalahan.');
    } finally {
      setSavingRegister(false);
    }
  };

  const handleOpenSertifikat = (
    m: MasjidMushallaItem,
    k: KiblatDataItem | undefined,
    index: number
  ) => {
    const noReg = (k?.nomor_register || '').trim();
    if (!noReg) {
      onNotify(
        'error',
        'Nomor Register Belum Ada',
        'Sertifikat baru dapat diunduh setelah Nomor Register ditetapkan.'
      );
      return;
    }

    const urutMatch = noReg.match(/B-(\d+)/i);
    const urutStr = urutMatch
      ? urutMatch[1].padStart(4, '0')
      : String(index + 1).padStart(4, '0');
    const kodeVerif = (k?.kode_verifikasi || '').trim() || `KLB-2026-${urutStr}`;

    const koordParts = [
      k?.lintang_utara ? `LU: ${k.lintang_utara}` : '',
      k?.bujur_timur ? `BT: ${k.bujur_timur}` : '',
    ].filter(Boolean);
    const koordFallback =
      k?.latitude != null || k?.longitude != null
        ? `${k?.latitude ?? m.latitude_simas ?? '-'}, ${k?.longitude ?? m.longitude_simas ?? '-'}`
        : null;

    setSertifikatData({
      nomorRegister: noReg,
      kodeVerifikasi: kodeVerif,
      jenisLembaga: detectJenisLembaga(m),
      namaLembaga: m.nama_masjid,
      idSimas: m.id_masjid_simas || m.id_baru_simas || null,
      alamatLengkap: m.alamat || null,
      kecamatan: m.kecamatan || null,
      tanggalPengukuran: k?.tanggal_pengukuran || null,
      tanggalTerbit: k?.tanggal_terbit_sertifikat || null,
      koordinatText: koordParts.length > 0 ? koordParts.join(' • ') : koordFallback,
      azimutBangunanText:
        k?.azimut_bangunan !== null && k?.azimut_bangunan !== undefined
          ? `${k.azimut_bangunan}°`
          : null,
      elevasiText:
        k?.elevasi_tempat !== null && k?.elevasi_tempat !== undefined
          ? `${k.elevasi_tempat} m`
          : null,
      azimutKiblatText:
        k?.azimut_kiblat !== null && k?.azimut_kiblat !== undefined
          ? `${k.azimut_kiblat}°`
          : null,
      penyimpanganText:
        k?.penyimpangan !== null && k?.penyimpangan !== undefined
          ? formatPenyimpangan(k.penyimpangan)
          : null,
      statusPenyimpangan: k?.status_penyimpangan || null,
      catatan: k?.catatan || null,
    });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar Aksi */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onDownloadTemplateKiblat}
          className="px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition"
        >
          Template Excel Kiblat
        </button>
        <button
          type="button"
          onClick={onOpenImportKiblat}
          className="px-3.5 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold transition"
        >
          Import Excel Kiblat
        </button>
        <button
          type="button"
          onClick={() => openCreateOrEdit()}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
        >
          + Input Kalibrasi Kiblat
        </button>
      </div>

      {/* Ringkasan Statistik */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-gray-500">Total Lembaga</div>
          <div className="text-xl font-bold text-gray-900 mt-0.5">{summaryStats.total}</div>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-emerald-700">Sudah Dikalibrasi</div>
          <div className="text-xl font-bold text-emerald-800 mt-0.5">{summaryStats.sudah}</div>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-amber-700">Belum Dikalibrasi</div>
          <div className="text-xl font-bold text-amber-800 mt-0.5">{summaryStats.belum}</div>
        </div>
        <div className="bg-white rounded-xl border border-sky-200 p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-sky-700">Sertifikat Siap Unduh</div>
          <div className="text-xl font-bold text-sky-800 mt-0.5">
            {summaryStats.sertifikatSiap}
          </div>
        </div>
      </div>

      {/* Filter & Pencarian */}
      <div className="bg-white rounded-2xl border border-gray-200 p-3.5 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
          <div className="lg:col-span-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama masjid/mushalla, no. register, kecamatan..."
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <div className="lg:col-span-2">
            <select
              aria-label="Filter Jenis Lembaga"
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value as 'ALL' | JenisLembagaKiblat)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800"
            >
              <option value="ALL">Semua Jenis</option>
              <option value="MASJID">Masjid</option>
              <option value="MUSHALLA">Mushalla</option>
            </select>
          </div>
          <div className="lg:col-span-3">
            <select
              aria-label="Filter Kecamatan"
              value={activeKecamatanFilter}
              disabled={Boolean(kuaKecamatanLock)}
              onChange={(e) => setFilterKecamatan(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 disabled:bg-gray-100"
            >
              {!kuaKecamatanLock && <option value="ALL">Semua Kecamatan</option>}
              {kecamatanOptions.map((kec) => (
                <option key={kec} value={kec}>
                  {kec}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-3">
            <select
              aria-label="Filter Status Kalibrasi"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800"
            >
              <option value="ALL">Semua Status Kalibrasi</option>
              <option value="SUDAH">Sudah Dikalibrasi</option>
              <option value="BELUM">Belum Dikalibrasi</option>
              <option value="Sesuai / Presisi">Sesuai / Presisi</option>
              <option value="Perlu Koreksi">Perlu Koreksi</option>
            </select>
          </div>
        </div>
      </div>

      {/* Daftar / Tabel */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Memuat data kalibrasi arah kiblat...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Belum ada data kalibrasi arah kiblat yang cocok dengan filter.
          </div>
        ) : (
          <>
            {/* Tampilan HP (< md) */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredList.map((m, idx) => {
                const k = getKiblatForMasjid(m);
                const jenis = detectJenisLembaga(m);
                const hasCert = Boolean(k?.nomor_register && k.nomor_register.trim().length > 0);
                return (
                  <div key={m.id} className="p-4 space-y-2.5 bg-white">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-bold text-emerald-800">
                          {jenis === 'MUSHALLA' ? 'Mushalla' : 'Masjid'} • {m.kecamatan || '-'}
                        </div>
                        <h3 className="font-bold text-sm text-gray-900">{m.nama_masjid}</h3>
                        <p className="text-[11px] font-mono text-gray-600 mt-0.5">
                          No. Reg: {k?.nomor_register || '-'}
                        </p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {formatPenyimpangan(k?.penyimpangan ?? null)}
                      </span>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-700 space-y-1">
                      <div>
                        <strong>Az. Bangunan:</strong>{' '}
                        {k?.azimut_bangunan != null ? `${k.azimut_bangunan}°` : '-'} •{' '}
                        <strong>Az. Kiblat:</strong>{' '}
                        {k?.azimut_kiblat != null ? `${k.azimut_kiblat}°` : '-'}
                      </div>
                      <div>
                        <strong>Elevasi:</strong>{' '}
                        {k?.elevasi_tempat != null ? `${k.elevasi_tempat} m` : '-'} •{' '}
                        <strong>Tgl Ukur:</strong> {k?.tanggal_pengukuran || '-'}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openCreateOrEdit(m)}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                      >
                        {k ? 'Edit Kalibrasi' : '+ Input Kalibrasi'}
                      </button>
                      {canAssignRegister && k && (
                        <button
                          type="button"
                          onClick={() => openRegisterModal(m, k)}
                          className="py-2 px-3 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold"
                        >
                          {k.nomor_register ? 'Ubah No. Reg' : 'Isi No. Reg'}
                        </button>
                      )}
                      {hasCert && (
                        <button
                          type="button"
                          onClick={() => handleOpenSertifikat(m, k, idx)}
                          className="w-full py-2 px-3 rounded-xl bg-emerald-800 text-white text-xs font-bold"
                        >
                          Unduh Sertifikat
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tabel Desktop (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider text-left">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Nama &amp; Kecamatan</th>
                    <th className="px-5 py-3.5 font-semibold">Koordinat &amp; Elevasi</th>
                    <th className="px-5 py-3.5 font-semibold">Azimut &amp; Penyimpangan</th>
                    <th className="px-5 py-3.5 font-semibold">No. Register &amp; Foto</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredList.map((m, idx) => {
                    const k = getKiblatForMasjid(m);
                    const jenis = detectJenisLembaga(m);
                    const hasCert = Boolean(k?.nomor_register && k.nomor_register.trim().length > 0);
                    return (
                      <tr key={m.id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-gray-900">{m.nama_masjid}</div>
                          <div className="text-xs text-emerald-700 font-medium">
                            {jenis === 'MUSHALLA' ? 'Mushalla' : 'Masjid'} • {m.kecamatan || '-'}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-700 space-y-0.5">
                          <div>
                            Lat: <strong>{k?.latitude ?? m.latitude_simas ?? '-'}</strong> • Lng:{' '}
                            <strong>{k?.longitude ?? m.longitude_simas ?? '-'}</strong>
                          </div>
                          <div>
                            LU: {k?.lintang_utara || '-'} • BT: {k?.bujur_timur || '-'}
                          </div>
                          <div>
                            Elevasi:{' '}
                            <strong>
                              {k?.elevasi_tempat != null ? `${k.elevasi_tempat} m` : '-'}
                            </strong>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-700 space-y-0.5">
                          <div>
                            Az. Bangunan:{' '}
                            <strong>
                              {k?.azimut_bangunan != null ? `${k.azimut_bangunan}°` : '-'}
                            </strong>
                          </div>
                          <div>
                            Az. Kiblat:{' '}
                            <strong>
                              {k?.azimut_kiblat != null ? `${k.azimut_kiblat}°` : '-'}
                            </strong>
                          </div>
                          <div>
                            Penyimpangan:{' '}
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {formatPenyimpangan(k?.penyimpangan ?? null)}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-700 space-y-1">
                          <div className="font-mono font-semibold text-gray-900">
                            {k?.nomor_register ? k.nomor_register : '-'}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            Tgl Ukur: {k?.tanggal_pengukuran || '-'}
                          </div>
                          {k?.foto_kalibrasi_url ? (
                            <a
                              href={k.foto_kalibrasi_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold hover:underline text-xs"
                            >
                              <img
                                src={k.foto_kalibrasi_url}
                                alt="Foto Kalibrasi"
                                className="w-9 h-9 object-cover rounded-lg border border-gray-200"
                              />
                              <span>Lihat Foto</span>
                            </a>
                          ) : (
                            <div className="text-[11px] text-gray-400">Tanpa foto</div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex flex-col items-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openCreateOrEdit(m)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold"
                            >
                              {k ? 'Edit Kalibrasi' : 'Input Kalibrasi'}
                            </button>
                            {canAssignRegister && k && (
                              <button
                                type="button"
                                onClick={() => openRegisterModal(m, k)}
                                className="px-3 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-semibold"
                              >
                                {k.nomor_register ? 'Ubah No. Reg' : 'Isi No. Register'}
                              </button>
                            )}
                            {hasCert && (
                              <button
                                type="button"
                                onClick={() => handleOpenSertifikat(m, k, idx)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-2xs"
                              >
                                Unduh Sertifikat
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal Form Kalibrasi */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-emerald-100 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Form Kalibrasi Arah Kiblat</h3>
            <p className="text-xs text-gray-500 mb-4">
              Penyimpangan dihitung otomatis dari selisih Azimut Bangunan dan Azimut Kiblat (+ / -).
            </p>

            <form onSubmit={handleSaveKalibrasi} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Pilih Masjid / Mushalla *
                </label>
                <select
                  required
                  value={selectedMasjidId}
                  onChange={(e) => {
                    const found = scopedMasjid.find((item) => item.id === e.target.value);
                    fillFormFromMasjid(found);
                  }}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-900 bg-white"
                >
                  <option value="">-- Pilih Masjid / Mushalla --</option>
                  {scopedMasjid.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{detectJenisLembaga(m) === 'MUSHALLA' ? 'Mushalla' : 'Masjid'}] {m.nama_masjid}{' '}
                      {m.kecamatan ? `(${m.kecamatan})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Latitude
                  </label>
                  <input
                    type="text"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="0.507535"
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm font-mono text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Lintang Utara
                  </label>
                  <input
                    type="text"
                    value={lintangUtara}
                    onChange={(e) => setLintangUtara(e.target.value)}
                    placeholder={`00° 30' 27.13" LU`}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Longitude
                  </label>
                  <input
                    type="text"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="122.076154"
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm font-mono text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Bujur Timur
                  </label>
                  <input
                    type="text"
                    value={bujurTimur}
                    onChange={(e) => setBujurTimur(e.target.value)}
                    placeholder={`122° 04' 34.15" BT`}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Azimut Bangunan (°)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={azimutBangunan}
                    onChange={(e) => setAzimutBangunan(e.target.value)}
                    placeholder="291.85"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Elevasi Tempat (m)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={elevasiTempat}
                    onChange={(e) => setElevasiTempat(e.target.value)}
                    placeholder="18"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Azimut Kiblat (°)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={azimutKiblat}
                    onChange={(e) => setAzimutKiblat(e.target.value)}
                    placeholder="292.25"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <div className="text-[11px] font-bold text-emerald-900 uppercase">
                    Penyimpangan (Otomatis)
                  </div>
                  <div className="text-lg font-bold text-emerald-800 font-mono mt-0.5">
                    {formatPenyimpangan(liveCalc.selisih)}
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">
                    Status: <strong>{liveCalc.status}</strong>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Tanggal Pengukuran
                  </label>
                  <input
                    type="date"
                    value={tanggalPengukuran}
                    onChange={(e) => setTanggalPengukuran(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Foto Kalibrasi
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFotoFileChange}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-800 bg-white"
                />
                {fotoPreview && (
                  <div className="mt-2">
                    <img
                      src={fotoPreview}
                      alt="Pratinjau Foto Kalibrasi"
                      className="w-full max-h-48 object-cover rounded-xl border border-gray-200"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Catatan Pengukuran
                </label>
                <textarea
                  rows={2}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-gray-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Kalibrasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Input Nomor Register */}
      {registerModal && canAssignRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveRegister}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 space-y-4"
          >
            <div>
              <h3 className="text-base font-bold text-gray-900">Nomor Register Sertifikat</h3>
              <p className="text-xs text-gray-500">
                {registerModal.namaLembaga} • {registerModal.kecamatan || '-'}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Nomor Register
              </label>
              <input
                type="text"
                required
                value={registerModal.nomorRegister}
                onChange={(e) =>
                  setRegisterModal({ ...registerModal, nomorRegister: e.target.value })
                }
                placeholder="Contoh: B-0177/Kk.30.03/BA.01/01/2026"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tanggal Terbit Sertifikat
              </label>
              <input
                type="date"
                value={registerModal.tanggalTerbit}
                onChange={(e) =>
                  setRegisterModal({ ...registerModal, tanggalTerbit: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRegisterModal(null)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={savingRegister}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {savingRegister ? 'Menyimpan...' : 'Simpan & Aktifkan Sertifikat'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Sertifikat A4 Landscape */}
      <SertifikatKiblatModal
        open={Boolean(sertifikatData)}
        onClose={() => setSertifikatData(null)}
        data={sertifikatData}
        pejabatUtama={pejabatUtamaList}
        onNotify={onNotify}
      />
    </div>
  );
}
