# DocuSign Studio (Doc-Sign) ✍️📦📄

> **Privacy-First Intelligent Document, Signature & Annotation Overlay Portal**  
> Automatically remove signature backgrounds, add editable text notes, draw boxes & arrows, position & resize with sub-pixel precision, and export lossless PDFs or high-resolution images — 100% client-side.

---

## 🌟 Key Features

### 1. 🖼️ Dual Input Engine
- **Base Document**: Upload multi-page **PDFs** (`.pdf`) or high-resolution **Images** (`.png`, `.jpg`, `.jpeg`, `.webp`, `.tiff`).
- **Signature Input**: 
  - Upload photos of paper signatures or stamps.
  - Draw directly using the built-in **Digital Draw Pad** (touch/stylus/mouse).
  - 1-Click **Demo Sample** for instant testing.

### 2. 🪄 AI-Powered Signature Background Eraser & Tuning
- **Luminosity & Chroma Keying**: Automatically separates pen strokes from paper textures, scanner shadows, and uneven lighting.
- **Edge Feathering & Anti-Aliasing**: Preserves natural, smooth ink contours without pixelated or jagged artifacts.
- **Ink Darkness Booster**: Enhances faint pencil or ballpoint pen lines.
- **Color Recoloring Palette**: Instantly convert signatures to *Royal Blue*, *Classic Black*, *Midnight Navy*, *Burgundy*, *Forest Green*, or any custom hex shade.
- **Auto-Trim Margins**: Crops whitespace to keep signature bounds tight and natural.
- **Inverted Mode**: Supports signatures written with light ink on dark paper.

### 3. ✍️ Full Document Annotation Suite
- **Text Notes & Field Filling**: Add editable text blocks with double-click inline typing, font size ($10\text{pt}$ to $48\text{pt}$), font family (`Sans`, `Serif`, `Mono`), bold/italic toggles, text colors, and background highlight pills.
- **Boxes & Rectangles**: Draw highlight rectangles with custom border color, border thickness ($1\text{px}$ to $10\text{px}$), transparent or solid fill colors, and dashed border styles.
- **Directional Arrows**: Add callout pointer arrows with adjustable thickness, custom colors, and $360^\circ$ orientation.
- **1-Click Date Stamp**: Instantly stamp today's date formatted onto the document.

### 4. 🎯 Interactive Visual Canvas & Manipulation
- **Drag & Drop**: Freely reposition signatures, text, boxes, and arrows anywhere on any page.
- **Multi-Method Sizing & Scaling**:
  - Corner and side drag handles with enlarged hit-boxes.
  - Quick top toolbar & sidebar size sliders.
  - Preset scale buttons (`S`, `M`, `L`, `XL`).
  - Keyboard shortcuts (`+` / `-` to scale, arrow keys to nudge, `Delete` to remove).
- **$360^\circ$ Freeform Rotation**: Align annotations to skewed document lines.
- **Multi-Stamp & Opacity Control**: Add multiple elements across pages with individual opacity.
- **Multi-Page PDF Viewer**: Seamless page pagination and independent annotation placement.

### 5. 🖨️ Lossless High-Fidelity Export
- **Vector PDF Export**: Uses `pdf-lib` to embed vector text, vector rectangles, arrows, and transparent signatures directly into the PDF coordinate tree, preserving original vector text, searchability, and print quality without rasterizing the document.
- **Image Export**: Generates composite PNG or JPEG files at $1\times$, $2\times$ (Retina), or $3\times$ (300 DPI print-ready).

### 6. 🔒 100% Client-Side Privacy
- No documents or signatures ever leave your browser.
- All PDF parsing, pixel rendering, and file composition run locally via WebAssembly and Canvas APIs.

---

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS
- **PDF Rendering**: `pdfjs-dist` (direct Web Worker `workerPort`)
- **PDF Vector Modification**: `pdf-lib`
- **Icons**: Lucide React

---

## 🚀 Quick Start

### Installation

```bash
# Clone repository
git clone https://github.com/jatintiwari/doc-sign.git
cd doc-sign

# Install dependencies
npm install

# Start development server
npm run dev
```

Open your browser at **`http://localhost:3000`** (or **`http://mosaic.local:3000`**).

### Production Build

```bash
npm run build
npm run preview
```

---

## 📂 Project Structure

```text
doc-sign/
├── src/
│   ├── components/
│   │   ├── AnnotationInspector.tsx # Contextual inspector for text, box, arrow, and stamp styling
│   │   ├── DocumentCanvas.tsx     # Interactive canvas with drag/scale/rotate & annotation tools
│   │   ├── DocumentUploader.tsx   # Dropzone upload for documents & signatures
│   │   ├── DrawSignatureModal.tsx # Smooth stylus / mouse signature draw pad
│   │   ├── ExportModal.tsx        # Multi-format export dialog (PDF/PNG/JPG)
│   │   ├── Header.tsx             # Navigation & actions bar
│   │   └── SignatureControls.tsx  # Background eraser tuning & ink color sidebar
│   ├── types/
│   │   └── index.ts               # Core TypeScript interfaces
│   ├── utils/
│   │   ├── backgroundRemoval.ts   # Canvas pixel thresholding & color engine
│   │   ├── imageExport.ts         # High-resolution canvas composer
│   │   ├── pdfHandler.ts          # PDF.js page rendering & pdf-lib vector stamping
│   │   └── sampleData.ts          # Demo document & signature generator
│   ├── App.tsx                    # Main state coordinator
│   ├── main.tsx                   # React root entry
│   └── index.css                  # Tailwind styles
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 📄 License

MIT License © 2026. Free for personal and commercial use.
