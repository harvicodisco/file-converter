# Universal Converter - Professional File Tools Application

A modern, user-friendly web application for managing PDF files with merge, split, and compress functionalities.

![Universal Converter](https://img.shields.io/badge/Next.js-16.1.6-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8?style=for-the-badge&logo=tailwind-css)

## ✨ Features

### 🔄 Merge PDF
- Combine multiple PDF files into a single document
- Drag-and-drop file upload
- Reorder files before merging
- Support for unlimited PDF files

### ✂️ Split PDF
- Extract specific pages from PDF files
- Two split modes:
  - **Specific Pages**: Extract individual pages (e.g., 1, 3, 5-7)
  - **Page Range**: Extract a continuous range of pages
- Download multiple split files

### 🗜️ Compress PDF
- Reduce PDF file size without significant quality loss
- Three compression levels:
  - **Low**: Best quality, larger file size
  - **Medium**: Balanced quality and size (recommended)
  - **High**: Smallest file size, reduced quality
- View compression statistics (original size, compressed size, savings %)

## 🎨 Design Highlights

- **Modern Dark Theme**: Sleek, professional appearance
- **Glassmorphism Effects**: Backdrop blur and transparency
- **Smooth Animations**: Powered by Framer Motion
- **Responsive Design**: Works perfectly on mobile, tablet, and desktop
- **Color-Coded Tools**: Each tool has a unique gradient color scheme
- **Intuitive UX**: Clear visual feedback and step-by-step instructions

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or higher
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd omniconvert
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3001](http://localhost:3001)

## 📁 Project Structure

```
omniconvert/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── layout.tsx           # Root layout with Navbar
│   │   ├── page.tsx             # Home page
│   │   ├── merge-pdf/           # Merge PDF page
│   │   ├── split-pdf/           # Split PDF page
│   │   ├── compress-pdf/        # Compress PDF page
│   │   ├── globals.css          # Global styles
│   │   └── api/                 # API routes (to be implemented)
│   └── components/              # Reusable React components
│       ├── Navbar.tsx           # Navigation bar
│       ├── PageLayout.tsx       # Page wrapper component
│       └── FileUploadCard.tsx   # File upload component
├── public/                      # Static assets
├── package.json                 # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── tailwind.config.ts          # Tailwind CSS configuration
└── next.config.ts              # Next.js configuration
```

## 🛠️ Technology Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16.1.6** | React framework with App Router |
| **React 19.2.3** | UI library |
| **TypeScript 5** | Type-safe JavaScript |
| **Tailwind CSS 4** | Utility-first CSS framework |
| **Framer Motion** | Animation library |
| **Lucide React** | Icon library |

## 📝 API Implementation (Next Steps)

The frontend UI is complete. To make the application fully functional, implement these API routes:

### 1. Merge PDF API (`/api/merge-pdf`)
```typescript
// Expected input: FormData with multiple PDF files
// Expected output: { fileName: string, downloadUrl: string }
```

### 2. Split PDF API (`/api/split-pdf`)
```typescript
// Expected input: FormData with PDF file and split options
// Expected output: { files: Array<{ fileName: string, downloadUrl: string }> }
```

### 3. Compress PDF API (`/api/compress-pdf`)
```typescript
// Expected input: FormData with PDF file and compression level
// Expected output: { 
//   fileName: string, 
//   downloadUrl: string,
//   originalSize: number,
//   compressedSize: number,
//   compressionRatio: number
// }
```

### Recommended Libraries

- **pdf-lib**: For merging and splitting PDFs
- **pdf-parse**: For reading PDF metadata
- **sharp** or **ghostscript**: For PDF compression
- **multer**: For handling file uploads

## 🎯 Key Features

✅ **No Authentication Required** - Direct access to all tools  
✅ **Clean Architecture** - Well-organized folder structure  
✅ **Reusable Components** - DRY principle throughout  
✅ **Type-Safe** - Full TypeScript implementation  
✅ **Responsive** - Mobile-first design approach  
✅ **Accessible** - Semantic HTML and ARIA labels  
✅ **Modern UI** - Glassmorphism and smooth animations  

## 🎨 Color Scheme

| Tool | Gradient |
|------|----------|
| **Merge PDF** | Purple (#A855F7) → Pink (#EC4899) |
| **Split PDF** | Blue (#3B82F6) → Cyan (#06B6D4) |
| **Compress PDF** | Green (#10B981) → Emerald (#059669) |

## 📱 Pages

| Route | Description |
|-------|-------------|
| `/` | Home page with tool cards |
| `/merge-pdf` | Merge multiple PDFs |
| `/split-pdf` | Split PDF by pages or range |
| `/compress-pdf` | Compress PDF with quality options |

## 🔧 Development Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## 📄 Documentation

- **[IMPLEMENTATION.md](./IMPLEMENTATION.md)** - Detailed implementation guide
- **[DESIGN_GUIDE.md](./DESIGN_GUIDE.md)** - Universal Converter - Visual Design Guide

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Icons by [Lucide](https://lucide.dev/)
- Animations by [Framer Motion](https://www.framer.com/motion/)
- UI Framework by [Next.js](https://nextjs.org/)
- Styling by [Tailwind CSS](https://tailwindcss.com/)

---

**Built with ❤️ using Next.js and TypeScript**
