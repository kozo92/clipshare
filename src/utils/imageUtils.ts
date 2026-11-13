const SUPPORTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

export function readImageFileAsDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const mime = file.type || 'image/png';
    if (!SUPPORTED_MIME_TYPES.includes(mime)) {
      reject(new Error('Unsupported image format. Please use PNG, JPEG, WebP, or GIF.'));
      return;
    }

    if (file.size > 9 * 1024 * 1024) {
      reject(new Error('Image exceeds the 9MB maximum size limit.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read image data.'));
      }
    };
    reader.onerror = () => reject(new Error('Error reading image file.'));
    reader.readAsDataURL(file);
  });
}

export function estimateDataUrlBytes(dataUrl: string): number {
  const base64Index = dataUrl.indexOf(',');
  if (base64Index === -1) return 0;
  const base64 = dataUrl.slice(base64Index + 1);
  const padding = (base64.match(/=+$/) || [''])[0].length;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export function getImageExtensionFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,/);
  if (!match) return 'png';
  return match[1] === 'jpeg' ? 'jpg' : match[1];
}

export async function copyImageDataUrlToClipboard(dataUrl: string): Promise<void> {
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
    throw new Error('Your browser does not support copying images directly to the clipboard.');
  }

  // Browsers universally support 'image/png' in ClipboardItem
  const pngBlob = await convertDataUrlToPngBlob(dataUrl);
  await navigator.clipboard.write([
    new ClipboardItem({
      'image/png': pngBlob,
    }),
  ]);
}

function convertDataUrlToPngBlob(dataUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // If already PNG, convert base64 directly to Blob
    if (dataUrl.startsWith('data:image/png;base64,')) {
      fetch(dataUrl)
        .then(res => res.blob())
        .then(resolve)
        .catch(reject);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(blob => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert image to PNG'));
        }
      }, 'image/png');
    };
    img.onerror = () => reject(new Error('Failed to load image for clipboard copy'));
    img.src = dataUrl;
  });
}
