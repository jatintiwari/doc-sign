import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { DocumentUploader } from './components/DocumentUploader';
import { SignatureControls } from './components/SignatureControls';
import { DocumentCanvas } from './components/DocumentCanvas';
import { DrawSignatureModal } from './components/DrawSignatureModal';
import { ExportModal } from './components/ExportModal';
import {
  DocumentState,
  SignatureProcessingSettings,
  PlacedSignature,
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

  // 4. Interactive Placed Signatures Overlay
  const [placedSignatures, setPlacedSignatures] = useState<PlacedSignature[]>([]);
  const [selectedSigId, setSelectedSigId] = useState<string | null>(null);

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
    }, 80); // Debounce tuning changes

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
    // For drawn signatures on white canvas, default settings work great
    setSigSettings((s) => ({ ...s, threshold: 240, preserveColor: false, inkColor: '#084298' }));
  };

  // Add initial signature stamp once both document and processed signature are available
  useEffect(() => {
    if (docState && processedSignature && placedSignatures.length === 0) {
      addNewSignatureStamp();
    }
  }, [docState?.name, processedSignature?.dataUrl]);

  const addNewSignatureStamp = () => {
    if (!processedSignature || !docState) return;

    const docAspect = docState.originalWidth / docState.originalHeight;
    const sigAspect = processedSignature.aspectRatio || 2;

    // Desired signature width relative to document width: ~26%
    const sigWidthPercent = 28;
    const sigHeightPercent = (sigWidthPercent / sigAspect) * docAspect;

    const newSig: PlacedSignature = {
      id: 'sig_' + Math.random().toString(36).substr(2, 9),
      pageIndex: docState.currentPage,
      x: 55, // Place near bottom right by default
      y: 75,
      width: sigWidthPercent,
      height: Math.min(30, sigHeightPercent),
      rotation: 0,
      opacity: 1,
      aspectRatio: sigAspect,
    };

    setPlacedSignatures((prev) => [...prev, newSig]);
    setSelectedSigId(newSig.id);
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
    setPlacedSignatures([]);
  };

  // Reset Everything
  const handleReset = () => {
    setDocState(null);
    setPdfDocProxy(null);
    setPdfRenderedCanvas(null);
    setRawSignatureUrl(null);
    setProcessedSignature(null);
    setPlacedSignatures([]);
    setSelectedSigId(null);
  };

  // Export Pipeline
  const handleExportDocument = async (options: ExportOptions) => {
    if (!docState || !processedSignature) return;

    const exportFileName = `${options.fileName || 'signed-document'}.${options.format}`;

    // Ensure signatures array has items or creates active signature
    const sigsToExport = placedSignatures.length > 0 ? placedSignatures : [{
      id: 'default',
      pageIndex: docState.currentPage,
      x: 55,
      y: 75,
      width: 28,
      height: 12,
      rotation: 0,
      opacity: 1,
      aspectRatio: processedSignature.aspectRatio || 2.5
    }];

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
        sigsToExport,
        processedSignature.dataUrl
      );
      const blob = new Blob([signedPdfBytes], { type: 'application/pdf' });
      downloadBlob(blob, exportFileName);
      return;
    }

    // B) Image or PDF page exported as Composite Canvas (Image or PDF)
    const sigImg = await loadImage(processedSignature.dataUrl);

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
      sigsToExport,
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
        hasSignature={!!processedSignature}
        onReset={handleReset}
        onOpenExport={() => setIsExportModalOpen(true)}
        onLoadSample={handleLoadDemoSample}
        documentName={docState?.name}
        isProcessing={isProcessingSig}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden">
        {!docState || !processedSignature ? (
          <DocumentUploader
            onDocumentSelected={handleDocumentFile}
            onSignatureSelected={handleSignatureFile}
            onOpenDrawSignature={() => setIsDrawModalOpen(true)}
            onLoadSample={handleLoadDemoSample}
            hasDocument={!!docState}
            hasSignature={!!processedSignature}
            documentName={docState?.name}
            signatureName={signatureName}
          />
        ) : (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 h-full overflow-hidden">
            {/* Left/Sidebar: Signature Tuning & Tools (4 columns) */}
            <div className="lg:col-span-4 xl:col-span-3.5 flex flex-col space-y-4 overflow-y-auto max-h-[calc(100vh-100px)] pr-1">
              <SignatureControls
                settings={sigSettings}
                onSettingsChange={setSigSettings}
                rawSignatureUrl={rawSignatureUrl}
                processedSignatureUrl={processedSignature?.dataUrl || null}
                isProcessing={isProcessingSig}
                onAddSignatureToDocument={addNewSignatureStamp}
                onOpenDrawSignature={() => setIsDrawModalOpen(true)}
                onTriggerSignatureUpload={() => sigFileInputRef.current?.click()}
                selectedSignature={
                  placedSignatures.find((s) => s.id === selectedSigId) ||
                  placedSignatures.find((s) => s.pageIndex === (docState?.currentPage ?? 0)) ||
                  placedSignatures[0] ||
                  null
                }
                onUpdateSelectedSignature={(updates) => {
                  const targetId =
                    selectedSigId ||
                    placedSignatures.find((s) => s.pageIndex === (docState?.currentPage ?? 0))?.id ||
                    placedSignatures[0]?.id;
                  if (!targetId) return;
                  setPlacedSignatures((prev) =>
                    prev.map((s) => (s.id === targetId ? { ...s, ...updates } : s))
                  );
                }}
                docAspect={docState ? docState.originalWidth / docState.originalHeight : 0.75}
              />
            </div>

            {/* Right: Interactive Document Viewer & Placement Canvas (8 columns) */}
            <div className="lg:col-span-8 xl:col-span-8.5 flex flex-col h-[calc(100vh-100px)]">
              <DocumentCanvas
                documentType={docState.type}
                documentImageSrc={docState.type === 'image' ? docState.url : null}
                pdfCanvas={pdfRenderedCanvas}
                numPages={docState.numPages}
                currentPage={docState.currentPage}
                onPageChange={handlePdfPageChange}
                signatures={placedSignatures}
                onSignaturesChange={setPlacedSignatures}
                processedSignatureUrl={processedSignature.dataUrl}
                selectedSignatureId={selectedSigId}
                onSelectSignature={setSelectedSigId}
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
        defaultFileName={docState ? `signed-${docState.name.replace(/\.[^/.]+$/, '')}` : 'signed-document'}
      />
    </div>
  );
};

export default App;
