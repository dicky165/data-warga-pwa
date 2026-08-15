'use client';

import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, CheckCircle2, RefreshCw } from 'lucide-react';
import { compressReceiptImage } from '@/lib/utils/image-compressor';

interface CameraUploaderProps {
  onImageCaptured: (file: File) => void;
}

export default function CameraUploader({ onImageCaptured }: CameraUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileSizeInfo, setFileSizeInfo] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const originalKB = (file.size / 1024).toFixed(1);
      
      // Kompresi otomatis di bawah 150KB
      const compressedFile = await compressReceiptImage(file, 150);
      const compressedKB = (compressedFile.size / 1024).toFixed(1);

      setFileSizeInfo(`Ukuran: ${compressedKB} KB (dari ${originalKB} KB)`);
      setPreviewUrl(URL.createObjectURL(compressedFile));
      onImageCaptured(compressedFile);
    } catch (error) {
      console.error('Gagal mengompresi nota:', error);
    } finally {
      setIsCompressing(false);
    }
  };

  const triggerCamera = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      {/* Input file tersembunyi dengan trigger kamera belakang native */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {!previewUrl ? (
        <button
          type="button"
          onClick={triggerCamera}
          disabled={isCompressing}
          className="w-full h-32 border-2 border-dashed border-sky-300 bg-sky-50/50 hover:bg-sky-50 active:bg-sky-100 rounded-2xl flex flex-col items-center justify-center gap-2 text-sky-700 transition-all cursor-pointer"
        >
          <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-sky-600">
            <Camera className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold">
            {isCompressing ? 'Mengompresi Nota...' : 'Foto Nota Keuangan (Kamera HP)'}
          </span>
          <span className="text-[10px] text-slate-400">Target otomatis &lt; 150 KB</span>
        </button>
      ) : (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900">
          {/* Preview Foto */}
          <img
            src={previewUrl}
            alt="Preview Nota"
            className="w-full h-48 object-cover opacity-90"
          />

          {/* Badge Info Ukuran File */}
          <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-md text-white text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{fileSizeInfo}</span>
          </div>

          {/* Tombol Ambil Ulang Foto */}
          <button
            type="button"
            onClick={triggerCamera}
            className="absolute bottom-2 right-2 h-9 px-3 bg-white/90 hover:bg-white text-slate-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Foto Ulang</span>
          </button>
        </div>
      )}
    </div>
  );
}