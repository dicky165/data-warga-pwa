/**
 * Mengompresi file gambar di sisi klien hingga ukurannya di bawah targetSizeKB (default 150KB)
 */
export async function compressReceiptImage(
  file: File,
  targetSizeKB: number = 150
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Limasi dimensi maksimum 1280px agar hemat memori & cepat di-compress
        const maxDimension = 1280;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Gagal memproses kanvas gambar'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.8;
        const compress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Gagal mengompresi gambar'));
                return;
              }

              const sizeInKB = blob.size / 1024;
              if (sizeInKB <= targetSizeKB || quality <= 0.2) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                quality -= 0.1;
                compress();
              }
            },
            'image/jpeg',
            quality
          );
        };

        compress();
      };

      img.onerror = (error) => reject(error);
    };

    reader.onerror = (error) => reject(error);
  });
}