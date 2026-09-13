import React, { useRef, useState } from 'react';
import { Upload, FileText, Image as ImageIcon, Sparkles, PenTool, CheckCircle2 } from 'lucide-react';

interface DocumentUploaderProps {
  onDocumentSelected: (file: File) => void;
  onSignatureSelected: (file: File) => void;
  onOpenDrawSignature: () => void;
  onLoadSample: () => void;
  hasDocument: boolean;
  hasSignature: boolean;
  documentName?: string;
  signatureName?: string;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  onDocumentSelected,
  onSignatureSelected,
  onOpenDrawSignature,
  onLoadSample,
  hasDocument,
  hasSignature,
  documentName,
  signatureName
}) => {
  const docInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);
  const [isDocDragging, setIsDocDragging] = useState(false);
  const [isSigDragging, setIsSigDragging] = useState(false);

  const handleDocDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDocDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onDocumentSelected(e.dataTransfer.files[0]);
    }
  };

  const handleSigDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsSigDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onSignatureSelected(e.dataTransfer.files[0]);
    }
  };

  const handleDocPaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files[0]) {
      e.preventDefault();
      onDocumentSelected(e.clipboardData.files[0]);
    }
  };

  const handleSigPaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files[0]) {
      e.preventDefault();
      onSignatureSelected(e.clipboardData.files[0]);
    }
  };

  const handlePasteFromClipboard = async (target: 'doc' | 'sig') => {
    try {
      if (!navigator.clipboard?.read) {
        alert('Direct clipboard button is not supported in this browser. Please press Cmd+V / Ctrl+V instead.');
        return;
      }
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], `clipboard-${Date.now()}.${imageType.split('/')[1] || 'png'}`, {
            type: imageType,
          });
          if (target === 'doc') {
            onDocumentSelected(file);
          } else {
            onSignatureSelected(file);
          }
          return;
        }
      }
      alert('No image found in your clipboard. Copy an image first, then try again.');
    } catch (err) {
      console.warn('Clipboard read failed:', err);
      alert('Please press Cmd+V (Mac) or Ctrl+V (Windows) to paste image from clipboard.');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" /> Instant AI Background Eraser & Placement
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
          Sign Any Document with Total Precision
        </h2>
        <p className="mt-2 text-sm text-slate-400 max-w-xl mx-auto">
          Upload or paste your document (PDF or Image) and signature photo. Our engine automatically removes the paper background so your signature blends cleanly.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80 text-[11px] text-slate-300">
          <span className="font-mono bg-slate-700 text-sky-300 px-1.5 py-0.5 rounded font-bold">Cmd+V</span> / <span className="font-mono bg-slate-700 text-sky-300 px-1.5 py-0.5 rounded font-bold">Ctrl+V</span> Supported — Paste images directly from clipboard!
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* INPUT 1: BASE DOCUMENT */}
        <div
          tabIndex={0}
          onPaste={handleDocPaste}
          onDragOver={(e) => { e.preventDefault(); setIsDocDragging(true); }}
          onDragLeave={() => setIsDocDragging(false)}
          onDrop={handleDocDrop}
          onClick={() => docInputRef.current?.click()}
          className={`relative group cursor-pointer rounded-2xl border-2 border-dashed p-7 flex flex-col items-center justify-center text-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50 ${
            hasDocument
              ? 'border-emerald-500/50 bg-emerald-950/10 hover:border-emerald-400'
              : isDocDragging
              ? 'border-sky-400 bg-sky-950/30 scale-[1.01]'
              : 'border-slate-700 hover:border-sky-500/60 bg-slate-800/50 hover:bg-slate-800/80'
          }`}
        >
          <input
            ref={docInputRef}
            type="file"
            accept=".pdf,image/png,image/jpeg,image/webp,image/jpg"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                onDocumentSelected(e.target.files[0]);
              }
            }}
          />

          <div className={`p-4 rounded-2xl mb-4 transition-transform group-hover:scale-110 ${
            hasDocument ? 'bg-emerald-500/10 text-emerald-400' : 'bg-sky-500/10 text-sky-400'
          }`}>
            {hasDocument ? (
              <CheckCircle2 className="w-8 h-8" />
            ) : (
              <FileText className="w-8 h-8" />
            )}
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400 block">
              Step 1
            </span>
            <h3 className="text-base font-semibold text-white">
              {hasDocument ? 'Document Loaded' : 'Upload or Paste Document'}
            </h3>
            <p className="text-xs text-slate-400 max-w-xs">
              {hasDocument
                ? documentName
                : 'Drag & drop, browse files, or press Ctrl+V / Cmd+V to paste'}
            </p>
          </div>

          <div className="mt-5 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => docInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 group-hover:border-slate-600 transition flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              {hasDocument ? 'Replace Document' : 'Browse Files'}
            </button>
            <button
              onClick={() => handlePasteFromClipboard('doc')}
              className="px-2.5 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-xs font-semibold text-sky-300 border border-sky-500/30 transition"
              title="Paste from clipboard"
            >
              Paste
            </button>
          </div>
        </div>

        {/* INPUT 2: SIGNATURE */}
        <div
          tabIndex={0}
          onPaste={handleSigPaste}
          onDragOver={(e) => { e.preventDefault(); setIsSigDragging(true); }}
          onDragLeave={() => setIsSigDragging(false)}
          onDrop={handleSigDrop}
          className={`relative group rounded-2xl border-2 border-dashed p-7 flex flex-col items-center justify-center text-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
            hasSignature
              ? 'border-emerald-500/50 bg-emerald-950/10'
              : isSigDragging
              ? 'border-indigo-400 bg-indigo-950/30 scale-[1.01]'
              : 'border-slate-700 hover:border-indigo-500/60 bg-slate-800/50 hover:bg-slate-800/80'
          }`}
        >
          <input
            ref={sigInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/jpg"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                onSignatureSelected(e.target.files[0]);
              }
            }}
          />

          <div className={`p-4 rounded-2xl mb-4 transition-transform group-hover:scale-110 ${
            hasSignature ? 'bg-emerald-500/10 text-emerald-400' : 'bg-indigo-500/10 text-indigo-400'
          }`}>
            {hasSignature ? (
              <CheckCircle2 className="w-8 h-8" />
            ) : (
              <ImageIcon className="w-8 h-8" />
            )}
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block">
              Step 2
            </span>
            <h3 className="text-base font-semibold text-white">
              {hasSignature ? 'Signature Ready' : 'Upload or Paste Signature'}
            </h3>
            <p className="text-xs text-slate-400 max-w-xs">
              {hasSignature
                ? signatureName || 'Background auto-removed'
                : 'Upload photo, draw on pad, or press Ctrl+V / Cmd+V'}
            </p>
          </div>

          <div className="mt-5 flex items-center gap-2">
            <button
              onClick={() => sigInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 hover:border-slate-600 transition flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-400" />
              {hasSignature ? 'Change Photo' : 'Upload'}
            </button>
            <button
              onClick={() => handlePasteFromClipboard('sig')}
              className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-xs font-semibold text-indigo-300 border border-indigo-500/30 transition"
              title="Paste signature from clipboard"
            >
              Paste
            </button>
            <button
              onClick={onOpenDrawSignature}
              className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-xs font-semibold text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/50 transition flex items-center gap-1"
            >
              <PenTool className="w-3.5 h-3.5" />
              Draw Pad
            </button>
          </div>
        </div>
      </div>

      {/* SAMPLE TEMPLATE BANNER */}
      <div className="mt-8 p-4 rounded-2xl bg-gradient-to-r from-slate-800/70 to-slate-800/40 border border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-left">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Want to see it in action instantly?
            </h4>
            <p className="text-xs text-slate-400">
              Load our sample NDA agreement and paper signature with automatic background subtraction.
            </p>
          </div>
        </div>

        <button
          onClick={onLoadSample}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition active:scale-95 shrink-0"
        >
          Load Demo Sample
        </button>
      </div>
    </div>
  );
};
