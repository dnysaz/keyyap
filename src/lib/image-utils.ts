/**
 * KeyYap Image Utilities
 * Handles browser-side image compression to save Supabase Storage space.
 */

export async function compressImage(file: File, maxWidth = 800, quality = 0.6): Promise<Blob> {
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

        // Resize logic
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Failed to get canvas context'));

        // Draw image to canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to Blob (WebP is much lighter than JPEG/PNG)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              console.log(`📸 Image compressed: ${(file.size / 1024).toFixed(2)}KB -> ${(blob.size / 1024).toFixed(2)}KB`);
              resolve(blob);
            } else {
              reject(new Error('Canvas toBlob failed'));
            }
          },
          'image/webp', // Using WebP for best compression
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export function getBannerGradient(seed: string) {
  // Solid, bright and clean orange
  return 'from-orange-100 to-orange-100';
}
