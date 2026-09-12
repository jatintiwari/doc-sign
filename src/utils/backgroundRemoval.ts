import { SignatureProcessingSettings } from '../types';

export interface ProcessedSignatureResult {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  aspectRatio: number;
}

// Convert hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const sanitized = hex.replace('#', '');
  if (sanitized.length === 3) {
    const r = parseInt(sanitized[0] + sanitized[0], 16);
    const g = parseInt(sanitized[1] + sanitized[1], 16);
    const b = parseInt(sanitized[2] + sanitized[2], 16);
    return { r, g, b };
  } else if (sanitized.length === 6) {
    const r = parseInt(sanitized.substring(0, 2), 16);
    const g = parseInt(sanitized.substring(2, 4), 16);
    const b = parseInt(sanitized.substring(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

export async function processSignatureImage(
  imageSource: HTMLImageElement | string | File | Blob,
  settings: SignatureProcessingSettings
): Promise<ProcessedSignatureResult> {
  // 1. Load image
  let img: HTMLImageElement;
  if (imageSource instanceof HTMLImageElement) {
    img = imageSource;
  } else {
    img = new Image();
    img.crossOrigin = 'anonymous';
    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      img.src = URL.createObjectURL(imageSource);
    }
    await new Promise((resolve, reject) => {
      img.onload = () => resolve(true);
      img.onerror = (e) => reject(new Error('Failed to load signature image: ' + e));
    });
  }

  const origWidth = img.naturalWidth || img.width;
  const origHeight = img.naturalHeight || img.height;

  if (origWidth === 0 || origHeight === 0) {
    throw new Error('Invalid signature image dimensions');
  }

  // 2. Render to offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = origWidth;
  canvas.height = origHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context not available');

  ctx.drawImage(img, 0, 0, origWidth, origHeight);
  const imgData = ctx.getImageData(0, 0, origWidth, origHeight);
  const data = imgData.data;

  const threshold = settings.threshold; // typically 160-240
  const smoothness = Math.max(1, settings.smoothness); // feather range
  const contrast = settings.contrast || 1.2;
  const targetInkRgb = settings.preserveColor ? null : hexToRgb(settings.inkColor);

  let minX = origWidth;
  let minY = origHeight;
  let maxX = 0;
  let maxY = 0;
  let hasInkPixels = false;

  // Process pixel by pixel
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    const initialA = data[i + 3];

    // Skip already fully transparent pixels
    if (initialA === 0) continue;

    // Luminance formula (ITU-R BT.601)
    let lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // Invert mode if white signature on dark paper/screen
    if (settings.invert) {
      lum = 255 - lum;
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }

    // Alpha calculation:
    // If lum >= threshold, it's paper -> Alpha = 0
    // If lum <= threshold - smoothness, it's solid ink -> Alpha = 255
    // In between -> smooth transition
    let alpha = 0;
    if (lum < threshold) {
      if (lum <= threshold - smoothness) {
        alpha = 255;
      } else {
        const factor = (threshold - lum) / smoothness;
        alpha = Math.round(factor * 255);
      }
    }

    // Multiply by initial alpha in case the source was already semi-transparent
    alpha = Math.round((alpha * (initialA / 255)));

    // Contrast boost on ink
    if (alpha > 0 && contrast > 1) {
      const inkIntensity = alpha / 255;
      const boosted = Math.pow(inkIntensity, 1 / contrast);
      alpha = Math.min(255, Math.round(boosted * 255));
    }

    if (alpha > 8) {
      const pixelIdx = i / 4;
      const x = pixelIdx % origWidth;
      const y = Math.floor(pixelIdx / origWidth);

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      hasInkPixels = true;
    }

    // Apply ink recolor or keep original
    if (targetInkRgb) {
      data[i] = targetInkRgb.r;
      data[i + 1] = targetInkRgb.g;
      data[i + 2] = targetInkRgb.b;
      data[i + 3] = alpha;
    } else {
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = alpha;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Auto-crop if enabled and valid ink pixels were detected
  let finalCanvas = canvas;
  let finalWidth = origWidth;
  let finalHeight = origHeight;

  if (settings.autoCrop && hasInkPixels && maxX >= minX && maxY >= minY) {
    const pad = 8;
    const cropX = Math.max(0, minX - pad);
    const cropY = Math.max(0, minY - pad);
    const cropWidth = Math.min(origWidth - cropX, maxX - minX + 1 + pad * 2);
    const cropHeight = Math.min(origHeight - cropY, maxY - minY + 1 + pad * 2);

    if (cropWidth > 0 && cropHeight > 0) {
      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = cropWidth;
      croppedCanvas.height = cropHeight;
      const cropCtx = croppedCanvas.getContext('2d');
      if (cropCtx) {
        cropCtx.drawImage(
          canvas,
          cropX,
          cropY,
          cropWidth,
          cropHeight,
          0,
          0,
          cropWidth,
          cropHeight
        );
        finalCanvas = croppedCanvas;
        finalWidth = cropWidth;
        finalHeight = cropHeight;
      }
    }
  }

  const dataUrl = finalCanvas.toDataURL('image/png');
  const blob = await new Promise<Blob>((resolve) => {
    finalCanvas.toBlob((b) => resolve(b || new Blob()), 'image/png');
  });

  return {
    dataUrl,
    blob,
    width: finalWidth,
    height: finalHeight,
    aspectRatio: finalWidth / finalHeight,
  };
}
