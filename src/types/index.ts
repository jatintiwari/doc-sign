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

export type AnnotationType = 'signature' | 'text' | 'box' | 'arrow';

export interface DocumentAnnotation {
  id: string;
  type: AnnotationType;
  pageIndex: number; // 0-indexed page
  x: number; // percentage (0 to 100)
  y: number; // percentage (0 to 100)
  width: number; // percentage (0 to 100)
  height: number; // percentage (0 to 100)
  rotation: number; // degrees (0 to 360)
  opacity: number; // 0 to 1 (overall element opacity)
  aspectRatio?: number;

  // Signature properties
  signatureDataUrl?: string;

  // Text properties
  text?: string;
  fontSize?: number; // pt size (e.g. 14, 18, 24, 32)
  fontColor?: string; // hex color
  fontFamily?: 'sans' | 'serif' | 'mono';
  isBold?: boolean;
  isItalic?: boolean;
  backgroundColor?: string; // transparent or hex
  backgroundOpacity?: number; // 0 to 1

  // Box / Rectangle / Redaction properties
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number; // in px
  fillOpacity?: number; // 0 to 1 (1.0 = solid opaque redaction, 0.3 = highlighter)
  isDashed?: boolean;

  // Arrow properties
  arrowColor?: string;
  arrowThickness?: number;
  arrowDirection?: 'right' | 'left' | 'up' | 'down';
}

// Type alias for backwards compatibility
export type PlacedSignature = DocumentAnnotation;

export interface ExportOptions {
  format: 'pdf' | 'png' | 'jpeg';
  quality: number; // 0.1 to 1.0 for jpeg
  scale: number; // 1x, 2x, 3x for images
  scope: 'current' | 'all'; // For multi-page PDFs
  fileName?: string;
}
