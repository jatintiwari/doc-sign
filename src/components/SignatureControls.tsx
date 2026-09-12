import React from 'react';
import {
  Sliders,
  Palette,
  Eye,
  Crop,
  SunMedium,
  Feather,
  RefreshCw,
  Plus,
  PenTool,
  Check,
  Scaling,
  RotateCw,
  Layers,
  Maximize2
} from 'lucide-react';
import { SignatureProcessingSettings, PlacedSignature } from '../types';

interface SignatureControlsProps {
  settings: SignatureProcessingSettings;
  onSettingsChange: (newSettings: SignatureProcessingSettings) => void;
  rawSignatureUrl: string | null;
  processedSignatureUrl: string | null;
  isProcessing: boolean;
  onAddSignatureToDocument: () => void;
  onOpenDrawSignature: () => void;
  onTriggerSignatureUpload: () => void;
  selectedSignature?: PlacedSignature | null;
  onUpdateSelectedSignature?: (updates: Partial<PlacedSignature>) => void;
  docAspect?: number;
}

const PRESET_COLORS = [
  { name: 'Original Ink', value: 'original', color: 'linear-gradient(135deg, #1e293b, #3b82f6)' },
  { name: 'Deep Royal Blue', value: '#084298', color: '#084298' },
  { name: 'Classic Black', value: '#111827', color: '#111827' },
  { name: 'Midnight Navy', value: '#0f172a', color: '#0f172a' },
  { name: 'Burgundy Red', value: '#831843', color: '#831843' },
  { name: 'Forest Green', value: '#064e3b', color: '#064e3b' },
];

const SIZE_PRESETS = [
  { label: 'Small', width: 16 },
  { label: 'Normal', width: 28 },
  { label: 'Large', width: 44 },
  { label: 'X-Large', width: 62 },
];

export const SignatureControls: React.FC<SignatureControlsProps> = ({
  settings,
  onSettingsChange,
  processedSignatureUrl,
  isProcessing,
  onAddSignatureToDocument,
  onOpenDrawSignature,
  onTriggerSignatureUpload,
  selectedSignature,
  onUpdateSelectedSignature,
  docAspect = 0.75,
}) => {
  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({
      ...settings,
      threshold: Number(e.target.value),
    });
  };

  const handleSmoothnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({
      ...settings,
      smoothness: Number(e.target.value),
    });
  };

  const handleContrastChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({
      ...settings,
      contrast: Number(e.target.value),
    });
  };

  const handleColorSelect = (colorValue: string) => {
    if (colorValue === 'original') {
      onSettingsChange({
        ...settings,
        preserveColor: true,
        inkColor: 'original',
      });
    } else {
      onSettingsChange({
        ...settings,
        preserveColor: false,
        inkColor: colorValue,
      });
    }
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({
      ...settings,
      preserveColor: false,
      inkColor: e.target.value,
    });
  };

  // Adjust signature width & height proportionally
  const handleSignatureWidthChange = (newWidth: number) => {
    if (!selectedSignature || !onUpdateSelectedSignature) return;
    const ar = selectedSignature.aspectRatio || 2;
    const newHeight = (newWidth / ar) * docAspect;
    onUpdateSelectedSignature({
      width: Math.min(100, Math.max(5, newWidth)),
      height: Math.min(100, Math.max(2, newHeight)),
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Signature Controls
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onTriggerSignatureUpload}
            className="text-xs text-slate-400 hover:text-sky-400 transition"
            title="Replace signature image"
          >
            Upload New
          </button>
          <span className="text-slate-700">|</span>
          <button
            onClick={onOpenDrawSignature}
            className="text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1 transition"
          >
            <PenTool className="w-3 h-3" />
            Draw
          </button>
        </div>
      </div>

      {/* ACTIVE SIGNATURE SIZE & TRANSFORM SECTION */}
      {selectedSignature && onUpdateSelectedSignature && (
        <div className="p-4 rounded-xl bg-sky-950/30 border border-sky-500/30 space-y-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-sky-300 flex items-center gap-1.5 uppercase tracking-wide">
              <Scaling className="w-4 h-4 text-sky-400" />
              Signature Size & Scale
            </span>
            <span className="font-mono font-bold text-sky-300 bg-sky-500/20 px-2 py-0.5 rounded-md">
              {Math.round(selectedSignature.width)}%
            </span>
          </div>

          {/* Size Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleSignatureWidthChange(selectedSignature.width - 4)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-200 font-bold text-sm select-none active:scale-95"
                title="Decrease Size"
              >
                -
              </button>
              <input
                type="range"
                min="6"
                max="90"
                step="1"
                value={Math.round(selectedSignature.width)}
                onChange={(e) => handleSignatureWidthChange(Number(e.target.value))}
                className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
              <button
                onClick={() => handleSignatureWidthChange(selectedSignature.width + 4)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-200 font-bold text-sm select-none active:scale-95"
                title="Increase Size"
              >
                +
              </button>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="grid grid-cols-4 gap-1.5">
            {SIZE_PRESETS.map((preset) => {
              const isActive = Math.abs(selectedSignature.width - preset.width) < 3;
              return (
                <button
                  key={preset.label}
                  onClick={() => handleSignatureWidthChange(preset.width)}
                  className={`py-1.5 px-1 rounded-lg text-xs font-medium border transition text-center ${
                    isActive
                      ? 'border-sky-400 bg-sky-500/25 text-sky-200 font-bold shadow-sm'
                      : 'border-slate-800 bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Rotation & Opacity Row */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-sky-500/20 text-xs">
            {/* Rotation */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span className="flex items-center gap-1">
                  <RotateCw className="w-3 h-3 text-sky-400" /> Rotate
                </span>
                <span className="font-mono text-slate-300">{selectedSignature.rotation}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={selectedSignature.rotation}
                onChange={(e) => onUpdateSelectedSignature({ rotation: Number(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
            </div>

            {/* Opacity */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3 text-sky-400" /> Opacity
                </span>
                <span className="font-mono text-slate-300">{Math.round((selectedSignature.opacity ?? 1) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={selectedSignature.opacity ?? 1}
                onChange={(e) => onUpdateSelectedSignature({ opacity: Number(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
            </div>
          </div>
        </div>
      )}

      {/* Signature Preview Card with Checkerboard Transparency */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-sky-400" />
            Transparent Preview
          </span>
          {isProcessing && (
            <span className="text-[11px] text-sky-400 flex items-center gap-1 animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" /> Processing...
            </span>
          )}
        </div>

        <div className="relative w-full h-28 rounded-xl overflow-hidden border border-slate-700 flex items-center justify-center bg-[linear-gradient(45deg,#1e293b_25%,transparent_25%),linear-gradient(-45deg,#1e293b_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1e293b_75%),linear-gradient(-45deg,transparent_75%,#1e293b_75%)] bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0px] bg-slate-900">
          {processedSignatureUrl ? (
            <img
              src={processedSignatureUrl}
              alt="Processed Transparent Signature"
              className="max-h-24 max-w-[90%] object-contain filter drop-shadow-md select-none pointer-events-none"
            />
          ) : (
            <div className="text-xs text-slate-500">No signature loaded</div>
          )}
        </div>
      </div>

      {/* Threshold / Paper Eraser Slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <SunMedium className="w-3.5 h-3.5 text-amber-400" />
            Background Cutoff Sensitivity
          </span>
          <span className="font-mono text-slate-400">{settings.threshold}</span>
        </div>
        <input
          type="range"
          min="50"
          max="254"
          value={settings.threshold}
          onChange={handleThresholdChange}
          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
        />
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>More Paper Retained</span>
          <span>More Aggressive Eraser</span>
        </div>
      </div>

      {/* Smoothness / Feathering Slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Feather className="w-3.5 h-3.5 text-indigo-400" />
            Edge Feathering / Anti-Alias
          </span>
          <span className="font-mono text-slate-400">{settings.smoothness}px</span>
        </div>
        <input
          type="range"
          min="1"
          max="40"
          value={settings.smoothness}
          onChange={handleSmoothnessChange}
          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
      </div>

      {/* Ink Contrast Slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Crop className="w-3.5 h-3.5 text-emerald-400" />
            Ink Darkness Boost
          </span>
          <span className="font-mono text-slate-400">{settings.contrast.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="1.0"
          max="3.0"
          step="0.1"
          value={settings.contrast}
          onChange={handleContrastChange}
          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />
      </div>

      {/* Ink Color Picker */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-sky-400" />
            Ink Color
          </span>
          <span className="text-[11px] text-slate-400 capitalize">
            {settings.preserveColor ? 'Original Photo' : settings.inkColor}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {PRESET_COLORS.map((c) => {
            const isSelected =
              (c.value === 'original' && settings.preserveColor) ||
              (!settings.preserveColor && settings.inkColor.toLowerCase() === c.value.toLowerCase());

            return (
              <button
                key={c.value}
                onClick={() => handleColorSelect(c.value)}
                className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium border transition-all text-left ${
                  isSelected
                    ? 'border-sky-500 bg-sky-500/15 text-white shadow-sm'
                    : 'border-slate-800 bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div
                  className="w-4 h-4 rounded-full shrink-0 border border-white/20 flex items-center justify-center shadow-inner"
                  style={{ background: c.color }}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <span className="truncate text-[11px]">{c.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Custom Color Input */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="color"
            value={settings.preserveColor ? '#084298' : settings.inkColor}
            onChange={handleCustomColorChange}
            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
          />
          <span className="text-xs text-slate-400">Custom ink shade</span>
        </div>
      </div>

      {/* Invert / Auto-crop switches */}
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
        <label className="flex items-center gap-2 cursor-pointer text-slate-300">
          <input
            type="checkbox"
            checked={settings.invert}
            onChange={(e) => onSettingsChange({ ...settings, invert: e.target.checked })}
            className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
          />
          <span>Invert (Dark paper photo)</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer text-slate-300">
          <input
            type="checkbox"
            checked={settings.autoCrop}
            onChange={(e) => onSettingsChange({ ...settings, autoCrop: e.target.checked })}
            className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
          />
          <span>Auto-trim margin</span>
        </label>
      </div>

      {/* Add Another Stamp Button */}
      <button
        onClick={onAddSignatureToDocument}
        className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-sm active:scale-98"
      >
        <Plus className="w-4 h-4 text-sky-400" />
        Add Stamp to Current Page
      </button>
    </div>
  );
};
