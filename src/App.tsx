import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { DocumentUploader } from './components/DocumentUploader';
import { SignatureControls } from './components/SignatureControls';
import { AnnotationInspector } from './components/AnnotationInspector';
import { DocumentCanvas } from './components/DocumentCanvas';
import { DrawSignatureModal } from './components/DrawSignatureModal';
import { ExportModal } from './components/ExportModal';
import {
  DocumentState,
  SignatureProcessingSettings,
  DocumentAnnotation,
  ExportOptions,
} from './types';
import {
  processSignatureImage,
  ProcessedSignatureResult,
} from './utils/backgroundRemoval';
import {
  loadPdfDocument,
  renderPdfPage,
  signPdfDocument,
} from './utils/pdfHandler';
import {
  createCompositeCanvas,
  exportImageAsPdf,
  downloadBlob,
  loadImage,
} from './utils/imageExport';
import {
  generateSampleDocumentDataUrl,
  generateSampleSignatureDataUrl,
} from './utils/sampleData';
import * as pdfjsLib from 'pdfjs-dist';

export const App: React.FC = () => {
  // 1. Base Document State
  const [docState, setDocState] = useState<DocumentState | null>(null);
  const [pdfDocProxy, setPdfDocProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pdfRenderedCanvas, setPdfRenderedCanvas] = useState<HTMLCanvasElement | null>(null);

  // 2. Raw & Processed Signature State
  const [rawSignatureUrl, setRawSignatureUrl] = useState<string | null>(null);
  const [signatureName, setSignatureName] = useState<string>('');
  const [processedSignature, setProcessedSignature] = useState<ProcessedSignatureResult | null>(null);
  const [isProcessingSig, setIsProcessingSig] = useState<boolean>(false);

  // 3. Signature Removal Tuning Settings
  const [sigSettings, setSigSettings] = useState<SignatureProcessingSettings>({
    threshold: 215,
    smoothness: 10,
    contrast: 1.3,
    inkColor: 'original',
    preserveColor: true,
    invert: false,
    autoCrop: true,
  });

  // 4. Interactive Annotations Collection (Signatures, Text, Boxes, Arrows)
  const [annotations, setAnnotations] = useState<DocumentAnnotation[]>([]);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);

  // 5. Modals State
  const [isDrawModalOpen, setIsDrawModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  const sigFileInputRef = useRef<HTMLInputElement>(null);

  // Re-process signature whenever raw image or settings change
  useEffect(() => {
    if (!rawSignatureUrl) return;

    let isMounted = true;
    setIsProcessingSig(true);

    const timer = setTimeout(async () => {
      try {
        const result = await processSignatureImage(rawSignatureUrl, sigSettings);
        if (isMounted) {
          setProcessedSignature(result);
        }
      } catch (err) {
        console.error('Failed to process signature:', err);
      } finally {
        if (isMounted) setIsProcessingSig(false);
      }
    }, 80);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [rawSignatureUrl, sigSettings]);

  // Handle Document Selection (PDF or Image)
  const handleDocumentFile = async (file: File) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Data = new Uint8Array(arrayBuffer);
      try {
        const pdf = await loadPdfDocument(uint8Data.slice());
        setPdfDocProxy(pdf);
        const rendered = await renderPdfPage(pdf, 1, 2.0);
        setPdfRenderedCanvas(rendered.canvas);

        setDocState({
          file,
          name: file.name,
          type: 'pdf',
          url: URL.createObjectURL(file),
          pdfData: uint8Data,
          numPages: pdf.numPages,
          currentPage: 0,
          originalWidth: rendered.width,
          originalHeight: rendered.height,
        });
      } catch (err) {
        alert('Could not parse PDF: ' + (err as Error).message);
      }
    } else {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.src = url;
      img.onload = () => {
        setDocState({
          file,
          name: file.name,
          type: 'image',
          url,
          numPages: 1,
          currentPage: 0,
          originalWidth: img.naturalWidth,
          originalHeight: img.naturalHeight,
        });
      };
    }
  };

  // Re-render PDF page when page changes
  const handlePdfPageChange = async (newPage: number) => {
    if (!docState || !pdfDocProxy || newPage < 0 || newPage >= docState.numPages) return;
    try {
      const rendered = await renderPdfPage(pdfDocProxy, newPage + 1, 2.0);
      setPdfRenderedCanvas(rendered.canvas);
      setDocState((prev) => (prev ? { ...prev, currentPage: newPage } : null));
    } catch (err) {
      console.error('Failed to render PDF page:', err);
    }
  };

  // Handle Signature Image Selection
  const handleSignatureFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setRawSignatureUrl(url);
    setSignatureName(file.name);
  };

  // Handle Drawn Signature from Modal
  const handleSaveDrawnSignature = (dataUrl: string) => {
    setRawSignatureUrl(dataUrl);
    setSignatureName('Drawn Signature');
    setSigSettings((s) => ({ ...s, threshold: 240, preserveColor: false, inkColor: '#084298' }));
  };

  // Add initial signature stamp once document and signature are loaded
  useEffect(() => {
    if (docState && processedSignature && annotations.filter(a => a.type === 'signature').length === 0) {
      addNewSignatureStamp();
    }
  }, [docState?.name, processedSignature?.dataUrl]);

  const addNewSignatureStamp = () => {
    if (!docState) return;

    const docAspect = docState.originalWidth / docState.originalHeight;
    const sigAspect = processedSignature?.aspectRatio || 2.5;

    const sigWidthPercent = 28;
    const sigHeightPercent = (sigWidthPercent / sigAspect) * docAspect;

    const newAnn: DocumentAnnotation = {
      id: 'sig_' + Math.random().toString(36).substr(2, 9),
      type: 'signature',
      pageIndex: docState.currentPage,
      x: 55,
      y: 75,
      width: sigWidthPercent,
      height: Math.min(30, sigHeightPercent),
      rotation: 0,
      opacity: 1,
      aspectRatio: sigAspect,
    };

    setAnnotations((prev) => [...prev, newAnn]);
    setSelectedAnnotationId(newAnn.id);
  };

  // Add other annotations (Text, Date, Box, Arrow)
  const handleAddAnnotation = (type: 'signature' | 'text' | 'box' | 'arrow' | 'date') => {
    if (!docState) return;

    if (type === 'signature') {
      addNewSignatureStamp();
      return;
    }

    const id = 'ann_' + Math.random().toString(36).substr(2, 9);
    let newAnn: DocumentAnnotation;

    if (type === 'text') {
      newAnn = {
        id,
        type: 'text',
        pageIndex: docState.currentPage,
        x: 35,
        y: 40,
        width: 32,
        height: 7,
        rotation: 0,
        opacity: 1,
        text: 'Click or double-click to type text...',
        fontSize: 16,
        fontColor: '#111827',
        fontFamily: 'sans',
        isBold: false,
        isItalic: false,
        backgroundColor: 'transparent',
      };
    } else if (type === 'date') {
      const today = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      newAnn = {
        id,
        type: 'text',
        pageIndex: docState.currentPage,
        x: 35,
        y: 45,
        width: 24,
        height: 6,
        rotation: 0,
        opacity: 1,
        text: `Date: ${today}`,
        fontSize: 15,
        fontColor: '#084298',
        fontFamily: 'sans',
        isBold: true,
        isItalic: false,
        backgroundColor: 'rgba(239, 246, 255, 0.8)',
      };
    } else if (type === 'box') {
      newAnn = {
        id,
        type: 'box',
        pageIndex: docState.currentPage,
        x: 30,
        y: 35,
        width: 35,
        height: 18,
        rotation: 0,
        opacity: 1,
        strokeColor: '#ef4444',
        strokeWidth: 3,
        fillColor: 'transparent',
        isDashed: false,
      };
    } else {
      // arrow
      newAnn = {
        id,
        type: 'arrow',
        pageIndex: docState.currentPage,
        x: 35,
        y: 50,
        width: 25,
        height: 5,
        rotation: 0,
        opacity: 1,
        arrowColor: '#ef4444',
        arrowThickness: 4,
      };
    }

    setAnnotations((prev) => [...prev, newAnn]);
    setSelectedAnnotationId(newAnn.id);
  };

  // Load Demo Sample
  const handleLoadDemoSample = async () => {
    const sampleDocUrl = generateSampleDocumentDataUrl();
    const sampleSigUrl = generateSampleSignatureDataUrl();

    const img = new Image();
    img.src = sampleDocUrl;
    img.onload = () => {
      setDocState({
        file: null,
        name: 'Demo-NDA-Agreement.png',
        type: 'image',
        url: sampleDocUrl,
        numPages: 1,
        currentPage: 0,
        originalWidth: 1200,
        originalHeight: 1600,
      });
    };

    setRawSignatureUrl(sampleSigUrl);
    setSignatureName('Sample-Paper-Signature.png');
    setSigSettings({
      threshold: 220,
      smoothness: 12,
      contrast: 1.4,
      inkColor: 'original',
      preserveColor: true,
      invert: false,
      autoCrop: true,
    });
    setAnnotations([]);
  };

  // Reset Everything
  const handleReset = () => {
    setDocState(null);
    setPdfDocProxy(null);
    setPdfRenderedCanvas(null);
    setRawSignatureUrl(null);
    setProcessedSignature(null);
    setAnnotations([]);
    setSelectedAnnotationId(null);
  };

  // Export Pipeline
  const handleExportDocument = async (options: ExportOptions) => {
    if (!docState) return;

    const exportFileName = `${options.fileName || 'signed-document'}.${options.format}`;

    // A) If document is PDF and user wants PDF output: Lossless vector stamping via pdf-lib
    if (docState.type === 'pdf' && options.format === 'pdf') {
      let pdfBytesToSign: Uint8Array;
      if (docState.file) {
        const freshBuffer = await docState.file.arrayBuffer();
        pdfBytesToSign = new Uint8Array(freshBuffer);
      } else if (docState.pdfData) {
        pdfBytesToSign = docState.pdfData instanceof Uint8Array
          ? docState.pdfData.slice()
          : new Uint8Array(docState.pdfData.slice(0));
      } else {
        throw new Error('PDF document bytes are not available');
      }

      const signedPdfBytes = await signPdfDocument(
        pdfBytesToSign,
        annotations,
        processedSignature?.dataUrl
      );
      const blob = new Blob([signedPdfBytes], { type: 'application/pdf' });
      downloadBlob(blob, exportFileName);
      return;
    }

    // B) Image or PDF page exported as Composite Canvas (Image or PDF)
    let sigImg: HTMLImageElement | null = null;
    if (processedSignature?.dataUrl) {
      sigImg = await loadImage(processedSignature.dataUrl);
    }

    let baseElement: HTMLCanvasElement | HTMLImageElement;
    if (docState.type === 'pdf') {
      if (!pdfDocProxy) throw new Error('PDF document proxy unavailable');
      const highRes = await renderPdfPage(pdfDocProxy, docState.currentPage + 1, 2.5 * options.scale);
      baseElement = highRes.canvas;
    } else {
      baseElement = await loadImage(docState.url);
    }

    const compositeCanvas = await createCompositeCanvas(
      baseElement,
      annotations,
      sigImg,
      docState.currentPage,
      docState.type === 'image' ? options.scale : 1
    );

    if (options.format === 'pdf') {
      const pdfBytes = await exportImageAsPdf(compositeCanvas);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      downloadBlob(blob, exportFileName);
    } else if (options.format === 'png') {
      compositeCanvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, exportFileName);
      }, 'image/png');
    } else if (options.format === 'jpeg') {
      compositeCanvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, exportFileName);
      }, 'image/jpeg', options.quality || 0.92);
    }
  };

  const selectedAnnotation = annotations.find((s) => s.id === selectedAnnotationId) ||
    annotations.find((s) => s.pageIndex === (docState?.currentPage ?? 0)) ||
    annotations[0] ||
    null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Hidden file input for quick signature swap */}
      <input
        ref={sigFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/jpg"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleSignatureFile(e.target.files[0]);
          }
        }}
      />

      {/* Header */}
      <Header
        hasDocument={!!docState}
        hasSignature={!!processedSignature || annotations.length > 0}
        onReset={handleReset}
        onOpenExport={() => setIsExportModalOpen(true)}
        onLoadSample={handleLoadDemoSample}
        documentName={docState?.name}
        isProcessing={isProcessingSig}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden">
        {!docState ? (
          <DocumentUploader
            onDocumentSelected={handleDocumentFile}
            onSignatureSelected={handleSignatureFile}
            onOpenDrawSignature={() => setIsDrawModalOpen(true)}
            onLoadSample={handleLoadDemoSample}
            hasDocument={false}
            hasSignature={!!processedSignature}
            documentName={undefined}
            signatureName={signatureName}
          />
        ) : (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 h-full overflow-hidden">
            {/* Left/Sidebar: Signature Tuning / Annotation Inspector (4 cols) */}
            <div className="lg:col-span-4 xl:col-span-3.5 flex flex-col space-y-4 overflow-y-auto max-h-[calc(100vh-100px)] pr-1">
              {/* Show Annotation Inspector if Text, Box, or Arrow is selected */}
              {selectedAnnotation && selectedAnnotation.type !== 'signature' ? (
                <AnnotationInspector
                  annotation={selectedAnnotation}
                  onUpdateAnnotation={(updates) => {
                    setAnnotations((prev) =>
                      prev.map((s) => (s.id === selectedAnnotation.id ? { ...s, ...updates } : s))
                    );
                  }}
                  onDeleteAnnotation={(id) => {
                    setAnnotations((prev) => prev.filter((s) => s.id !== id));
                    if (selectedAnnotationId === id) setSelectedAnnotationId(null);
                  }}
                  onDuplicateAnnotation={(ann) => {
                    const newAnn = {
                      ...ann,
                      id: 'ann_' + Math.random().toString(36).substr(2, 9),
                      x: Math.min(100 - ann.width, ann.x + 3),
                      y: Math.min(100 - ann.height, ann.y + 3),
                    };
                    setAnnotations((prev) => [...prev, newAnn]);
                    setSelectedAnnotationId(newAnn.id);
                  }}
                  docAspect={docState ? docState.originalWidth / docState.originalHeight : 0.75}
                />
              ) : null}

              {/* Signature Tuning Card */}
              <SignatureControls
                settings={sigSettings}
                onSettingsChange={setSigSettings}
                rawSignatureUrl={rawSignatureUrl}
                processedSignatureUrl={processedSignature?.dataUrl || null}
                isProcessing={isProcessingSig}
                onAddSignatureToDocument={addNewSignatureStamp}
                onOpenDrawSignature={() => setIsDrawModalOpen(true)}
                onTriggerSignatureUpload={() => sigFileInputRef.current?.click()}
                selectedSignature={selectedAnnotation?.type === 'signature' ? selectedAnnotation : null}
                onUpdateSelectedSignature={(updates) => {
                  if (!selectedAnnotation || selectedAnnotation.type !== 'signature') return;
                  setAnnotations((prev) =>
                    prev.map((s) => (s.id === selectedAnnotation.id ? { ...s, ...updates } : s))
                  );
                }}
                docAspect={docState ? docState.originalWidth / docState.originalHeight : 0.75}
              />
            </div>

            {/* Right: Interactive Document Viewer & Placement Canvas (8 cols) */}
            <div className="lg:col-span-8 xl:col-span-8.5 flex flex-col h-[calc(100vh-100px)]">
              <DocumentCanvas
                documentType={docState.type}
                documentImageSrc={docState.type === 'image' ? docState.url : null}
                pdfCanvas={pdfRenderedCanvas}
                numPages={docState.numPages}
                currentPage={docState.currentPage}
                onPageChange={handlePdfPageChange}
                annotations={annotations}
                onAnnotationsChange={setAnnotations}
                processedSignatureUrl={processedSignature?.dataUrl || null}
                selectedAnnotationId={selectedAnnotationId}
                onSelectAnnotation={setSelectedAnnotationId}
                onAddAnnotation={handleAddAnnotation}
              />
            </div>
          </div>
        )}
      </main>

      {/* Draw Signature Modal */}
      <DrawSignatureModal
        isOpen={isDrawModalOpen}
        onClose={() => setIsDrawModalOpen(false)}
        onSaveSignature={handleSaveDrawnSignature}
      />

      {/* Export Signed Document Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        documentType={docState?.type || 'image'}
        numPages={docState?.numPages || 1}
        currentPage={docState?.currentPage || 0}
        onExport={handleExportDocument}
        defaultFileName={docState ? `annotated-${docState.name.replace(/\.[^/.]+$/, '')}` : 'annotated-document'}
      />
    </div>
  );
};

export default App;
