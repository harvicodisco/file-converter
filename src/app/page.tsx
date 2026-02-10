"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, CheckCircle2, Loader2, ArrowRight,
  Merge, Scissors, Minimize2, Sheet, Presentation,
  Image as ImageIcon, FileImage, FileSpreadsheet, Zap, Settings, Globe, Crop, Scan, Hash, Wrench, Eraser, GitCompare
} from "lucide-react";
import Link from "next/link";

const tools = [
  { name: "Merge PDF", href: "/merge-pdf", icon: Merge, description: "Combine multiple PDFs into one file", color: "text-blue-600", bg: "bg-blue-50" },
  { name: "Split PDF", href: "/split-pdf", icon: Scissors, description: "Extract pages from your PDF", color: "text-indigo-600", bg: "bg-indigo-50" },
  { name: "Organize PDF", href: "/organize-pdf", icon: Settings, description: "Rearrange, delete, or reorder pages", color: "text-purple-600", bg: "bg-purple-50" },
  { name: "Crop PDF", href: "/crop-pdf", icon: Crop, description: "Remove unwanted margins and areas", color: "text-orange-600", bg: "bg-orange-50" },
  { name: "Compress PDF", href: "/compress-pdf", icon: Minimize2, description: "Reduce file size while maintaining quality", color: "text-green-600", bg: "bg-green-50" },
  { name: "OCR PDF", href: "/ocr-pdf", icon: Scan, description: "Convert non-selectable PDFs into searchable text", color: "text-blue-600", bg: "bg-blue-50" },
  { name: "Add Page Numbers", href: "/add-page-numbers", icon: Hash, description: "Add page numbers with customizable positions and styles", color: "text-purple-600", bg: "bg-purple-50" },
  { name: "Repair PDF", href: "/repair-pdf", icon: Wrench, description: "Fix corrupted or damaged PDF files", color: "text-amber-600", bg: "bg-amber-50" },
  { name: "Redact PDF", href: "/redact-pdf", icon: Eraser, description: "Permanently remove sensitive information", color: "text-red-600", bg: "bg-red-50" },
  { name: "Compare PDF", href: "/compare-pdf", icon: GitCompare, description: "Compare two PDFs to find differences", color: "text-indigo-600", bg: "bg-indigo-50" },
  { name: "PDF to Word", href: "/pdf-to-word", icon: FileText, description: "Convert documents to editable Word", color: "text-blue-500", bg: "bg-blue-50/50" },
  { name: "PDF to Excel", href: "/pdf-to-excel", icon: Sheet, description: "Turn PDFs into editable spreadsheets", color: "text-emerald-600", bg: "bg-emerald-50" },
  { name: "PDF to PPT", href: "/pdf-to-ppt", icon: Presentation, description: "Create PowerPoint slides from PDF", color: "text-orange-600", bg: "bg-orange-50" },
  { name: "PDF to JPG", href: "/pdf-to-jpg", icon: ImageIcon, description: "Extract images from PDF pages", color: "text-pink-600", bg: "bg-pink-50" },
  { name: "Image to PDF", href: "/image-to-pdf", icon: FileImage, description: "Convert images to high-quality PDF", color: "text-violet-600", bg: "bg-violet-50" },
  { name: "HTML to PDF", href: "/html-to-pdf", icon: Globe, description: "Save web pages as PDF files", color: "text-cyan-600", bg: "bg-cyan-50" },
  { name: "Office to PDF", href: "/office-to-pdf", icon: FileSpreadsheet, description: "Convert Office files to PDF", color: "text-rose-600", bg: "bg-rose-50" },
  { name: "PDF to PDF/A", href: "/pdf-to-pdfa", icon: CheckCircle2, description: "Standard for long-term archiving", color: "text-slate-600", bg: "bg-slate-50" },
];

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [convertedFile, setConvertedFile] = useState<{ fileName: string; downloadUrl: string } | null>(null);
  const [targetFormat, setTargetFormat] = useState("pdf");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setConvertedFile(null);
    }
  };

  const handleConvert = async () => {
    if (!file) return;

    setIsConverting(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("targetFormat", targetFormat);

    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setConvertedFile(data);
      } else {
        alert("Conversion failed");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred");
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-indigo-100 selection:text-indigo-600">
      {/* Premium Background */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        {/* Subtle Dots Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] [background-size:32px_32px] opacity-40"></div>

        {/* Soft Glows */}
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-50 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-50/80 rounded-full blur-[100px]" />

        {/* Radial Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,white_100%)]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-32 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-sm font-bold text-indigo-600 mb-8"
          >
            <Zap size={16} fill="currentColor" />
            <span>Powering your document workflow</span>
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 text-zinc-900 leading-tight">
            Universal <span className="text-indigo-600">Converter</span>
          </h1>
          <p className="text-zinc-500 text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed">
            The professional suite for all your file conversion needs.
            Secure, fast, and completely free to use.
          </p>
        </motion.div>

        {/* Quick Convert Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-2xl mx-auto mb-24"
        >
          <div className="relative group p-1 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-3xl shadow-xl shadow-indigo-100/50">
            <div className="bg-white rounded-[1.4rem] overflow-hidden">
              {!file ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-12 text-center cursor-pointer transition-all min-h-[220px] flex flex-col items-center justify-center group/upload hover:bg-zinc-50"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-200 group-hover/upload:scale-110 transition-transform">
                    <Upload className="text-white" size={28} />
                  </div>
                  <h3 className="text-2xl font-black text-zinc-900 mb-2">Start Converting</h3>
                  <p className="text-zinc-500 font-medium">Click to select or drag and drop any file</p>
                </div>
              ) : (
                <div className="p-8">
                  <div className="flex items-center gap-4 p-5 bg-zinc-50 rounded-2xl border border-zinc-100 mb-8 transition-all hover:border-indigo-200">
                    <div className="w-12 h-12 bg-indigo-100 flex items-center justify-center rounded-xl">
                      <FileText className="text-indigo-600" size={24} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-bold text-zinc-900 truncate">{file.name}</p>
                      <p className="text-sm font-semibold text-zinc-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="px-4 py-2 text-sm font-bold text-zinc-400 hover:text-zinc-900 transition-colors"
                    >
                      Change
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex-1 w-full relative">
                      <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">Convert to</label>
                      <select
                        value={targetFormat}
                        onChange={(e) => setTargetFormat(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-indigo-600/20 text-zinc-900 font-bold cursor-pointer hover:border-indigo-200 transition-all appearance-none"
                      >
                        <option value="pdf">PDF</option>
                        <option value="jpg">JPG</option>
                        <option value="png">PNG</option>
                        <option value="webp">WebP</option>
                        <option value="docx">DOCX</option>
                      </select>
                      <div className="absolute right-5 bottom-4 pointer-events-none text-zinc-400">
                        <ArrowRight size={18} className="rotate-90" />
                      </div>
                    </div>

                    <div className="w-full sm:w-auto mt-6 sm:mt-7">
                      <button
                        onClick={handleConvert}
                        disabled={isConverting}
                        className="w-full sm:w-auto bg-indigo-600 text-white px-10 py-4 rounded-xl font-black hover:bg-indigo-700 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl shadow-indigo-200"
                      >
                        {isConverting ? (
                          <>
                            <Loader2 className="animate-spin" size={20} />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <span>Convert</span>
                            <ArrowRight size={20} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <AnimatePresence>
                {convertedFile && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-zinc-100 bg-emerald-50/30"
                  >
                    <div className="p-8">
                      <div className="bg-white border border-emerald-100 p-5 rounded-2xl flex items-center gap-5 shadow-sm">
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="text-emerald-600" size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-emerald-600">Successfully Converted!</p>
                          <p className="text-sm font-semibold text-zinc-500 truncate">{convertedFile.fileName}</p>
                        </div>
                        <a
                          href={convertedFile.downloadUrl}
                          className="text-sm font-black bg-emerald-600 px-6 py-3 rounded-xl text-white hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex-shrink-0"
                        >
                          Download
                        </a>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Tools Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-black text-zinc-900 lg:text-4xl">Popular Tools</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  href={tool.href}
                  key={tool.name}
                  className="group relative bg-white border border-zinc-100 hover:border-indigo-200 rounded-[2rem] p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-100/50 hover:-translate-y-1.5"
                >
                  <div className={`w-14 h-14 ${tool.bg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300`}>
                    <Icon className={tool.color} size={28} />
                  </div>

                  <h3 className="text-xl font-black text-zinc-900 mb-2 group-hover:text-indigo-600 transition-colors">{tool.name}</h3>
                  <p className="text-zinc-500 font-semibold text-sm leading-relaxed">
                    {tool.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
