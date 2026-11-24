'use client';

import React from 'react';
import type { DeleteTarget, ModalEntity } from '../types';

interface DeleteConfirmModalProps {
  showDeleteModal: boolean;
  onClose: () => void;
  deleteTarget: DeleteTarget | null;
  processing: boolean;
  onConfirm: () => Promise<void>;
}

export function DeleteConfirmModal({
  showDeleteModal,
  onClose,
  deleteTarget,
  processing,
  onConfirm,
}: DeleteConfirmModalProps) {
  if (!showDeleteModal || !deleteTarget) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-red-100 text-center">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
          ⚠️
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-1">Konfirmasi Hapus</h3>
        <p className="text-xs text-gray-600 mb-6">
          Yakin ingin menghapus{' '}
          <strong className="text-gray-900">"{deleteTarget.nama}"</strong> dari master data?
          Tindakan ini tidak dapat dibatalkan.
        </p>

        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={processing}
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-md shadow-red-600/20"
          >
            {processing ? 'Menghapus...' : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  );
}