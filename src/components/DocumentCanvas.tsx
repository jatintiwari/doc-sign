import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Trash2,
  Copy,
  Move,
  Scaling,
} from 'lucide-react';
import { PlacedSignature } from '../types';

interface DocumentCanvasProps {
  documentType: 'image' | 'pdf';
  documentImageSrc: string | null;
  pdfCanvas: HTMLCanvasElement | null;
  numPages: number;
  currentPage: number;
  onPageChange: (newPage: number) => void;
  signatures: PlacedSignature[];
  onSignaturesChange: (newSignatures: PlacedSignature[]) => void;
  processedSignatureUrl: string | null;
  selectedSignatureId: string | null;
  onSelectSignature: (id: string | null) => void;
}

export const DocumentCanvas: React.FC<DocumentCanvasProps> = ({
  documentType,
  documentImageSrc,
  pdfCanvas,
  numPages,
  currentPage,
  onPageChange,
  signatures,
  onSignaturesChange,
  processedSignatureUrl,
  selectedSignatureId,
  onSelectSignature,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const docWrapperRef = useRef<HTMLDivElement>(null);
  const pdfMountRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState<number>(100);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialSigState, setInitialSigState] = useState<PlacedSignature | null>(null);
  const lockAspect = true;

  // Mount PDF canvas if present
  useEffect(() => {
    if (documentType === 'pdf' && pdfCanvas && pdfMountRef.current) {
      pdfMountRef.current.innerHTML = '';
      pdfCanvas.className = 'w-full h-auto block select-none pointer-events-none rounded shadow-md';
      pdfMountRef.current.appendChild(pdfCanvas);
    }
  }, [documentType, pdfCanvas, currentPage]);

  const currentSignatures = signatures.filter((s) => s.pageIndex === currentPage);
  const selectedSig = signatures.find((s) => s.id === selectedSignatureId);
  // Auto fallback to first signature on current page so sizing menu NEVER vanishes!
  const activeSig = selectedSig || (currentSignatures.length > 0 ? currentSignatures[0] : null);

  // Keyboard navigation for precision nudge and scale
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeSig) return;

      const step = e.shiftKey ? 2 : 0.5; // percentage step

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        updateSig(activeSig.id, { x: Math.max(0, activeSig.x - step) });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        updateSig(activeSig.id, { x: Math.min(100 - activeSig.width, activeSig.x + step) });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        updateSig(activeSig.id, { y: Math.max(0, activeSig.y - step) });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        updateSig(activeSig.id, { y: Math.min(100 - activeSig.height, activeSig.y + step) });
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSignature(activeSig.id);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleAdjustSize(activeSig.width + 2);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleAdjustSize(activeSig.width - 2);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSig, signatures]);

  const updateSig = (id: string, updates: Partial<PlacedSignature>) => {
    onSignaturesChange(
      signatures.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const handleAdjustSize = (newWidth: number) => {
    if (!activeSig || !docWrapperRef.current) return;
    const rect = docWrapperRef.current.getBoundingClientRect();
    const docAspect = rect.width / rect.height || 0.75;
    const ar = activeSig.aspectRatio || 2;

    const clampedW = Math.max(5, Math.min(95, newWidth));
    const newHeight = (clampedW / ar) * docAspect;

    updateSig(activeSig.id, {
      width: clampedW,
      height: Math.min(95, Math.max(2, newHeight)),
    });
  };

  const deleteSignature = (id: string) => {
    onSignaturesChange(signatures.filter((s) => s.id !== id));
    if (selectedSignatureId === id) {
      onSelectSignature(null);
    }
  };

  const duplicateSignature = (sig: PlacedSignature) => {
    const newSig: PlacedSignature = {
      ...sig,
      id: 'sig_' + Math.random().toString(36).substr(2, 9),
      x: Math.min(100 - sig.width, sig.x + 3),
      y: Math.min(100 - sig.height, sig.y + 3),
    };
    onSignaturesChange([...signatures, newSig]);
    onSelectSignature(newSig.id);
  };

  // Mouse Interaction: Start Dragging / Resizing / Rotating
  const handleMouseDownOnSig = (e: React.MouseEvent, sig: PlacedSignature) => {
    e.stopPropagation();
    onSelectSignature(sig.id);
    setIsDragging(true);
    setActiveHandle('move');
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialSigState({ ...sig });
  };

  const handleMouseDownOnHandle = (e: React.MouseEvent, handle: string, sig: PlacedSignature) => {
    e.stopPropagation();
    onSelectSignature(sig.id);
    setIsDragging(true);
    setActiveHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialSigState({ ...sig });
  };

  // Global mouse move & up
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !initialSigState || !activeHandle || !docWrapperRef.current) return;

      const rect = docWrapperRef.current.getBoundingClientRect();
      const deltaXPercent = ((e.clientX - dragStart.x) / rect.width) * 100;
      const deltaYPercent = ((e.clientY - dragStart.y) / rect.height) * 100;
      const docAspect = rect.width / rect.height || 0.75;
      const ar = initialSigState.aspectRatio || 2;

      if (activeHandle === 'move') {
        const newX = Math.max(0, Math.min(100 - initialSigState.width, initialSigState.x + deltaXPercent));
        const newY = Math.max(0, Math.min(100 - initialSigState.height, initialSigState.y + deltaYPercent));
        updateSig(initialSigState.id, { x: newX, y: newY });
      } else if (activeHandle === 'rotate') {
        const centerX = rect.left + ((initialSigState.x + initialSigState.width / 2) / 100) * rect.width;
        const centerY = rect.top + ((initialSigState.y + initialSigState.height / 2) / 100) * rect.height;
        const radians = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        let deg = Math.round((radians * 180) / Math.PI + 90);
        if (deg < 0) deg += 360;
        updateSig(initialSigState.id, { rotation: deg });
      } else {
        // Resize handles: se, sw, ne, nw, e, w, n, s
        let newWidth = initialSigState.width;
        let newHeight = initialSigState.height;
        let newX = initialSigState.x;
        let newY = initialSigState.y;

        if (activeHandle === 'se') {
          newWidth = Math.max(4, initialSigState.width + deltaXPercent);
          newHeight = (newWidth / ar) * docAspect;
        } else if (activeHandle === 'sw') {
          const wDiff = -deltaXPercent;
          newWidth = Math.max(4, initialSigState.width + wDiff);
          newHeight = (newWidth / ar) * docAspect;
          newX = initialSigState.x + (initialSigState.width - newWidth);
        } else if (activeHandle === 'ne') {
          newWidth = Math.max(4, initialSigState.width + deltaXPercent);
          newHeight = (newWidth / ar) * docAspect;
          newY = initialSigState.y + (initialSigState.height - newHeight);
        } else if (activeHandle === 'nw') {
          const wDiff = -deltaXPercent;
          newWidth = Math.max(4, initialSigState.width + wDiff);
          newHeight = (newWidth / ar) * docAspect;
          newX = initialSigState.x + (initialSigState.width - newWidth);
          newY = initialSigState.y + (initialSigState.height - newHeight);
        } else if (activeHandle === 'e') {
          newWidth = Math.max(4, initialSigState.width + deltaXPercent);
          newHeight = (newWidth / ar) * docAspect;
        } else if (activeHandle === 'w') {
          const wDiff = -deltaXPercent;
          newWidth = Math.max(4, initialSigState.width + wDiff);
          newHeight = (newWidth / ar) * docAspect;
          newX = initialSigState.x + (initialSigState.width - newWidth);
        }

        // Boundary Clamping
        newX = Math.max(0, Math.min(96, newX));
        newY = Math.max(0, Math.min(96, newY));
        newWidth = Math.max(4, Math.min(100 - newX, newWidth));
        newHeight = Math.max(2, Math.min(100 - newY, newHeight));

        updateSig(initialSigState.id, {
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setActiveHandle(null);
      setInitialSigState(null);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, initialSigState, activeHandle, dragStart]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/60 rounded-2xl border border-slate-800 overflow-hidden relative shadow-2xl">
      {/* Top Canvas Toolbar */}
      <div className="bg-slate-900/95 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between z-20 flex-wrap gap-2.5">
        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
          <button
            onClick={() => setZoom((z) => Math.max(30, z - 15))}
            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-medium text-slate-300 w-12 text-center select-none">
            {zoom}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(250, z + 15))}
            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(100)}
            className="px-2 py-1 text-[11px] font-medium hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-200 transition"
            title="Reset Zoom"
          >
            100%
          </button>
        </div>

        {/* ALWAYS VISIBLE SIZING & STAMP CONTROLS WHENEVER A SIGNATURE IS ON THE PAGE */}
        {activeSig ? (
          <div className="flex items-center gap-2.5 bg-sky-950/50 border border-sky-500/30 px-3 py-1.5 rounded-xl shadow-md">
            {/* Size Title & Adjustment */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-sky-400 flex items-center gap-1">
                <Scaling className="w-3.5 h-3.5" /> Size:
              </span>
              <button
                onClick={() => handleAdjustSize(activeSig.width - 3)}
                className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200"
                title="Decrease Size"
              >
                -
              </button>
              <input
                type="range"
                min="6"
                max="90"
                step="1"
                value={Math.round(activeSig.width)}
                onChange={(e) => handleAdjustSize(Number(e.target.value))}
                className="w-24 h-1.5 bg-slate-800 rounded appearance-none accent-sky-400 cursor-pointer"
                title="Adjust Signature Size"
              />
              <button
                onClick={() => handleAdjustSize(activeSig.width + 3)}
                className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200"
                title="Increase Size"
              >
                +
              </button>
              <span className="font-mono text-xs font-bold text-sky-300 min-w-[34px]">
                {Math.round(activeSig.width)}%
              </span>
            </div>

            <div className="h-4 w-px bg-sky-500/20" />

            {/* Quick Size Presets */}
            <div className="flex items-center gap-1">
              {[
                { label: 'S', val: 16 },
                { label: 'M', val: 28 },
                { label: 'L', val: 44 },
                { label: 'XL', val: 62 },
              ].map((p) => (
                <button
                  key={p.label}
                  onClick={() => handleAdjustSize(p.val)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-bold border transition ${
                    Math.abs(activeSig.width - p.val) < 4
                      ? 'bg-sky-500 text-white border-sky-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                  title={`Set to ${p.val}% width`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-sky-500/20" />

            {/* Duplicate & Delete */}
            <button
              onClick={() => duplicateSignature(activeSig)}
              className="p-1 hover:bg-sky-500/20 rounded text-slate-300 hover:text-sky-300 transition"
              title="Duplicate Stamp"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => deleteSignature(activeSig.id)}
              className="p-1 hover:bg-rose-500/20 rounded text-slate-300 hover:text-rose-400 transition"
              title="Delete Stamp"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-400 italic">No signature on this page</div>
        )}

        {/* PDF Page Navigation */}
        {documentType === 'pdf' && numPages > 1 && (
          <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700/60">
            <button
              disabled={currentPage <= 0}
              onClick={() => onPageChange(currentPage - 1)}
              className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-slate-200">
              Page {currentPage + 1} of {numPages}
            </span>
            <button
              disabled={currentPage >= numPages - 1}
              onClick={() => onPageChange(currentPage + 1)}
              className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Viewport */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-6 flex items-center justify-center relative bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px]"
      >
        <div
          ref={docWrapperRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
          className="relative select-none shadow-2xl rounded-lg bg-white border border-slate-700/40"
        >
          {/* BASE DOCUMENT LAYER */}
          {documentType === 'image' && documentImageSrc && (
            <img
              src={documentImageSrc}
              alt="Base Document"
              className="max-w-[850px] w-full h-auto block select-none pointer-events-none rounded"
            />
          )}

          {documentType === 'pdf' && (
            <div ref={pdfMountRef} className="max-w-[850px] w-full" />
          )}

          {/* SIGNATURES OVERLAY LAYER */}
          {currentSignatures.map((sig) => {
            const isSelected = activeSig ? sig.id === activeSig.id : false;
            return (
              <div
                key={sig.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectSignature(sig.id);
                }}
                onMouseDown={(e) => handleMouseDownOnSig(e, sig)}
                style={{
                  position: 'absolute',
                  left: `${sig.x}%`,
                  top: `${sig.y}%`,
                  width: `${sig.width}%`,
                  height: `${sig.height}%`,
                  transform: `rotate(${sig.rotation}deg)`,
                  transformOrigin: 'center center',
                  opacity: sig.opacity ?? 1,
                  cursor: isDragging && activeHandle === 'move' ? 'grabbing' : 'grab',
                }}
                className={`group select-none ${
                  isSelected
                    ? 'ring-2 ring-sky-500 ring-offset-2 ring-offset-transparent'
                    : 'hover:ring-1 hover:ring-sky-400/70'
                }`}
              >
                {/* Signature Graphic */}
                {processedSignatureUrl && (
                  <img
                    src={processedSignatureUrl}
                    alt="Signature Stamp"
                    className="w-full h-full object-contain pointer-events-none filter drop-shadow-sm select-none"
                    draggable={false}
                  />
                )}

                {/* Handles & Controls (when selected/active) */}
                {isSelected && (
                  <>
                    {/* Top Rotation Handle */}
                    <div
                      onMouseDown={(e) => handleMouseDownOnHandle(e, 'rotate', sig)}
                      className="absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center cursor-grab active:cursor-grabbing shadow-md border-2 border-white hover:scale-110 transition-transform z-30"
                      title="Drag to Rotate Stamp"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </div>
                    {/* Connecting line to rotation handle */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-sky-500 pointer-events-none" />

                    {/* Corner Resize Handles with generous hit areas */}
                    {/* NW Handle */}
                    <div
                      onMouseDown={(e) => handleMouseDownOnHandle(e, 'nw', sig)}
                      className="absolute -top-3 -left-3 w-6 h-6 flex items-center justify-center cursor-nwse-resize group/h z-30"
                      title="Resize Stamp"
                    >
                      <div className="w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-full group-hover/h:scale-125 transition-transform shadow" />
                    </div>

                    {/* NE Handle */}
                    <div
                      onMouseDown={(e) => handleMouseDownOnHandle(e, 'ne', sig)}
                      className="absolute -top-3 -right-3 w-6 h-6 flex items-center justify-center cursor-nesw-resize group/h z-30"
                      title="Resize Stamp"
                    >
                      <div className="w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-full group-hover/h:scale-125 transition-transform shadow" />
                    </div>

                    {/* SW Handle */}
                    <div
                      onMouseDown={(e) => handleMouseDownOnHandle(e, 'sw', sig)}
                      className="absolute -bottom-3 -left-3 w-6 h-6 flex items-center justify-center cursor-nesw-resize group/h z-30"
                      title="Resize Stamp"
                    >
                      <div className="w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-full group-hover/h:scale-125 transition-transform shadow" />
                    </div>

                    {/* SE Handle */}
                    <div
                      onMouseDown={(e) => handleMouseDownOnHandle(e, 'se', sig)}
                      className="absolute -bottom-3 -right-3 w-6 h-6 flex items-center justify-center cursor-nwse-resize group/h z-30"
                      title="Resize Stamp"
                    >
                      <div className="w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-full group-hover/h:scale-125 transition-transform shadow" />
                    </div>

                    {/* Edge Midpoint Resize Handles */}
                    {/* E Handle */}
                    <div
                      onMouseDown={(e) => handleMouseDownOnHandle(e, 'e', sig)}
                      className="absolute top-1/2 -right-2.5 -translate-y-1/2 w-5 h-5 flex items-center justify-center cursor-ew-resize group/h z-30"
                      title="Resize Width"
                    >
                      <div className="w-2.5 h-4 bg-sky-500 rounded-full border border-white group-hover/h:scale-110 shadow" />
                    </div>

                    {/* W Handle */}
                    <div
                      onMouseDown={(e) => handleMouseDownOnHandle(e, 'w', sig)}
                      className="absolute top-1/2 -left-2.5 -translate-y-1/2 w-5 h-5 flex items-center justify-center cursor-ew-resize group/h z-30"
                      title="Resize Width"
                    >
                      <div className="w-2.5 h-4 bg-sky-500 rounded-full border border-white group-hover/h:scale-110 shadow" />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="bg-slate-900/90 border-t border-slate-800/80 px-4 py-2 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-3">
          <span>
            {currentSignatures.length} Stamp{currentSignatures.length === 1 ? '' : 's'} on this page
          </span>
          <span className="text-slate-600">•</span>
          <span>Tip: Drag corners to resize • Use +/- keys or toolbar slider for quick sizing</span>
        </div>
        <div className="font-mono text-slate-500">100% Client-Side Privacy</div>
      </div>
    </div>
  );
};
