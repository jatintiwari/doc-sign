import React, { useState } from 'react';
import { X, Download, FileText, Image as ImageIcon, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { ExportOptions } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: 'image' | 'pdf';
  numPages: number;
  currentPage: number;
  onExport: (options: ExportOptions) => Promise<void>;
  defaultFileName: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  documentType,
  numPages,
  currentPage,
  onExport,
  defaultFileName,
}) => {
  const [format, setFormat] = useState<'pdf' | 'png' | 'jpeg'>('pdf');
  const [scale, setScale] = useState<number>(2);
  const [scope, setScope] = useState<'current' | 'all'>('all');
  const [quality, setQuality] = useState<number>(0.92);
  const [fileName, setFileName] = useState<string>(defaultFileName || 'signed-document');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await onExport({
        format,
        scale,
        scope,
        quality,
        fileName: fileName.trim() || 'signed-document',
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
      alert('Export failed: ' + (err as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-sky-400" />
            <h3 className="text-lg font-bold text-white">Export Signed Document</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Choose Output Format
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={() => setFormat('pdf')}
              className={`p-3 rounded-2xl border text-left transition-all ${
                format === 'pdf'
                  ? 'border-sky-500 bg-sky-500/10 text-white shadow-sm'
                  : 'border-slate-800 bg-slate-800/60 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <FileText className={`w-5 h-5 mb-1.5 ${format === 'pdf' ? 'text-sky-400' : 'text-slate-400'}`} />
              <div className="font-bold text-xs">PDF Document</div>
              <div className="text-[10px] text-slate-400">Vector / Print ready</div>
            </button>

            <button
              onClick={() => setFormat('png')}
              className={`p-3 rounded-2xl border text-left transition-all ${
                format === 'png'
                  ? 'border-sky-500 bg-sky-500/10 text-white shadow-sm'
                  : 'border-slate-800 bg-slate-800/60 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <ImageIcon className={`w-5 h-5 mb-1.5 ${format === 'png' ? 'text-sky-400' : 'text-slate-400'}`} />
              <div className="font-bold text-xs">PNG Image</div>
              <div className="text-[10px] text-slate-400">Lossless graphic</div>
            </button>

            <button
              onClick={() => setFormat('jpeg')}
              className={`p-3 rounded-2xl border text-left transition-all ${
                format === 'jpeg'
                  ? 'border-sky-500 bg-sky-500/10 text-white shadow-sm'
                  : 'border-slate-800 bg-slate-800/60 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <ImageIcon className={`w-5 h-5 mb-1.5 ${format === 'jpeg' ? 'text-sky-400' : 'text-slate-400'}`} />
              <div className="font-bold text-xs">JPEG Image</div>
              <div className="text-[10px] text-slate-400">Compact file size</div>
            </button>
          </div>
        </div>

        {/* Multi-page scope (if PDF with >1 page) */}
        {documentType === 'pdf' && numPages > 1 && format === 'pdf' && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Page Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setScope('all')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition ${
                  scope === 'all'
                    ? 'border-sky-500 bg-sky-500/15 text-white'
                    : 'border-slate-800 bg-slate-800/50 text-slate-400'
                }`}
              >
                All Pages ({numPages} pages)
              </button>
              <button
                onClick={() => setScope('current')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition ${
                  scope === 'current'
                    ? 'border-sky-500 bg-sky-500/15 text-white'
                    : 'border-slate-800 bg-slate-800/50 text-slate-400'
                }`}
              >
                Current Page Only (Page {currentPage + 1})
              </button>
            </div>
          </div>
        )}

        {/* Resolution Scale (for Image outputs) */}
        {format !== 'pdf' && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Resolution Multiplier</span>
              <span className="font-mono text-sky-400">{scale}x ({scale === 1 ? 'Standard' : scale === 2 ? 'High-Res' : 'Ultra 300 DPI'})</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((s) => (
                <button
                  key={s}
                  onClick={() => setScale(s)}
                  className={`py-1.5 rounded-xl border text-xs font-medium transition ${
                    scale === s
                      ? 'border-sky-500 bg-sky-500/15 text-white'
                      : 'border-slate-800 bg-slate-800/50 text-slate-400'
                  }`}
                >
                  {s}x Scale
                </button>
              ))}
            </div>
          </div>
        )}

        {/* File Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 block">
            Output Filename
          </label>
          <div className="flex items-center rounded-xl bg-slate-800 border border-slate-700 px-3 py-2">
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="signed-document"
              className="bg-transparent text-sm text-white w-full focus:outline-none"
            />
            <span className="text-xs font-mono text-slate-400">.{format}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-sky-500/25 transition flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Generating File...
              </>
            ) : isSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Downloaded!
              </>
            ) : (
              <>
                <Download className="w-4 h-4" /> Download Signed File
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
