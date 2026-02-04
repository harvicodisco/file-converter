# Universal Converter - Professional File Conversion Platform

A modern, component-based web application for converting and managing files with support for PDF, Office documents, and images.

![Universal Converter](https://img.shields.io/badge/Next.js-16.1.6-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8?style=for-the-badge&logo=tailwind-css)

## ✨ Features

### 📄 PDF Operations
- **Merge PDF** - Combine multiple PDF files into a single document
- **Split PDF** - Extract specific pages or page ranges
- **Compress PDF** - Reduce file size with quality options

### 🔄 PDF to Office
- **PDF to Word** - Convert PDF to editable DOCX format
- **PDF to Excel** - Extract tables and data to Excel
- **PDF to PowerPoint** - Convert PDF pages to slides

### 🖼️ Image Conversions
- **PDF to JPG** - Convert PDF pages to images
- **Image to PDF** - Convert JPG/PNG images to PDF

### 📊 Office to PDF
- **Office to PDF** - Convert Word, Excel, PowerPoint to PDF

## 🎨 Component-Based Architecture

The application is built with reusable, maintainable components:

### Core Components

#### `FileUpload.tsx`
- Drag-and-drop file upload
- Google Drive integration (placeholder)
- Multi-file support
- File size validation
- Animated file list

#### `ProcessingButton.tsx`
- Loading states with spinners
- Customizable gradients
- Disabled state handling
- Icon support

#### `DownloadResult.tsx`
- Proper file download functionality
- Statistics display (for compression)
- Reset/convert another option
- Success animations

#### `ConversionCard.tsx`
- Reusable tool cards
- Hover effects
- Gradient backgrounds
- Icon integration

#### `PageLayout.tsx`
- Consistent page structure
- Animated backgrounds
- Responsive design

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or higher
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd universalconvert
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3001](http://localhost:3001)

## 📁 Project Structure

```
universalconvert/
├── src/
│   ├── app/                          # Next.js App Router pages
│   │   ├── layout.tsx               # Root layout with Navbar
│   │   ├── page.tsx                 # Home page
│   │   ├── merge-pdf/               # Merge PDF page
│   │   ├── split-pdf/               # Split PDF page
│   │   ├── compress-pdf/            # Compress PDF page
│   │   ├── pdf-to-word/             # PDF to Word page
│   │   ├── pdf-to-excel/            # PDF to Excel page
│   │   ├── pdf-to-ppt/              # PDF to PowerPoint page
│   │   ├── pdf-to-jpg/              # PDF to JPG page
│   │   ├── image-to-pdf/            # Image to PDF page
│   │   ├── office-to-pdf/           # Office to PDF page
│   │   ├── globals.css              # Global styles
│   │   └── api/                     # API routes
│   │       ├── merge-pdf/
│   │       ├── split-pdf/
│   │       ├── compress-pdf/
│   │       ├── pdf-to-word/
│   │       ├── pdf-to-excel/
│   │       ├── pdf-to-ppt/
│   │       ├── pdf-to-jpg/
│   │       ├── image-to-pdf/
│   │       └── office-to-pdf/
│   ├── components/                  # Reusable React components
│   │   ├── Navbar.tsx              # Navigation with dropdown
│   │   ├── PageLayout.tsx          # Page wrapper
│   │   ├── FileUpload.tsx          # File upload component
│   │   ├── ProcessingButton.tsx    # Action button with loading
│   │   ├── DownloadResult.tsx      # Download success component
│   │   └── ConversionCard.tsx      # Tool card component
│   └── utils/                       # Utility functions
├── public/                          # Static assets
├── package.json                     # Dependencies
├── tsconfig.json                   # TypeScript config
├── tailwind.config.ts              # Tailwind CSS config
└── next.config.ts                  # Next.js config
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
| **pdf-lib** | PDF manipulation |

## 🎯 Key Features

✅ **Component-Based Architecture** - Reusable, maintainable components  
✅ **Drag & Drop Upload** - Intuitive file upload experience  
✅ **Google Drive Integration** - Upload from cloud (placeholder)  
✅ **Multi-File Support** - Process multiple files at once  
✅ **Proper Downloads** - Fixed download functionality with blob URLs  
✅ **Loading States** - Clear visual feedback during processing  
✅ **Responsive Design** - Works on all devices  
✅ **Modern UI** - Glassmorphism and smooth animations  
✅ **Type-Safe** - Full TypeScript implementation  

## 📝 API Implementation Status

### ✅ Fully Implemented
- Merge PDF (using pdf-lib)
- Split PDF (using pdf-lib)
- Compress PDF (using pdf-lib)
- Image to PDF (using pdf-lib)

### 🚧 Placeholder APIs (Need Implementation)
- PDF to Word - Requires pdf2docx or external API
- PDF to Excel - Requires tabula-py or external API
- PDF to PowerPoint - Requires external API
- PDF to JPG - Requires pdf2image or sharp
- Office to PDF - Requires LibreOffice or external API

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

## 🎨 Design System

### Color Palette
- **Background**: `#050505` (Almost black)
- **Cards**: `#18181B` (Zinc-900) with 80% opacity
- **Borders**: White with 10% opacity

### Gradients
- **Merge PDF**: Purple to Pink
- **Split PDF**: Blue to Cyan
- **Compress PDF**: Green to Emerald
- **PDF to Word**: Blue
- **PDF to Excel**: Green
- **PDF to PowerPoint**: Orange
- **PDF to JPG**: Pink
- **Image to PDF**: Purple
- **Office to PDF**: Indigo

## 📱 Pages & Routes

| Route | Description |
|-------|-------------|
| `/` | Home page with all conversion tools |
| `/merge-pdf` | Merge multiple PDFs |
| `/split-pdf` | Split PDF by pages or range |
| `/compress-pdf` | Compress PDF with quality options |
| `/pdf-to-word` | Convert PDF to DOCX |
| `/pdf-to-excel` | Convert PDF to XLSX |
| `/pdf-to-ppt` | Convert PDF to PPTX |
| `/pdf-to-jpg` | Convert PDF to JPG images |
| `/image-to-pdf` | Convert images to PDF |
| `/office-to-pdf` | Convert Office files to PDF |

## 🚀 Deployment

The application is ready for deployment on platforms like:
- Vercel (recommended for Next.js)
- Netlify
- AWS Amplify
- Docker containers

## 🤝 Contributing

Contributions are welcome! To add new conversion features:

1. Create a new page in `src/app/[feature-name]/page.tsx`
2. Use existing components (FileUpload, ProcessingButton, DownloadResult)
3. Create API route in `src/app/api/[feature-name]/route.ts`
4. Add to home page in `src/app/page.tsx`
5. Update Navbar in `src/components/Navbar.tsx`

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Icons by [Lucide](https://lucide.dev/)
- Animations by [Framer Motion](https://www.framer.com/motion/)
- UI Framework by [Next.js](https://nextjs.org/)
- Styling by [Tailwind CSS](https://tailwindcss.com/)
- PDF manipulation by [pdf-lib](https://pdf-lib.js.org/)

---

**Built with ❤️ using Next.js, TypeScript, and modern web technologies**
