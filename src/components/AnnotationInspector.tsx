import React from 'react';
import {
  Type,
  Square,
  ArrowRight,
  FileSignature,
  Trash2,
  Copy,
  RotateCw,
  Layers,
  Scaling,
  Bold,
  Italic,
  Palette,
  Sliders,
  Check,
  AlignLeft,
  Sparkles
} from 'lucide-react';
import { DocumentAnnotation } from '../types';

interface AnnotationInspectorProps {
  annotation: DocumentAnnotation;
  onUpdateAnnotation: (updates: Partial<DocumentAnnotation>) => void;
  onDeleteAnnotation: (id: string) => void;
  onDuplicateAnnotation: (ann: DocumentAnnotation) => void;
  docAspect?: number;
}

const COMMON_COLORS = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber / Orange
  '#111827', // Black
  '#8b5cf6', // Purple
];

const HIGHLIGHT_BG_COLORS = [
  { name: 'None', val: 'transparent' },
  { name: 'Yellow', val: 'rgba(254, 240, 138, 0.6)' },
  { name: 'Green', val: 'rgba(187, 247, 208, 0.6)' },
  { name: 'Blue', val: 'rgba(191, 219, 254, 0.6)' },
  { name: 'White', val: '#ffffff' },
];

const FILL_BG_COLORS = [
  { name: 'Transparent', val: 'transparent' },
  { name: 'Light Red', val: 'rgba(254, 202, 202, 0.25)' },
  { name: 'Light Blue', val: 'rgba(191, 219, 254, 0.25)' },
  { name: 'Light Yellow', val: 'rgba(254, 240, 138, 0.25)' },
  { name: 'Solid White', val: 'rgba(255, 255, 255, 0.95)' },
];

export const AnnotationInspector: React.FC<AnnotationInspectorProps> = ({
  annotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onDuplicateAnnotation,
  docAspect = 0.75,
}) => {
  const type = annotation.type || 'signature';

  const handleWidthChange = (newWidth: number) => {
    const clampedW = Math.max(4, Math.min(95, newWidth));
    const ar = annotation.aspectRatio || (annotation.width / (annotation.height * docAspect)) || 2;
    const newHeight = (clampedW / ar) * docAspect;
    onUpdateAnnotation({
      width: clampedW,
      height: Math.min(95, Math.max(2, newHeight)),
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          {type === 'text' && <Type className="w-4 h-4 text-sky-400" />}
          {type === 'box' && <Square className="w-4 h-4 text-emerald-400" />}
          {type === 'arrow' && <ArrowRight className="w-4 h-4 text-rose-400" />}
          {type === 'signature' && <FileSignature className="w-4 h-4 text-indigo-400" />}
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            {type === 'text' ? 'Text Properties' : type === 'box' ? 'Box Properties' : type === 'arrow' ? 'Arrow Properties' : 'Stamp Properties'}
          </h3>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onDuplicateAnnotation(annotation)}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-sky-300 transition"
            title="Duplicate"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDeleteAnnotation(annotation.id)}
            className="p-1.5 hover:bg-rose-500/20 rounded-lg text-slate-400 hover:text-rose-400 transition"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 1. TEXT SPECIFIC CONTROLS */}
      {type === 'text' && (
        <div className="space-y-4">
          {/* Text Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <AlignLeft className="w-3.5 h-3.5 text-sky-400" /> Content
            </label>
            <textarea
              value={annotation.text || ''}
              onChange={(e) => onUpdateAnnotation({ text: e.target.value })}
              placeholder="Type your text note here..."
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>

          {/* Font Size & Styling */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Font Size</span>
              <span className="font-mono text-sky-400">{annotation.fontSize || 18}pt</span>
            </div>
            <input
              type="range"
              min="10"
              max="48"
              step="1"
              value={annotation.fontSize || 18}
              onChange={(e) => onUpdateAnnotation({ fontSize: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-sky-400"
            />
          </div>

          {/* Bold, Italic & Font Family */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onUpdateAnnotation({ isBold: !annotation.isBold })}
                className={`p-2 rounded-xl border text-xs font-bold transition ${
                  annotation.isBold
                    ? 'border-sky-500 bg-sky-500/20 text-sky-300'
                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title="Bold"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onUpdateAnnotation({ isItalic: !annotation.isItalic })}
                className={`p-2 rounded-xl border text-xs font-bold transition ${
                  annotation.isItalic
                    ? 'border-sky-500 bg-sky-500/20 text-sky-300'
                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title="Italic"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
              {[
                { label: 'Sans', val: 'sans' },
                { label: 'Serif', val: 'serif' },
                { label: 'Mono', val: 'mono' },
              ].map((f) => (
                <button
                  key={f.val}
                  onClick={() => onUpdateAnnotation({ fontFamily: f.val as any })}
                  className={`px-2 py-1 rounded-lg font-medium transition ${
                    (annotation.fontFamily || 'sans') === f.val
                      ? 'bg-sky-500 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text Color Picker */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-sky-400" /> Text Color
            </label>
            <div className="flex items-center gap-2">
              {COMMON_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => onUpdateAnnotation({ fontColor: c })}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full border-2 transition ${
                    (annotation.fontColor || '#111827').toLowerCase() === c.toLowerCase()
                      ? 'border-white scale-110 shadow'
                      : 'border-transparent opacity-80'
                  }`}
                />
              ))}
              <input
                type="color"
                value={annotation.fontColor || '#111827'}
                onChange={(e) => onUpdateAnnotation({ fontColor: e.target.value })}
                className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 ml-auto"
                title="Custom color"
              />
            </div>
          </div>

          {/* Background Pill Highlight */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              Background Highlight
            </label>
            <div className="grid grid-cols-5 gap-1.5 text-[11px]">
              {HIGHLIGHT_BG_COLORS.map((bg) => (
                <button
                  key={bg.name}
                  onClick={() => onUpdateAnnotation({ backgroundColor: bg.val })}
                  className={`py-1 rounded-lg border text-center font-medium transition ${
                    (annotation.backgroundColor || 'transparent') === bg.val
                      ? 'border-sky-500 bg-sky-500/20 text-sky-300 font-bold'
                      : 'border-slate-800 bg-slate-800/80 text-slate-400'
                  }`}
                >
                  {bg.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. BOX SPECIFIC CONTROLS */}
      {type === 'box' && (
        <div className="space-y-4">
          {/* Border Color */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-emerald-400" /> Border Color
            </label>
            <div className="flex items-center gap-2">
              {COMMON_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => onUpdateAnnotation({ strokeColor: c })}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full border-2 transition ${
                    (annotation.strokeColor || '#ef4444').toLowerCase() === c.toLowerCase()
                      ? 'border-white scale-110 shadow'
                      : 'border-transparent opacity-80'
                  }`}
                />
              ))}
              <input
                type="color"
                value={annotation.strokeColor || '#ef4444'}
                onChange={(e) => onUpdateAnnotation({ strokeColor: e.target.value })}
                className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 ml-auto"
              />
            </div>
          </div>

          {/* Border Thickness & Style */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Border Width</span>
              <span className="font-mono text-emerald-400">{annotation.strokeWidth || 3}px</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={annotation.strokeWidth || 3}
              onChange={(e) => onUpdateAnnotation({ strokeWidth: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-emerald-400"
            />
          </div>

          {/* Dashed Toggle */}
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={!!annotation.isDashed}
              onChange={(e) => onUpdateAnnotation({ isDashed: e.target.checked })}
              className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
            />
            <span>Dashed outline</span>
          </label>

          {/* Fill Color */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              Box Fill Color
            </label>
            <div className="grid grid-cols-3 gap-1.5 text-[11px]">
              {FILL_BG_COLORS.map((f) => (
                <button
                  key={f.name}
                  onClick={() => onUpdateAnnotation({ fillColor: f.val })}
                  className={`py-1 px-1 rounded-lg border text-center font-medium transition ${
                    (annotation.fillColor || 'transparent') === f.val
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold'
                      : 'border-slate-800 bg-slate-800/80 text-slate-400'
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. ARROW SPECIFIC CONTROLS */}
      {type === 'arrow' && (
        <div className="space-y-4">
          {/* Arrow Color */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-rose-400" /> Arrow Color
            </label>
            <div className="flex items-center gap-2">
              {COMMON_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => onUpdateAnnotation({ arrowColor: c })}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full border-2 transition ${
                    (annotation.arrowColor || '#ef4444').toLowerCase() === c.toLowerCase()
                      ? 'border-white scale-110 shadow'
                      : 'border-transparent opacity-80'
                  }`}
                />
              ))}
              <input
                type="color"
                value={annotation.arrowColor || '#ef4444'}
                onChange={(e) => onUpdateAnnotation({ arrowColor: e.target.value })}
                className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 ml-auto"
              />
            </div>
          </div>

          {/* Arrow Line Thickness */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Arrow Thickness</span>
              <span className="font-mono text-rose-400">{annotation.arrowThickness || 4}px</span>
            </div>
            <input
              type="range"
              min="2"
              max="14"
              value={annotation.arrowThickness || 4}
              onChange={(e) => onUpdateAnnotation({ arrowThickness: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-rose-400"
            />
          </div>
        </div>
      )}

      {/* UNIVERSAL SIZE, ROTATION & OPACITY CONTROLS */}
      <div className="pt-3 border-t border-slate-800 space-y-3.5">
        {/* Width / Size Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1">
              <Scaling className="w-3.5 h-3.5 text-sky-400" /> Element Scale
            </span>
            <span className="font-mono text-slate-400">{Math.round(annotation.width)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleWidthChange(annotation.width - 3)}
              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-200 font-bold text-sm select-none active:scale-95"
            >
              -
            </button>
            <input
              type="range"
              min="5"
              max="90"
              value={Math.round(annotation.width)}
              onChange={(e) => handleWidthChange(Number(e.target.value))}
              className="flex-1 h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-sky-400"
            />
            <button
              onClick={() => handleWidthChange(annotation.width + 3)}
              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-200 font-bold text-sm select-none active:scale-95"
            >
              +
            </button>
          </div>
        </div>

        {/* Rotation & Opacity Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <div className="flex justify-between text-slate-400 text-[11px]">
              <span className="flex items-center gap-1">
                <RotateCw className="w-3 h-3 text-sky-400" /> Rotate
              </span>
              <span className="font-mono text-slate-300">{annotation.rotation}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={annotation.rotation}
              onChange={(e) => onUpdateAnnotation({ rotation: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-sky-400"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-slate-400 text-[11px]">
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3 text-sky-400" /> Opacity
              </span>
              <span className="font-mono text-slate-300">{Math.round((annotation.opacity ?? 1) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={annotation.opacity ?? 1}
              onChange={(e) => onUpdateAnnotation({ opacity: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-sky-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
