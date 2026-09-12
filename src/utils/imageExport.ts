import { PDFDocument } from 'pdf-lib';
import { DocumentAnnotation } from '../types';

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
  annotations: DocumentAnnotation[],
  signatureImg: HTMLImageElement | null,
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

  // Filter annotations for this page
  const pageAnnotations = annotations.filter((s) => (s.pageIndex ?? 0) === pageIndex);
  const itemsToDraw = pageAnnotations.length > 0 ? pageAnnotations : (pageIndex === 0 && annotations.length > 0 ? annotations : []);

  for (const ann of itemsToDraw) {
    const x = (ann.x / 100) * baseW;
    const y = (ann.y / 100) * baseH;
    const w = (ann.width / 100) * baseW;
    const h = (ann.height / 100) * baseH;

    ctx.save();
    ctx.globalAlpha = ann.opacity ?? 1;

    // Center transformation for rotation
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((ann.rotation * Math.PI) / 180);

    const type = ann.type || 'signature';

    if (type === 'signature' && signatureImg) {
      ctx.drawImage(signatureImg, -w / 2, -h / 2, w, h);
    } else if (type === 'text') {
      const text = ann.text || 'Text';
      const fontSize = (ann.fontSize || 18) * (baseW / 850);
      const isBold = ann.isBold ? 'bold ' : '';
      const isItalic = ann.isItalic ? 'italic ' : '';
      const fontFamily =
        ann.fontFamily === 'serif' ? 'serif' : ann.fontFamily === 'mono' ? 'monospace' : '"Plus Jakarta Sans", sans-serif';

      ctx.font = `${isItalic}${isBold}${Math.round(fontSize)}px ${fontFamily}`;
      ctx.textBaseline = 'top';

      // Background highlight pill if specified
      if (ann.backgroundColor && ann.backgroundColor !== 'transparent') {
        ctx.fillStyle = ann.backgroundColor;
        ctx.fillRect(-w / 2, -h / 2, w, h);
      }

      ctx.fillStyle = ann.fontColor || '#111827';
      // Multi-line text support
      const lines = text.split('\n');
      const lineHeight = fontSize * 1.25;
      let lineY = -h / 2 + 4;
      for (const line of lines) {
        ctx.fillText(line, -w / 2 + 4, lineY);
        lineY += lineHeight;
      }
    } else if (type === 'box') {
      const strokeWidth = (ann.strokeWidth || 3) * (baseW / 850);
      ctx.lineWidth = Math.max(1, strokeWidth);
      ctx.strokeStyle = ann.strokeColor || '#ef4444';

      if (ann.isDashed) {
        ctx.setLineDash([8, 6]);
      } else {
        ctx.setLineDash([]);
      }

      if (ann.fillColor && ann.fillColor !== 'transparent') {
        ctx.fillStyle = ann.fillColor;
        ctx.fillRect(-w / 2, -h / 2, w, h);
      }

      ctx.strokeRect(-w / 2, -h / 2, w, h);
    } else if (type === 'arrow') {
      const strokeWidth = (ann.arrowThickness || 4) * (baseW / 850);
      const color = ann.arrowColor || '#ef4444';
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw arrow from left (-w/2, 0) to right (w/2, 0)
      const startX = -w / 2;
      const startY = 0;
      const endX = w / 2;
      const endY = 0;

      const headLength = Math.min(w * 0.4, Math.max(12, strokeWidth * 3.5));
      const headAngle = Math.PI / 6; // 30 degrees

      // Shaft line
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Arrow head
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - headLength * Math.cos(headAngle), endY - headLength * Math.sin(headAngle));
      ctx.lineTo(endX - headLength * Math.cos(-headAngle), endY - headLength * Math.sin(-headAngle));
      ctx.closePath();
      ctx.fill();
    }

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
