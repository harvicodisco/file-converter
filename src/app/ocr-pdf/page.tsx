"use client";

import { useState, useRef, useEffect } from "react";
import { Scan, FileText, Plus, Check, Search, X } from "lucide-react";
import ConversionLayout from "@/components/ConversionLayout";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";
import PreviewContent from "@/components/PreviewContent";
import { motion, AnimatePresence } from "framer-motion";
import { PDFDocument, rgb } from "pdf-lib";
// @ts-ignore - tesseract.js doesn't have complete type definitions
import { createWorker } from "tesseract.js";

// Common languages for OCR
const languages = [
    { code: "eng", name: "English" },
    { code: "spa", name: "Spanish" },
    { code: "fra", name: "French" },
    { code: "deu", name: "German" },
    { code: "ita", name: "Italian" },
    { code: "por", name: "Portuguese" },
    { code: "rus", name: "Russian" },
    { code: "chi_sim", name: "Chinese (Simplified)" },
    { code: "chi_tra", name: "Chinese (Traditional)" },
    { code: "jpn", name: "Japanese" },
    { code: "kor", name: "Korean" },
    { code: "ara", name: "Arabic" },
    { code: "hin", name: "Hindi" },
    { code: "ben", name: "Bengali" },
    { code: "tel", name: "Telugu" },
    { code: "tam", name: "Tamil" },
    { code: "guj", name: "Gujarati" },
    { code: "kan", name: "Kannada" },
    { code: "mal", name: "Malayalam" },
    { code: "ori", name: "Odia" },
    { code: "pan", name: "Punjabi" },
    { code: "urd", name: "Urdu" },
    { code: "nld", name: "Dutch" },
    { code: "pol", name: "Polish" },
    { code: "tur", name: "Turkish" },
    { code: "vie", name: "Vietnamese" },
    { code: "tha", name: "Thai" },
    { code: "ind", name: "Indonesian" },
    { code: "jav", name: "Javanese" },
    { code: "kaz", name: "Kazakh" },
    { code: "kir", name: "Kirghiz; Kyrgyz" },
    { code: "ita_old", name: "Italian - Old" },
    { code: "ell", name: "Greek" },
    { code: "heb", name: "Hebrew" },
    { code: "fas", name: "Persian" },
    { code: "swe", name: "Swedish" },
    { code: "nor", name: "Norwegian" },
    { code: "dan", name: "Danish" },
    { code: "fin", name: "Finnish" },
    { code: "ces", name: "Czech" },
    { code: "ron", name: "Romanian" },
    { code: "hun", name: "Hungarian" },
    { code: "bul", name: "Bulgarian" },
    { code: "hrv", name: "Croatian" },
    { code: "srp", name: "Serbian" },
    { code: "slk", name: "Slovak" },
    { code: "slv", name: "Slovenian" },
    { code: "ukr", name: "Ukrainian" },
    { code: "bel", name: "Belarusian" },
];

export default function OCRPDF() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<{ fileName: string; downloadUrl: string } | null>(null);
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["eng"]); // Default to English
    const [searchQuery, setSearchQuery] = useState("");
    const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [progress, setProgress] = useState<{ page: number; total: number } | null>(null);
    const [ocrQuality, setOcrQuality] = useState<"fast" | "balanced" | "accurate">("balanced");
    const languageDropdownRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setResult(null);
            setProgress(null);
            setPreviewUrl(URL.createObjectURL(selectedFile));
        }
    };

    const filteredLanguages = languages.filter(lang =>
        lang.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleLanguage = (code: string) => {
        setSelectedLanguages(prev =>
            prev.includes(code)
                ? prev.filter(l => l !== code)
                : [...prev, code]
        );
    };

    const removeLanguage = (code: string) => {
        setSelectedLanguages(prev => prev.filter(l => l !== code));
    };

    const handleOCR = async () => {
        if (!file || selectedLanguages.length === 0) return;

        setIsProcessing(true);
        setProgress(null);
        let worker: any = null;

        try {
            // Initialize Tesseract worker
            worker = await createWorker();
            
            // Load languages (format: 'eng+spa+fra' for multiple languages)
            const langString = selectedLanguages.join('+');
            await worker.loadLanguage(langString);
            await worker.initialize(langString);
            
            // Set OCR parameters optimized for performance
            const qualitySettings = {
                fast: {
                    tessedit_pageseg_mode: '6', // Uniform block of text (faster)
                    tessedit_ocr_engine_mode: '1', // Neural nets LSTM engine only (faster)
                },
                balanced: {
                    tessedit_pageseg_mode: '1', // Automatic page segmentation
                    tessedit_ocr_engine_mode: '1', // Neural nets LSTM engine only
                },
                accurate: {
                    tessedit_pageseg_mode: '1', // Automatic page segmentation
                    tessedit_ocr_engine_mode: '0', // Legacy + LSTM engines (slower but more accurate)
                }
            };

            await worker.setParameters(qualitySettings[ocrQuality]);

            // Read file arrayBuffer and create copies for both libraries
            const arrayBuffer = await file.arrayBuffer();
            
            // Create copies to avoid ArrayBuffer detachment issues
            // pdfjs-dist may transfer the buffer to a worker, detaching it
            const arrayBufferForPdfJs = arrayBuffer.slice(0);
            const arrayBufferForPdfLib = arrayBuffer.slice(0);

            // Load PDF using pdfjs-dist
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

            const loadingTask = pdfjsLib.getDocument({ data: arrayBufferForPdfJs });
            const pdf = await loadingTask.promise;

            // Load original PDF with pdf-lib using separate copy
            const originalPdfDoc = await PDFDocument.load(arrayBufferForPdfLib);
            
            // Create new PDF document
            const newPdfDoc = await PDFDocument.create();

            const totalPages = pdf.numPages;
            setProgress({ page: 0, total: totalPages });

            // Process each page
            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                setProgress({ page: pageNum, total: totalPages });

                const page = await pdf.getPage(pageNum);
                // Adjust scale based on quality setting (lower scale = faster processing)
                const scale = ocrQuality === "fast" ? 1.2 : ocrQuality === "balanced" ? 1.5 : 2.0;
                const viewport = page.getViewport({ scale });

                // Render page to canvas (browser API)
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                if (!context) continue;

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({
                    canvasContext: context as any,
                    viewport: viewport,
                    canvas: canvas as any,
                }).promise;

                // Convert canvas to image data (JPEG is faster and smaller than PNG)
                const imageQuality = ocrQuality === "fast" ? 0.7 : 0.85;
                const imageData = canvas.toDataURL('image/jpeg', imageQuality);

                // Perform OCR
                const { data } = await worker.recognize(imageData);

                // Get original page and its dimensions
                const [originalPage] = await newPdfDoc.copyPages(originalPdfDoc, [pageNum - 1]);
                const { width, height } = originalPage.getSize();
                const pdfPage = newPdfDoc.addPage([width, height]);

                // Embed and draw the original page content
                const embeddedPage = await newPdfDoc.embedPage(originalPage);
                pdfPage.drawPage(embeddedPage);

                // Add OCR text as invisible/searchable text layer
                if (data.words && data.words.length > 0) {
                    const scaleX = width / viewport.width;
                    const scaleY = height / viewport.height;

                    // Filter words by confidence (skip low-confidence words for speed)
                    const minConfidence = ocrQuality === "fast" ? 30 : ocrQuality === "balanced" ? 20 : 0;
                    
                    for (const word of data.words) {
                        // Skip low-confidence words for faster processing
                        if (word.confidence !== undefined && word.confidence < minConfidence) continue;
                        if (!word.text || word.text.trim().length === 0) continue;

                        const bbox = word.bbox;
                        if (!bbox || bbox.x0 === undefined) continue;
                        
                        // Skip very small words (likely noise)
                        const wordArea = (bbox.x1 - bbox.x0) * (bbox.y1 - bbox.y0);
                        if (wordArea < 50) continue;

                        const x = bbox.x0 * scaleX;
                        const y = height - (bbox.y1 * scaleY); // Flip Y coordinate (PDF uses bottom-left origin)
                        const wordHeight = (bbox.y1 - bbox.y0) * scaleY;
                        const fontSize = Math.max(1, Math.min(wordHeight, height * 0.1)); // Reasonable font size

                        try {
                            // Add text with white color and very low opacity (invisible but searchable)
                            pdfPage.drawText(word.text, {
                                x: Math.max(0, Math.min(x, width)),
                                y: Math.max(0, Math.min(y, height)),
                                size: fontSize,
                                color: rgb(1, 1, 1), // White
                                opacity: 0.01, // Nearly invisible but still searchable
                            });
                        } catch (e) {
                            // Skip words that can't be drawn (outside bounds, encoding issues, etc.)
                            console.warn(`Skipping word "${word.text}":`, e);
                        }
                    }
                }
            }

            // Terminate worker
            await worker.terminate();
            worker = null;

            const pdfBytes = await newPdfDoc.save({
                useObjectStreams: false,
                addDefaultPage: false,
            });

            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
            const downloadUrl = URL.createObjectURL(blob);

            setResult({
                fileName: `ocr_${file.name}`,
                downloadUrl: downloadUrl,
            });
            setProgress(null);
        } catch (error) {
            console.error("OCR error:", error);
            alert("An error occurred during OCR processing: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            if (worker) {
                try {
                    await worker.terminate();
                } catch (e) {
                    // Ignore cleanup errors
                }
            }
            setIsProcessing(false);
            setProgress(null);
        }
    };

    const handleReset = () => {
        if (result?.downloadUrl) {
            URL.revokeObjectURL(result.downloadUrl);
        }
        setFile(null);
        setResult(null);
        setSelectedLanguages(["eng"]);
        setOcrQuality("balanced");
        setProgress(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
                setIsLanguageDropdownOpen(false);
            }
        };

        if (isLanguageDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [isLanguageDropdownOpen]);

    const SettingsPanel = (
        <div className="flex flex-col h-full">
            <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Selected Languages</span>
                    <span className="text-sm font-black text-blue-600 bg-white px-2 py-1 rounded-lg shadow-sm">{selectedLanguages.length}</span>
                </div>
                {selectedLanguages.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {selectedLanguages.map(code => {
                            const lang = languages.find(l => l.code === code);
                            return (
                                <div
                                    key={code}
                                    className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-blue-100 text-xs font-bold text-blue-600"
                                >
                                    <span>{lang?.name || code}</span>
                                    <button
                                        onClick={() => removeLanguage(code)}
                                        className="text-blue-400 hover:text-blue-600 transition-colors"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold bg-white p-2 rounded-xl border border-zinc-100 italic">
                        No languages selected
                    </div>
                )}
            </div>

            <div className="space-y-4 mb-6">
                {/* OCR Quality Selection */}
                <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">
                        OCR Quality
                    </label>
                    <div className="space-y-2">
                        {[
                            { value: "fast" as const, label: "Fast", desc: "Quick processing, lower accuracy" },
                            { value: "balanced" as const, label: "Balanced", desc: "Recommended: Good speed & accuracy" },
                            { value: "accurate" as const, label: "Accurate", desc: "Slower processing, highest accuracy" },
                        ].map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setOcrQuality(option.value)}
                                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                                    ocrQuality === option.value
                                        ? "border-blue-600 bg-blue-50"
                                        : "border-zinc-200 hover:border-blue-200"
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-black text-zinc-900">{option.label}</div>
                                        <div className="text-xs font-semibold text-zinc-500 mt-0.5">{option.desc}</div>
                                    </div>
                                    {ocrQuality === option.value && (
                                        <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                                            <Check size={12} className="text-white" />
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                    <p className="text-xs font-bold text-blue-700 leading-relaxed">
                        The accuracy of detection is increased by correctly selecting the document's languages.
                    </p>
                </div>

                {/* Language Selection */}
                <div className="relative" ref={languageDropdownRef}>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">
                        Document languages
                    </label>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                            className="w-full bg-zinc-50 border-2 border-zinc-200 rounded-xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-300 text-zinc-900 font-bold transition-all text-left flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <Search className="absolute left-4 text-zinc-400" size={18} />
                                <span className={selectedLanguages.length > 0 ? "text-zinc-900" : "text-zinc-400"}>
                                    {selectedLanguages.length > 0
                                        ? `${selectedLanguages.length} language${selectedLanguages.length > 1 ? "s" : ""} selected`
                                        : "Search languages"}
                                </span>
                            </div>
                        </button>

                        <AnimatePresence>
                            {isLanguageDropdownOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute z-50 w-full mt-2 bg-white border-2 border-zinc-200 rounded-xl shadow-xl overflow-hidden"
                                >
                                    {/* Search Input */}
                                    <div className="p-3 border-b border-zinc-100">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                                            <input
                                                type="text"
                                                placeholder="Search"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-10 pr-4 py-2.5 text-sm font-bold text-zinc-900 placeholder:text-zinc-300 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-300"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    </div>

                                    {/* Language List */}
                                    <div className="max-h-[300px] overflow-y-auto">
                                        {filteredLanguages.length > 0 ? (
                                            filteredLanguages.map((lang) => {
                                                const isSelected = selectedLanguages.includes(lang.code);
                                                return (
                                                    <button
                                                        key={lang.code}
                                                        type="button"
                                                        onClick={() => toggleLanguage(lang.code)}
                                                        className={`w-full px-4 py-3 text-left hover:bg-zinc-50 transition-colors flex items-center gap-3 border-b border-zinc-100 last:border-b-0 ${
                                                            isSelected ? "bg-blue-50" : ""
                                                        }`}
                                                    >
                                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                                            isSelected
                                                                ? "border-blue-600 bg-blue-600"
                                                                : "border-zinc-300"
                                                        }`}>
                                                            {isSelected && <Check size={14} className="text-white" />}
                                                        </div>
                                                        <span className={`text-sm font-bold ${isSelected ? "text-blue-700" : "text-zinc-700"}`}>
                                                            {lang.name}
                                                        </span>
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <div className="px-4 py-8 text-center text-zinc-400 text-sm font-bold">
                                                No languages found
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Progress Indicator */}
            {progress && (
                <div className="mb-6 bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-blue-700">Processing page {progress.page} of {progress.total}</span>
                        <span className="text-xs font-bold text-blue-600">{Math.round((progress.page / progress.total) * 100)}%</span>
                    </div>
                    <div className="w-full bg-blue-100 rounded-full h-2">
                        <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(progress.page / progress.total) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            <div className="mt-auto">
                <ProcessingButton
                    onClick={handleOCR}
                    isProcessing={isProcessing}
                    disabled={!file || selectedLanguages.length === 0}
                    icon={Scan}
                    text="Perform OCR"
                    processingText={progress ? `Processing page ${progress.page}/${progress.total}...` : "Processing OCR..."}
                    bgColor="bg-blue-600"
                    className="shadow-blue-200"
                />
            </div>
        </div>
    );

    return (
        <ConversionLayout
            title="OCR PDF"
            description="Convert non-selectable PDF files into selectable and searchable PDF with high accuracy"
            settingsPanel={!result ? SettingsPanel : (
                <div className="h-full flex flex-col justify-center">
                    <DownloadResult
                        fileName={result?.fileName || ""}
                        downloadUrl={result?.downloadUrl || ""}
                        onReset={handleReset}
                        stats={[
                            { label: "Languages", value: selectedLanguages.length.toString() },
                            { label: "Status", value: "OCR Complete" }
                        ]}
                    />
                </div>
            )}
        >
            {result ? (
                <div className="w-full h-full max-w-4xl">
                    <PreviewContent url={result.downloadUrl} fileName={result.fileName} />
                </div>
            ) : file && previewUrl ? (
                <div className="w-full h-full max-w-5xl flex flex-col p-4">
                    <div className="mb-6 flex justify-between items-center">
                        <div>
                            <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                <FileText size={14} className="text-zinc-300" />
                                Document Preview
                            </h2>
                            <p className="text-xs text-zinc-500 font-bold">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
                        </div>
                        <label className="text-xs font-black text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl transition-all active:scale-95">
                            <Plus size={14} />
                            <span>Replace</span>
                            <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                        </label>
                    </div>

                    <div className="flex-1 min-h-[500px] bg-white rounded-3xl overflow-hidden border border-zinc-200 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] relative group">
                        <iframe
                            src={`${previewUrl}#toolbar=0`}
                            className="w-full h-full border-none"
                            title="Pre-OCR Preview"
                        />
                        <div className="absolute top-4 right-4 bg-zinc-900/80 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-full tracking-widest uppercase border border-white/10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                            Source Document
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center max-w-sm px-6">
                    <div className="w-24 h-24 bg-blue-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner group">
                        <Scan className="text-blue-400 group-hover:scale-110 transition-transform duration-500" size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 mb-3 tracking-tight">OCR PDF</h3>
                    <p className="text-zinc-500 font-medium text-sm mb-8 leading-relaxed">
                        Convert scanned or image-based PDFs into searchable and selectable text documents with OCR technology.
                    </p>
                    <label className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 cursor-pointer transition-all shadow-xl shadow-blue-200 active:scale-95 group">
                        <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span>Select PDF File</span>
                        <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" ref={fileInputRef} />
                    </label>
                </div>
            )}
        </ConversionLayout>
    );
}
