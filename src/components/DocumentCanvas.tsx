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
  Type,
  Square,
  ArrowRight,
  FileSignature,
  Calendar,
  Plus
} from 'lucide-react';
import { DocumentAnnotation } from '../types';

interface DocumentCanvasProps {
  documentType: 'image' | 'pdf';
  documentImageSrc: string | null;
  pdfCanvas: HTMLCanvasElement | null;
  numPages: number;
  currentPage: number;
  onPageChange: (newPage: number) => void;
  annotations: DocumentAnnotation[];
  onAnnotationsChange: (newAnnotations: DocumentAnnotation[]) => void;
  processedSignatureUrl: string | null;
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string | null) => void;
  onAddAnnotation: (type: 'signature' | 'text' | 'box' | 'arrow' | 'date') => void;
}

export const DocumentCanvas: React.FC<DocumentCanvasProps> = ({
  documentType,
  documentImageSrc,
  pdfCanvas,
  numPages,
  currentPage,
  onPageChange,
  annotations,
  onAnnotationsChange,
  processedSignatureUrl,
  selectedAnnotationId,
  onSelectAnnotation,
  onAddAnnotation,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const docWrapperRef = useRef<HTMLDivElement>(null);
  const pdfMountRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState<number>(100);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialAnnState, setInitialAnnState] = useState<DocumentAnnotation | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  // Mount PDF canvas if present
  useEffect(() => {
    if (documentType === 'pdf' && pdfCanvas && pdfMountRef.current) {
      pdfMountRef.current.innerHTML = '';
      pdfCanvas.className = 'w-full h-auto block select-none pointer-events-none rounded shadow-md';
      pdfMountRef.current.appendChild(pdfCanvas);
    }
  }, [documentType, pdfCanvas, currentPage]);

  const currentAnnotations = annotations.filter((s) => (s.pageIndex ?? 0) === currentPage);
  const selectedAnn = annotations.find((s) => s.id === selectedAnnotationId);
  const activeAnn = selectedAnn || (currentAnnotations.length > 0 ? currentAnnotations[0] : null);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't nudge if user is typing in an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (!activeAnn) return;

      const step = e.shiftKey ? 2 : 0.5;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        updateAnn(activeAnn.id, { x: Math.max(0, activeAnn.x - step) });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        updateAnn(activeAnn.id, { x: Math.min(100 - activeAnn.width, activeAnn.x + step) });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        updateAnn(activeAnn.id, { y: Math.max(0, activeAnn.y - step) });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        updateAnn(activeAnn.id, { y: Math.min(100 - activeAnn.height, activeAnn.y + step) });
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteAnnotation(activeAnn.id);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleAdjustSize(activeAnn.width + 2);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleAdjustSize(activeAnn.width - 2);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeAnn, annotations]);

  const updateAnn = (id: string, updates: Partial<DocumentAnnotation>) => {
    onAnnotationsChange(
      annotations.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const handleAdjustSize = (newWidth: number) => {
    if (!activeAnn || !docWrapperRef.current) return;
    const rect = docWrapperRef.current.getBoundingClientRect();
    const docAspect = rect.width / rect.height || 0.75;
    const ar = activeAnn.aspectRatio || (activeAnn.width / (activeAnn.height * docAspect)) || 2;

    const clampedW = Math.max(4, Math.min(95, newWidth));
    const newHeight = (clampedW / ar) * docAspect;

    updateAnn(activeAnn.id, {
      width: clampedW,
      height: Math.min(95, Math.max(2, newHeight)),
    });
  };

  const deleteAnnotation = (id: string) => {
    onAnnotationsChange(annotations.filter((s) => s.id !== id));
    if (selectedAnnotationId === id) {
      onSelectAnnotation(null);
    }
  };

  const duplicateAnnotation = (ann: DocumentAnnotation) => {
    const newAnn: DocumentAnnotation = {
      ...ann,
      id: 'ann_' + Math.random().toString(36).substr(2, 9),
      x: Math.min(100 - ann.width, ann.x + 3),
      y: Math.min(100 - ann.height, ann.y + 3),
    };
    onAnnotationsChange([...annotations, newAnn]);
    onSelectAnnotation(newAnn.id);
  };

  // Mouse Interaction: Start Dragging / Resizing / Rotating
  const handleMouseDownOnAnn = (e: React.MouseEvent, ann: DocumentAnnotation) => {
    e.stopPropagation();
    onSelectAnnotation(ann.id);
    setIsDragging(true);
    setActiveHandle('move');
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialAnnState({ ...ann });
  };

  const handleMouseDownOnHandle = (e: React.MouseEvent, handle: string, ann: DocumentAnnotation) => {
    e.stopPropagation();
    onSelectAnnotation(ann.id);
    setIsDragging(true);
    setActiveHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialAnnState({ ...ann });
  };

  // Global mouse move & up
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !initialAnnState || !activeHandle || !docWrapperRef.current) return;

      const rect = docWrapperRef.current.getBoundingClientRect();
      const deltaXPercent = ((e.clientX - dragStart.x) / rect.width) * 100;
      const deltaYPercent = ((e.clientY - dragStart.y) / rect.height) * 100;
      const docAspect = rect.width / rect.height || 0.75;
      const ar = initialAnnState.aspectRatio || (initialAnnState.width / (initialAnnState.height * docAspect)) || 2;

      if (activeHandle === 'move') {
        const newX = Math.max(0, Math.min(100 - initialAnnState.width, initialAnnState.x + deltaXPercent));
        const newY = Math.max(0, Math.min(100 - initialAnnState.height, initialAnnState.y + deltaYPercent));
        updateAnn(initialAnnState.id, { x: newX, y: newY });
      } else if (activeHandle === 'rotate') {
        const centerX = rect.left + ((initialAnnState.x + initialAnnState.width / 2) / 100) * rect.width;
        const centerY = rect.top + ((initialAnnState.y + initialAnnState.height / 2) / 100) * rect.height;
        const radians = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        let deg = Math.round((radians * 180) / Math.PI + 90);
        if (deg < 0) deg += 360;
        updateAnn(initialAnnState.id, { rotation: deg });
      } else {
        let newWidth = initialAnnState.width;
        let newHeight = initialAnnState.height;
        let newX = initialAnnState.x;
        let newY = initialAnnState.y;

        const isPreserveAspect = initialAnnState.type === 'signature' || initialAnnState.type === 'arrow';

        if (activeHandle === 'se') {
          newWidth = Math.max(4, initialAnnState.width + deltaXPercent);
          if (isPreserveAspect) {
            newHeight = (newWidth / ar) * docAspect;
          } else {
            newHeight = Math.max(2, initialAnnState.height + deltaYPercent);
          }
        } else if (activeHandle === 'sw') {
          const wDiff = -deltaXPercent;
          newWidth = Math.max(4, initialAnnState.width + wDiff);
          if (isPreserveAspect) {
            newHeight = (newWidth / ar) * docAspect;
          } else {
            newHeight = Math.max(2, initialAnnState.height + deltaYPercent);
          }
          newX = initialAnnState.x + (initialAnnState.width - newWidth);
        } else if (activeHandle === 'ne') {
          newWidth = Math.max(4, initialAnnState.width + deltaXPercent);
          if (isPreserveAspect) {
            newHeight = (newWidth / ar) * docAspect;
          } else {
            newHeight = Math.max(2, initialAnnState.height - deltaYPercent);
          }
          newY = initialAnnState.y + (initialAnnState.height - newHeight);
        } else if (activeHandle === 'nw') {
          const wDiff = -deltaXPercent;
          newWidth = Math.max(4, initialAnnState.width + wDiff);
          if (isPreserveAspect) {
            newHeight = (newWidth / ar) * docAspect;
          } else {
            newHeight = Math.max(2, initialAnnState.height - deltaYPercent);
          }
          newX = initialAnnState.x + (initialAnnState.width - newWidth);
          newY = initialAnnState.y + (initialAnnState.height - newHeight);
        } else if (activeHandle === 'e') {
          newWidth = Math.max(4, initialAnnState.width + deltaXPercent);
        } else if (activeHandle === 'w') {
          const wDiff = -deltaXPercent;
          newWidth = Math.max(4, initialAnnState.width + wDiff);
          newX = initialAnnState.x + (initialAnnState.width - newWidth);
        } else if (activeHandle === 's') {
          newHeight = Math.max(2, initialAnnState.height + deltaYPercent);
        } else if (activeHandle === 'n') {
          newHeight = Math.max(2, initialAnnState.height - deltaYPercent);
          newY = initialAnnState.y + (initialAnnState.height - newHeight);
        }

        // Clamping
        newX = Math.max(0, Math.min(96, newX));
        newY = Math.max(0, Math.min(96, newY));
        newWidth = Math.max(3, Math.min(100 - newX, newWidth));
        newHeight = Math.max(2, Math.min(100 - newY, newHeight));

        updateAnn(initialAnnState.id, {
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
      setInitialAnnState(null);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, initialAnnState, activeHandle, dragStart]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/60 rounded-2xl border border-slate-800 overflow-hidden relative shadow-2xl">
      {/* Top Canvas Toolbar with Quick Add & Zoom */}
      <div className="bg-slate-900/95 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between z-20 flex-wrap gap-2.5">
        {/* Quick Tools Add Bar */}
        <div className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-xl border border-slate-700/70">
          <button
            onClick={() => onAddAnnotation('signature')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition shadow-sm"
            title="Add Signature"
          >
            <FileSignature className="w-3.5 h-3.5 text-indigo-400" />
            Signature
          </button>

          <button
            onClick={() => onAddAnnotation('text')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 transition shadow-sm"
            title="Add Text Note"
          >
            <Type className="w-3.5 h-3.5 text-sky-400" />
            Text
          </button>

          <button
            onClick={() => onAddAnnotation('date')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition shadow-sm"
            title="Add Date Stamp"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            Date
          </button>

          <button
            onClick={() => onAddAnnotation('box')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition shadow-sm"
            title="Add Box / Rectangle"
          >
            <Square className="w-3.5 h-3.5 text-amber-400" />
            Box
          </button>

          <button
            onClick={() => onAddAnnotation('arrow')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition shadow-sm"
            title="Add Pointer Arrow"
          >
            <ArrowRight className="w-3.5 h-3.5 text-rose-400" />
            Arrow
          </button>
        </div>

        {/* Selected Element Quick Size & Actions */}
        {activeAnn && (
          <div className="flex items-center gap-2 bg-sky-950/50 border border-sky-500/30 px-3 py-1 rounded-xl shadow-md">
            <span className="text-xs font-bold text-sky-400 flex items-center gap-1 capitalize">
              <Scaling className="w-3.5 h-3.5" /> {activeAnn.type}:
            </span>
            <button
              onClick={() => handleAdjustSize(activeAnn.width - 3)}
              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200"
            >
              -
            </button>
            <span className="font-mono text-xs font-bold text-sky-300 min-w-[30px] text-center">
              {Math.round(activeAnn.width)}%
            </span>
            <button
              onClick={() => handleAdjustSize(activeAnn.width + 3)}
              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200"
            >
              +
            </button>

            <div className="h-4 w-px bg-sky-500/20" />

            <button
              onClick={() => duplicateAnnotation(activeAnn)}
              className="p-1 hover:bg-sky-500/20 rounded text-slate-300 hover:text-sky-300 transition"
              title="Duplicate"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => deleteAnnotation(activeAnn.id)}
              className="p-1 hover:bg-rose-500/20 rounded text-slate-300 hover:text-rose-400 transition"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Zoom & PDF Pagination */}
        <div className="flex items-center gap-2">
          {/* Zoom */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setZoom((z) => Math.max(30, z - 15))}
              className="p-1 hover:bg-slate-700 rounded-lg text-slate-300 transition"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono font-medium text-slate-300 w-10 text-center select-none">
              {zoom}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(250, z + 15))}
              className="p-1 hover:bg-slate-700 rounded-lg text-slate-300 transition"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* PDF Page Navigation */}
          {documentType === 'pdf' && numPages > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-xl border border-slate-700/60">
              <button
                disabled={currentPage <= 0}
                onClick={() => onPageChange(currentPage - 1)}
                className="p-0.5 rounded hover:bg-slate-700 disabled:opacity-30 text-slate-300"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-semibold text-slate-200">
                {currentPage + 1}/{numPages}
              </span>
              <button
                disabled={currentPage >= numPages - 1}
                onClick={() => onPageChange(currentPage + 1)}
                className="p-0.5 rounded hover:bg-slate-700 disabled:opacity-30 text-slate-300"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
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

          {/* ANNOTATIONS OVERLAY LAYER */}
          {currentAnnotations.map((ann) => {
            const isSelected = activeAnn ? ann.id === activeAnn.id : false;
            const type = ann.type || 'signature';

            return (
              <div
                key={ann.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectAnnotation(ann.id);
                }}
                onMouseDown={(e) => handleMouseDownOnAnn(e, ann)}
                onDoubleClick={() => {
                  if (type === 'text') setEditingTextId(ann.id);
                }}
                style={{
                  position: 'absolute',
                  left: `${ann.x}%`,
                  top: `${ann.y}%`,
                  width: `${ann.width}%`,
                  height: `${ann.height}%`,
                  transform: `rotate(${ann.rotation}deg)`,
                  transformOrigin: 'center center',
                  opacity: ann.opacity ?? 1,
                  cursor: isDragging && activeHandle === 'move' ? 'grabbing' : 'grab',
                }}
                className={`group select-none ${
                  isSelected
                    ? 'ring-2 ring-sky-500 ring-offset-2 ring-offset-transparent'
                    : 'hover:ring-1 hover:ring-sky-400/70'
                }`}
              >
                {/* 1. SIGNATURE RENDER */}
                {type === 'signature' && (
                  processedSignatureUrl ? (
                    <img
                      src={processedSignatureUrl}
                      alt="Signature Stamp"
                      className="w-full h-full object-contain pointer-events-none filter drop-shadow-sm select-none"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full border-2 border-dashed border-indigo-400 flex items-center justify-center text-xs font-bold text-indigo-600">
                      Signature
                    </div>
                  )
                )}

                {/* 2. TEXT RENDER */}
                {type === 'text' && (
                  editingTextId === ann.id ? (
                    <textarea
                      autoFocus
                      value={ann.text || ''}
                      onChange={(e) => updateAnn(ann.id, { text: e.target.value })}
                      onBlur={() => setEditingTextId(null)}
                      style={{
                        fontSize: `${ann.fontSize || 16}px`,
                        color: ann.fontColor || '#111827',
                        fontWeight: ann.isBold ? 'bold' : 'normal',
                        fontStyle: ann.isItalic ? 'italic' : 'normal',
                        backgroundColor: ann.backgroundColor || '#ffffff',
                      }}
                      className="w-full h-full p-1 border border-sky-500 rounded resize-none focus:outline-none"
                    />
                  ) : (
                    <div
                      style={{
                        fontSize: `${ann.fontSize || 16}px`,
                        color: ann.fontColor || '#111827',
                        fontWeight: ann.isBold ? 'bold' : 'normal',
                        fontStyle: ann.isItalic ? 'italic' : 'normal',
                        fontFamily:
                          ann.fontFamily === 'serif' ? 'serif' : ann.fontFamily === 'mono' ? 'monospace' : 'inherit',
                        backgroundColor: ann.backgroundColor || 'transparent',
                      }}
                      className="w-full h-full p-1 whitespace-pre-wrap select-none overflow-hidden rounded"
                    >
                      {ann.text || 'Double click to edit'}
                    </div>
                  )
                )}

                {/* 3. BOX RENDER */}
                {type === 'box' && (
                  <div
                    style={{
                      borderColor: ann.strokeColor || '#ef4444',
                      borderWidth: `${ann.strokeWidth || 3}px`,
                      borderStyle: ann.isDashed ? 'dashed' : 'solid',
                      backgroundColor: ann.fillColor || 'transparent',
                    }}
                    className="w-full h-full rounded-sm"
                  />
                )}

                {/* 4. ARROW RENDER */}
                {type === 'arrow' && (
                  <svg className="w-full h-full overflow-visible pointer-events-none" viewBox="0 0 100 20" preserveAspectRatio="none">
                    <defs>
                      <marker
                        id={`arrowhead-${ann.id}`}
                        markerWidth="6"
                        markerHeight="6"
                        refX="4"
                        refY="3"
                        orient="auto"
                      >
                        <polygon points="0 0, 6 3, 0 6" fill={ann.arrowColor || '#ef4444'} />
                      </marker>
                    </defs>
                    <line
                      x1="0"
                      y1="10"
                      x2="92"
                      y2="10"
                      stroke={ann.arrowColor || '#ef4444'}
                      strokeWidth={ann.arrowThickness || 4}
                      strokeLinecap="round"
                      markerEnd={`url(#arrowhead-${ann.id})`}
                    />
                  </svg>
                )}

                {/* Bounding Handles (when selected) */}
                {isSelected && (
                  <>
                    {/* Top Rotation Handle */}
                    <div
                      onMouseDown={(e) => handleMouseDownOnHandle(e, 'rotate', ann)}
                      className="absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center cursor-grab active:cursor-grabbing shadow-md border-2 border-white hover:scale-110 transition-transform z-30"
                      title="Drag to Rotate"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </div>
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-sky-500 pointer-events-none" />

                    {/* Corner Handles */}
                    <div
                      onMouseDown={(e) => handleMouseDownOnHandle(e, 'nw', ann)}
                      className="absolute -top-3 -left-3 w-6 h-6 flex items-center justify-center cursor-nwse-resize group/h z-30"
                    >
                      <div className="w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-full group-hover/h:scale-125 transition-transform shadow" />
                    </div>

                    <div
                      onMouseDown={(e) => handleMouseDownOnHandle(e, 'ne', ann)}
                      className="absolute -top-3 -right-3 w-6 h-6 flex items-center justify-center cursor-nesw-resize group/h z-30"
                    >
                      <div className="w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-full group-hover/h:scale-125 transition-transform shadow" />
                    </div>

                    <div
                      onMouseDown={(e) => handleMouseDownOnHandle(e, 'sw', ann)}
                      className="absolute -bottom-3 -left-3 w-6 h-6 flex items-center justify-center cursor-nesw-resize group/h z-30"
                    >
                      <div className="w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-full group-hover/h:scale-125 transition-transform shadow" />
                    </div>

                    <div
                      onMouseDown={(e) => handleMouseDownOnHandle(e, 'se', ann)}
                      className="absolute -bottom-3 -right-3 w-6 h-6 flex items-center justify-center cursor-nwse-resize group/h z-30"
                    >
                      <div className="w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-full group-hover/h:scale-125 transition-transform shadow" />
                    </div>

                    {/* Side Handles */}
                    <div
                      onMouseDown={(e) => handleMouseDownOnHandle(e, 'e', ann)}
                      className="absolute top-1/2 -right-2.5 -translate-y-1/2 w-5 h-5 flex items-center justify-center cursor-ew-resize group/h z-30"
                    >
                      <div className="w-2.5 h-4 bg-sky-500 rounded-full border border-white group-hover/h:scale-110 shadow" />
                    </div>

                    <div
                      onMouseDown={(e) => handleMouseDownOnHandle(e, 'w', ann)}
                      className="absolute top-1/2 -left-2.5 -translate-y-1/2 w-5 h-5 flex items-center justify-center cursor-ew-resize group/h z-30"
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
      <div className="bg-slate-900/90 border-t border-slate-800/80 px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-3">
          <span>{currentAnnotations.length} Element{currentAnnotations.length === 1 ? '' : 's'} on this page</span>
          <span className="text-slate-600">•</span>
          <span>Click tools above to add Text, Box, Arrow, Date, or Signatures</span>
        </div>
        <div className="font-mono text-slate-500">100% Client-Side Privacy</div>
      </div>
    </div>
  );
};
