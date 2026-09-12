import { PDFDocument } from 'pdf-lib';
import { PlacedSignature } from '../types';

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image: ' + e));
    img.src = src;
    if (img.complete && img.naturalWidth > 0) {
      resolve(img);
    }
  });
}

export async function createCompositeCanvas(
  baseCanvasOrImage: HTMLCanvasElement | HTMLImageElement,
  signatures: PlacedSignature[],
  signatureImg: HTMLImageElement,
  pageIndex: number = 0,
  scaleMultiplier: number = 1
): Promise<HTMLCanvasElement> {
  const baseW = Math.round((baseCanvasOrImage instanceof HTMLImageElement ? baseCanvasOrImage.naturalWidth : baseCanvasOrImage.width) * scaleMultiplier);
  const baseH = Math.round((baseCanvasOrImage instanceof HTMLImageElement ? baseCanvasOrImage.naturalHeight : baseCanvasOrImage.height) * scaleMultiplier);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = baseW;
  outCanvas.height = baseH;
  const ctx = outCanvas.getContext('2d');
  if (!ctx) throw new Error('Could not create composite 2D canvas');

  // Draw base document
  ctx.drawImage(baseCanvasOrImage, 0, 0, baseW, baseH);

  // Filter signatures for this page (or all signatures if only 1 page)
  const pageSignatures = signatures.filter((s) => (s.pageIndex ?? 0) === pageIndex);
  const sigsToDraw = pageSignatures.length > 0 ? pageSignatures : (pageIndex === 0 && signatures.length > 0 ? signatures : []);

  // If no signatures in array, add a default placed signature so output is never empty
  const finalSigs = sigsToDraw.length > 0 ? sigsToDraw : [{
    id: 'default',
    pageIndex: 0,
    x: 55,
    y: 75,
    width: 28,
    height: 12,
    rotation: 0,
    opacity: 1,
    aspectRatio: 2.5
  }];

  for (const sig of finalSigs) {
    const x = (sig.x / 100) * baseW;
    const y = (sig.y / 100) * baseH;
    const w = (sig.width / 100) * baseW;
    const h = (sig.height / 100) * baseH;

    ctx.save();
    ctx.globalAlpha = sig.opacity ?? 1;

    // Move to center of signature for rotation
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((sig.rotation * Math.PI) / 180);
    ctx.drawImage(signatureImg, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  return outCanvas;
}

export async function exportImageAsPdf(
  compositeCanvas: HTMLCanvasElement
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const pngDataUrl = compositeCanvas.toDataURL('image/png');
  const base64 = pngDataUrl.split(',')[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const pngImage = await pdfDoc.embedPng(bytes);
  const page = pdfDoc.addPage([compositeCanvas.width, compositeCanvas.height]);
  page.drawImage(pngImage, {
    x: 0,
    y: 0,
    width: compositeCanvas.width,
    height: compositeCanvas.height,
  });

  return await pdfDoc.save();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
