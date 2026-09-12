export type DocumentType = 'image' | 'pdf';

export interface DocumentState {
  file: File | null;
  name: string;
  type: DocumentType;
  url: string;
  pdfData?: ArrayBuffer | Uint8Array;
  numPages: number;
  currentPage: number;
  originalWidth: number;
  originalHeight: number;
}

export interface SignatureProcessingSettings {
  threshold: number; // 0 to 255 (paper luminance cut-off)
  smoothness: number; // 0 to 50 (feathering / soft edge transition)
  contrast: number; // 1 to 3 (boost ink darkness/crispness)
  inkColor: string; // 'original' or hex color '#003366', '#000000', etc.
  preserveColor: boolean;
  invert: boolean; // For white-on-dark signature photos
  autoCrop: boolean;
}

export interface PlacedSignature {
  id: string;
  pageIndex: number; // 0-indexed page in PDF (or 0 for image)
  x: number; // percentage (0 to 100) or canvas unit
  y: number; // percentage (0 to 100) or canvas unit
  width: number; // percentage or canvas unit
  height: number; // percentage or canvas unit
  rotation: number; // degrees (0 to 360)
  opacity: number; // 0 to 1
  aspectRatio: number;
}

export interface ExportOptions {
  format: 'pdf' | 'png' | 'jpeg';
  quality: number; // 0.1 to 1.0 for jpeg
  scale: number; // 1x, 2x, 3x for images
  scope: 'current' | 'all'; // For multi-page PDFs
  fileName?: string;
}
