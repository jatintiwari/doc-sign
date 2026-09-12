import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument, degrees } from 'pdf-lib';
import { PlacedSignature } from '../types';

// Set up pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

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

export async function signPdfDocument(
  originalPdfBytes: ArrayBuffer | Uint8Array,
  signatures: PlacedSignature[],
  signatureDataUrl: string
): Promise<Uint8Array> {
  let bytesToLoad: Uint8Array;
  if (originalPdfBytes instanceof Uint8Array) {
    bytesToLoad = originalPdfBytes.slice();
  } else {
    bytesToLoad = new Uint8Array(originalPdfBytes.slice(0));
  }
  const pdfDoc = await PDFDocument.load(bytesToLoad);
  const pngBytes = dataUrlToUint8Array(signatureDataUrl);
  const embeddedPng = await pdfDoc.embedPng(pngBytes);

  const pages = pdfDoc.getPages();

  // If signatures array is empty, default to page 0 signature
  const sigs = signatures.length > 0 ? signatures : [{
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

  for (const sig of sigs) {
    const pIndex = sig.pageIndex ?? 0;
    if (pIndex < 0 || pIndex >= pages.length) continue;

    const page = pages[pIndex];
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const pageRot = page.getRotation().angle || 0;

    let targetWidth = (sig.width / 100) * pageWidth;
    let targetHeight = (sig.height / 100) * pageHeight;
    let centerX = ((sig.x + sig.width / 2) / 100) * pageWidth;
    let centerY_FromTop = ((sig.y + sig.height / 2) / 100) * pageHeight;

    let centerPdfX = centerX;
    let centerPdfY = pageHeight - centerY_FromTop;

    // Handle PDF intrinsic page rotation
    if (pageRot === 90) {
      targetWidth = (sig.width / 100) * pageHeight;
      targetHeight = (sig.height / 100) * pageWidth;
      const visualCenterX = ((sig.x + sig.width / 2) / 100) * pageHeight;
      const visualCenterY = ((sig.y + sig.height / 2) / 100) * pageWidth;
      centerPdfX = visualCenterY;
      centerPdfY = visualCenterX;
    } else if (pageRot === 180) {
      centerPdfX = pageWidth - centerX;
      centerPdfY = centerY_FromTop;
    } else if (pageRot === 270) {
      targetWidth = (sig.width / 100) * pageHeight;
      targetHeight = (sig.height / 100) * pageWidth;
      const visualCenterX = ((sig.x + sig.width / 2) / 100) * pageHeight;
      const visualCenterY = ((sig.y + sig.height / 2) / 100) * pageWidth;
      centerPdfX = pageWidth - visualCenterY;
      centerPdfY = pageHeight - visualCenterX;
    }

    const totalRotation = (sig.rotation - pageRot);
    const rotRad = (totalRotation * Math.PI) / 180;
    const cos = Math.cos(rotRad);
    const sin = Math.sin(rotRad);

    const halfW = targetWidth / 2;
    const halfH = targetHeight / 2;

    const cornerX = centerPdfX - (halfW * cos - halfH * sin);
    const cornerY = centerPdfY - (halfW * sin + halfH * cos);

    page.drawImage(embeddedPng, {
      x: cornerX,
      y: cornerY,
      width: targetWidth,
      height: targetHeight,
      opacity: sig.opacity ?? 1,
      rotate: degrees(-totalRotation),
    });
  }

  return await pdfDoc.save();
}
