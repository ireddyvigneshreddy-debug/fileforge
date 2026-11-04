# ⚡ FileForge Pro

> **Privacy-First, Local-First In-Browser File Utility Suite (45+ Tools)**  
> High-performance client-side processing for PDFs, images, office documents, archives, and security utilities. **Zero file uploads. Zero server logs. 100% private.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-fileforge--pro.vercel.app-0070F3?style=for-the-badge&logo=vercel&logoColor=white)](https://fileforge-pro.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js%2016-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React%2019-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript%205-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

---

## 🌐 Live Application

Explore the full application running globally on Vercel's Edge Network:  
👉 **[https://fileforge-pro.vercel.app](https://fileforge-pro.vercel.app)** *(Mirror: [fileforge-azure.vercel.app](https://fileforge-azure.vercel.app))*

---

## 🎯 Why FileForge? (Engineering Highlights)

Most online file converters (Smallpdf, iLovePDF, CloudConvert) upload your sensitive files (resumes, tax records, confidential slides) to third-party remote cloud servers, introduce network upload bottlenecks, and enforce aggressive paywalls.

**FileForge redesigns file processing from first principles using local-first browser capabilities:**

1. **🔒 Zero Cloud Uploads (Air-Gapped Local Privacy)**
   - Files **never leave the user's browser**. All operations execute inside client-side memory using Web Workers, HTML5 Canvas, WebAssembly, and native Web APIs.
   - Bank-grade privacy for confidential enterprise documents, financial records, and private media.

2. **⚡ Ultra-Low Latency & High Performance**
   - Eliminates multi-megabyte cloud upload and download roundtrips.
   - Initial page loads in **~140ms TTFB** via pre-rendered static routes on Vercel's Edge CDN.
   - Unlimited scalability: $0 server compute bills with 100% uptime.

3. **📱 100% Offline Progressive Web App (PWA)**
   - Pre-caches all 40+ utilities and core assets locally via a custom Service Worker.
   - Installable directly to your Mac Dock or mobile home screen as a standalone desktop app.
   - Operates entirely air-gapped without an internet connection.

3. **📦 Multi-File Batch Processing Engine**
   - Supports selecting or dropping 30–50 files at once.
   - Non-blocking asynchronous processing loops with live per-file progress tracking.
   - Automatically bundles batch transformations into a single compressed `.zip` archive while providing individual download links for each item.

4. **🗜️ Target-Size Guaranteed Compression**
   - Features adaptive binary-search quantization and multi-pass downsampling.
   - Guarantees strict output limits (`< 1 MB`, `< 500 KB`, `< 200 KB`, or custom KB/MB).

5. **📄 Client-Side Office OpenXML Parser**
   - In-browser parsing of Microsoft Word (`.docx`), PowerPoint (`.pptx`), and Excel (`.xlsx`) directly to vector PDFs without headless LibreOffice or server dependencies.

---

## 🛠️ Tool Suite (45+ Utilities)

### 📕 PDF Utilities
* **Compress PDF**: Target size constraints (`< 1MB`, `< 500KB`, custom KB/MB) with stream compaction and raster downsampling.
* **Merge PDF**: Combine multiple PDFs into a single document with drag-and-drop reordering.
* **Split PDF**: Extract page ranges (e.g. `1-3, 5`) or export every page into a ZIP archive.
* **Word to PDF**: Client-side XML parsing of `.docx` paragraphs, headings, and styles to formatted PDF.
* **PowerPoint to PDF**: Extracts slide decks and typography into clean presentation slides.
* **Excel to PDF**: Tabular worksheet renderer with automatic column layout and pagination.
* **Rotate PDF**: Permanent lossless 90°, 180°, and 270° orientation fix (all, odd, or even pages).
* **Lock / Protect PDF**: Client-side AES-256-GCM encryption with PBKDF2 key derivation.
* **Unlock PDF**: Decrypt password-protected PDFs and strip printing/copying restrictions.
* **Watermark PDF**: Vector text watermark overlay with opacity, color, and angle controls.
* **Page Numbers**: Coordinate-calculated header/footer numbering (`Page X of Y`).
* **PDF to Images**: High-DPI canvas rendering to PNG/JPG zipped bundles.
* **Images to PDF**: Combine multiple images into an auto-oriented multi-page PDF.
* **Grayscale PDF**: Transform colored PDFs into monochrome black-and-white for ink saving.
* **Reorder & Remove Pages**: Reorganize page index sequences or excise unwanted pages.
* **PDF Metadata**: Inspect and update Document Catalog Title, Author, Subject, and Keywords.

### 🖼️ Image Studio
* **Compress Image**: Adaptive quality reduction and WebP quantization targeting `< 1MB`, `< 500KB`, or custom limits.
* **Convert Image**: Lossless/lossy format conversion between WebP, PNG, and JPEG.
* **Resize Image**: Bicubic resampling with aspect ratio locking or exact pixel dimensions.
* **Crop Image**: Precision aspect-ratio cropping (1:1, 16:9, 4:3, 9:16, freeform).
* **Rotate & Flip**: 90°/180° rotation with horizontal/vertical mirroring.
* **Photo Filters**: Real-time canvas shaders (Grayscale, Sepia, Invert, Film Noir).
* **Blur & Pixelate**: Gaussian blur and retro pixelation for redacting sensitive information.
* **SVG to PNG**: Retina vector rasterizer at 1x, 2x, and 4x scale with alpha transparency.
* **Color Palette Extractor**: Histogram color quantization yielding the top 8 dominant HEX/RGB swatches.
* **Image to Base64**: Encode images directly into ready-to-paste Base64 Data URI strings.

### 📊 Office & Data Converters
* **CSV to Excel**: Multi-delimiter CSV parser converting raw text to styled `.xlsx` workbooks.
* **Excel to CSV**: Sheet extractor converting active worksheets to sanitized CSV tables.
* **JSON to CSV**: Flatten nested JSON arrays and objects into tabular CSV records.
* **Markdown to PDF**: Typography-optimized compiler from GitHub-Flavored Markdown to PDF.
* **Text to PDF**: Paginated plain text document generator.
* **Text Diff Compare**: Side-by-side unified text diffing with highlighted additions and deletions.

### 🔐 Security & File Utilities
* **Universal File Compressor**: Client-side streaming Gzip (`.gz`) and DEFLATE Level 9 ultra-ZIP.
* **Create ZIP / Extract ZIP**: Multi-file browser archiving and in-memory ZIP inspection/extraction.
* **File Hash Calculator**: WebCrypto hardware-accelerated SHA-256, SHA-512, and SHA-1 checksums.
* **File Inspector**: Magic bytes signature detector with color-coded Hex/ASCII byte dump.
* **QR Code Studio**: Vector QR code generator with color customizer and PNG/SVG export.
* **Password Generator**: High-entropy cryptographic randomness generator (`crypto.getRandomValues`).

---

## 🏗️ Architecture & Technology Stack

```
                     ┌──────────────────────────────────────────────┐
                     │           Next.js 16 (App Router)            │
                     │          React 19 + Tailwind CSS             │
                     └──────────────────────┬───────────────────────┘
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    ▼                                               ▼
         ┌─────────────────────┐                         ┌─────────────────────┐
         │     PDF Engine      │                         │    Image Engine     │
         │  pdf-lib / pdfjs    │                         │ Canvas2D / Offscreen│
         │  Web Workers        │                         │ WebP Quantization   │
         └──────────┬──────────┘                         └──────────┬──────────┘
                    │                                               │
                    │               100% In-Memory                  │
                    │         No Server Uploads (0 Bytes)           │
                    │                                               │
         ┌──────────┴──────────┐                         ┌──────────┴──────────┐
         │   Document Engine   │                         │  Crypto & Archives  │
         │ SheetJS / OpenXML   │                         │ WebCrypto API       │
         │ DOMParser Sanitizer │                         │ JSZip / Gzip Stream │
         └─────────────────────┘                         └─────────────────────┘
```

* **Framework:** Next.js 16.4 (Turbopack, App Router, SSG Pre-rendering)
* **UI Library:** React 19, Tailwind CSS, Lucide Icons, Canvas Confetti
* **PDF Core:** `pdf-lib` (byte-level PDF manipulation), `pdfjs-dist` (canvas rendering)
* **Document Engine:** `xlsx` (SheetJS), native XML `DOMParser`
* **Compression & Archiving:** `jszip` (DEFLATE), native `CompressionStream` (Gzip)
* **Cryptography:** Native `crypto.subtle` (AES-256-GCM, SHA-256/512, PBKDF2)
* **Deployment:** Vercel Edge Network (Anycast Global CDN)

---

## 🚀 Getting Started Locally

### Prerequisites
* **Node.js** >= 18.18.0
* **npm**, **pnpm**, or **yarn**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ireddyvigneshreddy-debug/fileforge.git
   cd fileforge
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Build for production:**
   ```bash
   npm run build
   npm run start
   ```

---

## 📈 Performance & Scalability

| Metric | Cloud-Based SaaS (Competitors) | FileForge Pro |
| :--- | :--- | :--- |
| **Data Privacy** | Files uploaded to remote cloud servers | **100% Client-Side (0 bytes uploaded)** |
| **Max File Size** | Limited by server upload bandwidth | **Limited only by local device RAM** |
| **Network Latency** | Upload time + Queue time + Download time | **Zero upload time (Instant memory pipeline)** |
| **Time to First Byte** | 600ms – 2,500ms | **~140ms (Edge pre-rendered)** |
| **Monthly Compute Cost** | $50 – $500+/mo in cloud VMs | **$0.00 (Pure static client-side compute)** |

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).

---

## 👤 Author

**Vignesh Reddy**  
- GitHub: [@ireddyvigneshreddy-debug](https://github.com/ireddyvigneshreddy-debug)  
- Live Project: [https://fileforge-pro.vercel.app](https://fileforge-pro.vercel.app)
