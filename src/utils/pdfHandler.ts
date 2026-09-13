import * as pdfjsLib from 'pdfjs-dist';
import PDFWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { DocumentAnnotation } from '../types';

// Initialize PDF.js worker directly via bundled Web Worker to avoid any network / dynamic import issues
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerPort = new PDFWorker();
  } catch (e) {
    console.warn('Direct workerPort initialization fallback:', e);
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }
}

export interface RenderedPdfPage {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  aspectRatio: number;
}

export async function loadPdfDocument(pdfData: ArrayBuffer | Uint8Array): Promise<pdfjsLib.PDFDocumentProxy> {
  let dataCopy: Uint8Array;
  if (pdfData instanceof Uint8Array) {
    dataCopy = pdfData.slice();
  } else {
    dataCopy = new Uint8Array(pdfData.slice(0));
  }
  const loadingTask = pdfjsLib.getDocument({ data: dataCopy });
  return await loadingTask.promise;
}

export async function renderPdfPage(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  targetDpiScale: number = 2.0
): Promise<RenderedPdfPage> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: targetDpiScale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Could not create canvas context for PDF rendering');

  const renderContext = {
    canvasContext: ctx,
    viewport: viewport,
  };

  await page.render(renderContext).promise;

  return {
    canvas,
    width: viewport.width,
    height: viewport.height,
    aspectRatio: viewport.width / viewport.height,
  };
}

// Convert base64 / dataUrl to Uint8Array
function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Convert hex or rgba color to pdf-lib rgb
function hexToPdfRgb(hex?: string) {
  if (!hex || hex === 'transparent') return undefined;
  
  // Handle rgba(...) strings
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
    const match = hex.match(/\d+(\.\d+)?/g);
    if (match && match.length >= 3) {
      return rgb(
        parseFloat(match[0]) / 255,
        parseFloat(match[1]) / 255,
        parseFloat(match[2]) / 255
      );
    }
  }

  const sanitized = hex.replace('#', '');
  let r = 0, g = 0, b = 0;
  if (sanitized.length === 3) {
    r = parseInt(sanitized[0] + sanitized[0], 16) / 255;
    g = parseInt(sanitized[1] + sanitized[1], 16) / 255;
    b = parseInt(sanitized[2] + sanitized[2], 16) / 255;
  } else if (sanitized.length === 6) {
    r = parseInt(sanitized.substring(0, 2), 16) / 255;
    g = parseInt(sanitized.substring(2, 4), 16) / 255;
    b = parseInt(sanitized.substring(4, 6), 16) / 255;
  }
  return rgb(r, g, b);
}

export async function signPdfDocument(
  originalPdfBytes: ArrayBuffer | Uint8Array,
  annotations: DocumentAnnotation[],
  signatureDataUrl?: string
): Promise<Uint8Array> {
  let bytesToLoad: Uint8Array;
  if (originalPdfBytes instanceof Uint8Array) {
    bytesToLoad = originalPdfBytes.slice();
  } else {
    bytesToLoad = new Uint8Array(originalPdfBytes.slice(0));
  }
  const pdfDoc = await PDFDocument.load(bytesToLoad);
  
  // Pre-embed standard fonts
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontHelveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const fontCourier = await pdfDoc.embedFont(StandardFonts.Courier);
  const fontTimesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  let embeddedSignaturePng: any = null;
  if (signatureDataUrl) {
    try {
      const pngBytes = dataUrlToUint8Array(signatureDataUrl);
      embeddedSignaturePng = await pdfDoc.embedPng(pngBytes);
    } catch (e) {
      console.warn('Failed to embed signature PNG:', e);
    }
  }

  const pages = pdfDoc.getPages();

  const items = annotations.length > 0 ? annotations : [{
    id: 'default',
    type: 'signature' as const,
    pageIndex: 0,
    x: 55,
    y: 75,
    width: 28,
    height: 12,
    rotation: 0,
    opacity: 1,
    aspectRatio: 2.5
  }];

  for (const ann of items) {
    const pIndex = ann.pageIndex ?? 0;
    if (pIndex < 0 || pIndex >= pages.length) continue;

    const page = pages[pIndex];
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const pageRot = page.getRotation().angle || 0;

    const targetWidth = (ann.width / 100) * pageWidth;
    const targetHeight = (ann.height / 100) * pageHeight;
    const centerX = ((ann.x + ann.width / 2) / 100) * pageWidth;
    const centerY_FromTop = ((ann.y + ann.height / 2) / 100) * pageHeight;

    let centerPdfX = centerX;
    let centerPdfY = pageHeight - centerY_FromTop;

    // Handle PDF intrinsic page rotation
    if (pageRot === 90) {
      centerPdfX = centerY_FromTop;
      centerPdfY = centerX;
    } else if (pageRot === 180) {
      centerPdfX = pageWidth - centerX;
      centerPdfY = centerY_FromTop;
    } else if (pageRot === 270) {
      centerPdfX = pageWidth - centerY_FromTop;
      centerPdfY = pageHeight - centerX;
    }

    const totalRotation = (ann.rotation - pageRot);
    const rotRad = (totalRotation * Math.PI) / 180;
    const cos = Math.cos(rotRad);
    const sin = Math.sin(rotRad);

    const halfW = targetWidth / 2;
    const halfH = targetHeight / 2;

    const cornerX = centerPdfX - (halfW * cos - halfH * sin);
    const cornerY = centerPdfY - (halfW * sin + halfH * cos);

    const type = ann.type || 'signature';

    if (type === 'signature' && embeddedSignaturePng) {
      page.drawImage(embeddedSignaturePng, {
        x: cornerX,
        y: cornerY,
        width: targetWidth,
        height: targetHeight,
        opacity: ann.opacity ?? 1,
        rotate: degrees(-totalRotation),
      });
    } else if (type === 'text') {
      const text = ann.text || 'Text';
      const fontSize = Math.max(8, (ann.fontSize || 16) * (pageWidth / 600));
      
      let font = fontHelvetica;
      if (ann.fontFamily === 'mono') font = fontCourier;
      else if (ann.fontFamily === 'serif') font = fontTimesRoman;
      else if (ann.isBold) font = fontHelveticaBold;
      else if (ann.isItalic) font = fontHelveticaOblique;

      const textColor = hexToPdfRgb(ann.fontColor) || rgb(0.1, 0.1, 0.1);
      const bgColor = hexToPdfRgb(ann.backgroundColor);
      const bgOpacity = ann.backgroundOpacity ?? 0.8;

      if (bgColor) {
        page.drawRectangle({
          x: cornerX,
          y: cornerY,
          width: targetWidth,
          height: targetHeight,
          color: bgColor,
          opacity: (ann.opacity ?? 1) * bgOpacity,
          rotate: degrees(-totalRotation),
        });
      }

      // Draw lines
      const lines = text.split('\n');
      const lineHeight = fontSize * 1.25;
      let textY = cornerY + targetHeight - fontSize;

      for (const line of lines) {
        page.drawText(line, {
          x: cornerX + 4,
          y: textY,
          size: fontSize,
          font: font,
          color: textColor,
          opacity: ann.opacity ?? 1,
          rotate: degrees(-totalRotation),
        });
        textY -= lineHeight;
      }
    } else if (type === 'box') {
      const strokeColor = hexToPdfRgb(ann.strokeColor) || rgb(0.9, 0.2, 0.2);
      const fillColor = hexToPdfRgb(ann.fillColor);
      const strokeWidth = ann.strokeWidth !== undefined ? (ann.strokeWidth * (pageWidth / 800)) : 2;
      const fillOpacity = ann.fillOpacity ?? (fillColor ? 0.35 : 0);

      // Draw solid / translucent fill for redactions & highlights
      if (fillColor && fillOpacity > 0) {
        page.drawRectangle({
          x: cornerX,
          y: cornerY,
          width: targetWidth,
          height: targetHeight,
          color: fillColor,
          opacity: (ann.opacity ?? 1) * fillOpacity,
          rotate: degrees(-totalRotation),
        });
      }

      // Draw stroke border if width > 0
      if (strokeWidth > 0 && strokeColor) {
        page.drawRectangle({
          x: cornerX,
          y: cornerY,
          width: targetWidth,
          height: targetHeight,
          borderColor: strokeColor,
          borderWidth: strokeWidth,
          borderOpacity: ann.opacity ?? 1,
          rotate: degrees(-totalRotation),
        });
      }
    } else if (type === 'arrow') {
      const arrowColor = hexToPdfRgb(ann.arrowColor) || rgb(0.9, 0.2, 0.2);
      const thickness = Math.max(2, (ann.arrowThickness || 4) * (pageWidth / 800));

      const startX = centerPdfX - halfW * cos;
      const startY = centerPdfY - halfW * sin;
      const endX = centerPdfX + halfW * cos;
      const endY = centerPdfY + halfW * sin;

      page.drawLine({
        start: { x: startX, y: startY },
        end: { x: endX, y: endY },
        thickness: thickness,
        color: arrowColor,
        opacity: ann.opacity ?? 1,
      });

      const headLen = Math.min(targetWidth * 0.4, Math.max(10, thickness * 3.5));
      const headAngle = Math.PI / 6;

      const angle = Math.atan2(endY - startY, endX - startX);
      const arrowPoint1X = endX - headLen * Math.cos(angle - headAngle);
      const arrowPoint1Y = endY - headLen * Math.sin(angle - headAngle);
      const arrowPoint2X = endX - headLen * Math.cos(angle + headAngle);
      const arrowPoint2Y = endY - headLen * Math.sin(angle + headAngle);

      page.drawLine({
        start: { x: endX, y: endY },
        end: { x: arrowPoint1X, y: arrowPoint1Y },
        thickness: thickness,
        color: arrowColor,
        opacity: ann.opacity ?? 1,
      });

      page.drawLine({
        start: { x: endX, y: endY },
        end: { x: arrowPoint2X, y: arrowPoint2Y },
        thickness: thickness,
        color: arrowColor,
        opacity: ann.opacity ?? 1,
      });
    }
  }

  return await pdfDoc.save();
}
