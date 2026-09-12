import React from 'react';
import { FileSignature, Download, RefreshCw, Sparkles, FileText, Upload } from 'lucide-react';

interface HeaderProps {
  hasDocument: boolean;
  hasSignature: boolean;
  onReset: () => void;
  onOpenExport: () => void;
  onLoadSample: () => void;
  documentName?: string;
  isProcessing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  hasDocument,
  hasSignature,
  onReset,
  onOpenExport,
  onLoadSample,
  documentName,
  isProcessing
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3.5 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20">
          <FileSignature className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              DocuSign Studio
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                AI Transparent Stamp
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            {documentName ? (
              <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                {documentName}
              </span>
            ) : (
              'Overlay transparent signatures onto Images & PDFs seamlessly'
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {!hasDocument && (
          <button
            onClick={onLoadSample}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Try Demo Sample
          </button>
        )}

        {(hasDocument || hasSignature) && (
          <button
            onClick={onReset}
            title="Clear all documents & signatures"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>
        )}

        <button
          onClick={onOpenExport}
          disabled={!hasDocument || !hasSignature || isProcessing}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition shadow-md ${
            hasDocument && hasSignature && !isProcessing
              ? 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-sky-500/25 active:scale-95'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
          }`}
        >
          <Download className="w-4 h-4" />
          Export Document
        </button>
      </div>
    </header>
  );
};
