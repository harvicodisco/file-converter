"use client";

import { useState, useRef, useEffect } from "react";
import {
    Hash,
    Plus,
    FileText,
    Trash2,
    Bold,
    Italic,
    Underline,
    Type,
    ChevronDown
} from "lucide-react";
import ConversionLayout from "@/components/ConversionLayout";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";
import PreviewContent from "@/components/PreviewContent";
import { motion, AnimatePresence } from "framer-motion";

interface PageData {
    id: string;
    originalIndex: number;
    thumbnailUrl: string;
}

type PageMode = "single" | "facing";
type Position = "header-left" | "header-center" | "header-right" | "footer-left" | "footer-center" | "footer-right";
type Margin = "small" | "recommended" | "big";
type TextFormat = "number-only" | "page-n" | "page-n-of-p" | "custom";
type FontFamily = "Arial" | "Times" | "Courier" | "Helvetica";

export default function AddPageNumbers() {
    const [file, setFile] = useState<File | null>(null);
    const [pages, setPages] = useState<PageData[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoadingPages, setIsLoadingPages] = useState(false);
    const [result, setResult] = useState<{ fileName: string; downloadUrl: string } | null>(null);
    
    // Settings
    const [pageMode, setPageMode] = useState<PageMode>("single");
    const [firstPageIsCover, setFirstPageIsCover] = useState(false);
    const [position, setPosition] = useState<Position>("footer-right");
    const [margin, setMargin] = useState<Margin>("recommended");
    const [firstNumber, setFirstNumber] = useState(1);
    const [fromPage, setFromPage] = useState(1);
    const [toPage, setToPage] = useState(1);
    const [textFormat, setTextFormat] = useState<TextFormat>("number-only");
    const [customText, setCustomText] = useState("");
    const [fontFamily, setFontFamily] = useState<FontFamily>("Arial");
    const [fontSize, setFontSize] = useState(12);
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [textColor, setTextColor] = useState("#000000");
    
    // Dropdown states
    const [isPositionOpen, setIsPositionOpen] = useState(false);
    const [isMarginOpen, setIsMarginOpen] = useState(false);
    const [isTextFormatOpen, setIsTextFormatOpen] = useState(false);
    const [isFontOpen, setIsFontOpen] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const positionRef = useRef<HTMLDivElement>(null);
    const marginRef = useRef<HTMLDivElement>(null);
    const textFormatRef = useRef<HTMLDivElement>(null);
    const fontRef = useRef<HTMLDivElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.type === "application/pdf") {
            setFile(selectedFile);
            loadPDFPages(selectedFile);
        }
    };

    const loadPDFPages = async (pdfFile: File) => {
        setIsLoadingPages(true);
        setPages([]);
        try {
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

            const arrayBuffer = await pdfFile.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;

            const loadedPages: PageData[] = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 0.5 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');

                if (context) {
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    await page.render({
                        canvasContext: context as any,
                        viewport: viewport,
                        canvas: canvas as any
                    }).promise;

                    loadedPages.push({
                        id: `page-${i}-${Date.now()}`,
                        originalIndex: i - 1,
                        thumbnailUrl: canvas.toDataURL()
                    });
                }
            }

            setPages(loadedPages);
            setToPage(pdf.numPages);
        } catch (error) {
            console.error("Error loading PDF pages:", error);
            alert("Failed to load PDF pages");
        } finally {
            setIsLoadingPages(false);
        }
    };

    const handleAddPageNumbers = async () => {
        if (!file) return;

        setIsProcessing(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("pageMode", pageMode);
        formData.append("firstPageIsCover", firstPageIsCover.toString());
        formData.append("position", position);
        formData.append("margin", margin);
        formData.append("firstNumber", firstNumber.toString());
        formData.append("fromPage", fromPage.toString());
        formData.append("toPage", toPage.toString());
        formData.append("textFormat", textFormat);
        formData.append("customText", customText);
        formData.append("fontFamily", fontFamily);
        formData.append("fontSize", fontSize.toString());
        formData.append("isBold", isBold.toString());
        formData.append("isItalic", isItalic.toString());
        formData.append("isUnderline", isUnderline.toString());
        formData.append("textColor", textColor);

        try {
            const response = await fetch("/api/add-page-numbers", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                const blob = await response.blob();
                const downloadUrl = URL.createObjectURL(blob);

                setResult({
                    fileName: `numbered_${file.name}`,
                    downloadUrl: downloadUrl,
                });
            } else {
                const error = await response.json();
                alert(error.error || "Failed to add page numbers");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("An error occurred");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = () => {
        if (result?.downloadUrl) {
            URL.revokeObjectURL(result.downloadUrl);
        }
        setFile(null);
        setPages([]);
        setResult(null);
        setPageMode("single");
        setFirstPageIsCover(false);
        setPosition("footer-right");
        setMargin("recommended");
        setFirstNumber(1);
        setFromPage(1);
        setToPage(1);
        setTextFormat("number-only");
        setCustomText("");
        setFontFamily("Arial");
        setFontSize(12);
        setIsBold(false);
        setIsItalic(false);
        setIsUnderline(false);
        setTextColor("#000000");
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (positionRef.current && !positionRef.current.contains(event.target as Node)) {
                setIsPositionOpen(false);
            }
            if (marginRef.current && !marginRef.current.contains(event.target as Node)) {
                setIsMarginOpen(false);
            }
            if (textFormatRef.current && !textFormatRef.current.contains(event.target as Node)) {
                setIsTextFormatOpen(false);
            }
            if (fontRef.current && !fontRef.current.contains(event.target as Node)) {
                setIsFontOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const positionOptions = [
        { value: "header-left" as Position, label: "Header left" },
        { value: "header-center" as Position, label: "Header center" },
        { value: "header-right" as Position, label: "Header right" },
        { value: "footer-left" as Position, label: "Footer left" },
        { value: "footer-center" as Position, label: "Footer center" },
        { value: "footer-right" as Position, label: "Footer right" },
    ];

    const formatPageNumber = (pageNum: number, totalPages: number): string => {
        switch (textFormat) {
            case "number-only":
                return pageNum.toString();
            case "page-n":
                return `Page ${pageNum}`;
            case "page-n-of-p":
                return `Page ${pageNum} of ${totalPages}`;
            case "custom":
                return customText.replace(/{n}/g, pageNum.toString()).replace(/{p}/g, totalPages.toString());
            default:
                return pageNum.toString();
        }
    };

    const SettingsPanel = (
        <div className="flex flex-col h-full">
            <div className="space-y-6 mb-6">
                {/* Page Mode */}
                <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">
                        Page mode
                    </label>
                    <div className="space-y-2">
                        <button
                            type="button"
                            onClick={() => setPageMode("single")}
                            className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                                pageMode === "single"
                                    ? "border-blue-600 bg-blue-50"
                                    : "border-zinc-200 hover:border-blue-200"
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-zinc-900">Single page</span>
                                {pageMode === "single" && (
                                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-white" />
                                    </div>
                                )}
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setPageMode("facing")}
                            className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                                pageMode === "facing"
                                    ? "border-blue-600 bg-blue-50"
                                    : "border-zinc-200 hover:border-blue-200"
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-zinc-900">Facing pages</span>
                                {pageMode === "facing" && (
                                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-white" />
                                    </div>
                                )}
                            </div>
                        </button>
                    </div>
                </div>

                {/* First Page is Cover Page */}
                <div>
                    <label className="flex items-center gap-3 px-4 py-3 bg-zinc-50 border-2 border-zinc-200 rounded-xl cursor-pointer hover:border-blue-200 transition-all">
                        <input
                            type="checkbox"
                            checked={firstPageIsCover}
                            onChange={(e) => setFirstPageIsCover(e.target.checked)}
                            className="w-5 h-5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-bold text-zinc-900">First page is cover page</span>
                    </label>
                </div>

                {/* Position */}
                <div className="relative" ref={positionRef}>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">
                        Location on page
                    </label>
                    <button
                        type="button"
                        onClick={() => setIsPositionOpen(!isPositionOpen)}
                        className="w-full bg-zinc-50 border-2 border-zinc-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-300 text-zinc-900 font-bold transition-all text-left flex items-center justify-between"
                    >
                        <span>{positionOptions.find(opt => opt.value === position)?.label || "Footer right"}</span>
                        <ChevronDown className={`text-zinc-400 transition-transform ${isPositionOpen ? "rotate-180" : ""}`} size={18} />
                    </button>
                    <AnimatePresence>
                        {isPositionOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute z-50 w-full mt-2 bg-white border-2 border-zinc-200 rounded-xl shadow-xl overflow-hidden"
                            >
                                {positionOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => {
                                            setPosition(option.value);
                                            setIsPositionOpen(false);
                                        }}
                                        className={`w-full px-4 py-3 text-left hover:bg-zinc-50 transition-colors flex items-center justify-between ${
                                            position === option.value ? "bg-blue-50" : ""
                                        }`}
                                    >
                                        <span className="text-sm font-bold text-zinc-700">{option.label}</span>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Margin */}
                <div className="relative" ref={marginRef}>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">
                        Margin
                    </label>
                    <button
                        type="button"
                        onClick={() => setIsMarginOpen(!isMarginOpen)}
                        className="w-full bg-zinc-50 border-2 border-zinc-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-300 text-zinc-900 font-bold transition-all text-left flex items-center justify-between"
                    >
                        <span className="capitalize">{margin === "recommended" ? "Recommended" : margin}</span>
                        <ChevronDown className={`text-zinc-400 transition-transform ${isMarginOpen ? "rotate-180" : ""}`} size={18} />
                    </button>
                    <AnimatePresence>
                        {isMarginOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute z-50 w-full mt-2 bg-white border-2 border-zinc-200 rounded-xl shadow-xl overflow-hidden"
                            >
                                {(["small", "recommended", "big"] as Margin[]).map((m) => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => {
                                            setMargin(m);
                                            setIsMarginOpen(false);
                                        }}
                                        className={`w-full px-4 py-3 text-left hover:bg-zinc-50 transition-colors flex items-center justify-between ${
                                            margin === m ? "bg-blue-50" : ""
                                        }`}
                                    >
                                        <span className="text-sm font-bold text-zinc-700 capitalize">
                                            {m === "recommended" ? "Recommended" : m}
                                        </span>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Pages */}
                <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">
                        Pages
                    </label>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold text-zinc-700 mb-1.5 block">First number:</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    value={firstNumber}
                                    onChange={(e) => setFirstNumber(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="flex-1 bg-zinc-50 border-2 border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-300"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-700 mb-1.5 block">Which pages do you want to number?</label>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-zinc-500">from page</span>
                                <input
                                    type="number"
                                    min="1"
                                    max={pages.length}
                                    value={fromPage}
                                    onChange={(e) => {
                                        const val = Math.max(1, Math.min(pages.length, parseInt(e.target.value) || 1));
                                        setFromPage(val);
                                        if (val > toPage) setToPage(val);
                                    }}
                                    className="flex-1 bg-zinc-50 border-2 border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-300"
                                />
                                <span className="text-xs font-semibold text-zinc-500">to</span>
                                <input
                                    type="number"
                                    min={fromPage}
                                    max={pages.length}
                                    value={toPage}
                                    onChange={(e) => {
                                        const val = Math.max(fromPage, Math.min(pages.length, parseInt(e.target.value) || fromPage));
                                        setToPage(val);
                                    }}
                                    className="flex-1 bg-zinc-50 border-2 border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-300"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Text */}
                <div className="relative" ref={textFormatRef}>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">
                        Text
                    </label>
                    <button
                        type="button"
                        onClick={() => setIsTextFormatOpen(!isTextFormatOpen)}
                        className="w-full bg-zinc-50 border-2 border-zinc-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-300 text-zinc-900 font-bold transition-all text-left flex items-center justify-between"
                    >
                        <span>
                            {textFormat === "number-only" && "Insert only page number (recommended)"}
                            {textFormat === "page-n" && "Page {n}"}
                            {textFormat === "page-n-of-p" && "Page {n} of {p}"}
                            {textFormat === "custom" && "Custom"}
                        </span>
                        <ChevronDown className={`text-zinc-400 transition-transform ${isTextFormatOpen ? "rotate-180" : ""}`} size={18} />
                    </button>
                    <AnimatePresence>
                        {isTextFormatOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute z-50 w-full mt-2 bg-white border-2 border-zinc-200 rounded-xl shadow-xl overflow-hidden"
                            >
                                {[
                                    { value: "number-only" as TextFormat, label: "Insert only page number (recommended)" },
                                    { value: "page-n" as TextFormat, label: "Page {n}" },
                                    { value: "page-n-of-p" as TextFormat, label: "Page {n} of {p}" },
                                    { value: "custom" as TextFormat, label: "Custom" },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => {
                                            setTextFormat(option.value);
                                            setIsTextFormatOpen(false);
                                        }}
                                        className={`w-full px-4 py-3 text-left hover:bg-zinc-50 transition-colors flex items-center justify-between ${
                                            textFormat === option.value ? "bg-blue-50" : ""
                                        }`}
                                    >
                                        <span className="text-sm font-bold text-zinc-700">{option.label}</span>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {textFormat === "custom" && (
                    <div>
                        <label className="text-xs font-bold text-zinc-700 mb-1.5 block">Custom text (use {`{n}`} for page number, {`{p}`} for total pages):</label>
                        <input
                            type="text"
                            value={customText}
                            onChange={(e) => setCustomText(e.target.value)}
                            placeholder="e.g., Page {n} of {p}"
                            className="w-full bg-zinc-50 border-2 border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-300"
                        />
                    </div>
                )}

                {/* Text Format */}
                <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">
                        Text format
                    </label>
                    <div className="space-y-3">
                        {/* Font Family */}
                        <div className="relative" ref={fontRef}>
                            <button
                                type="button"
                                onClick={() => setIsFontOpen(!isFontOpen)}
                                className="w-full bg-zinc-50 border-2 border-zinc-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-300 text-zinc-900 font-bold transition-all text-left flex items-center justify-between"
                            >
                                <span>{fontFamily}</span>
                                <ChevronDown className={`text-zinc-400 transition-transform ${isFontOpen ? "rotate-180" : ""}`} size={18} />
                            </button>
                            <AnimatePresence>
                                {isFontOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="absolute z-50 w-full mt-2 bg-white border-2 border-zinc-200 rounded-xl shadow-xl overflow-hidden"
                                    >
                                        {(["Arial", "Times", "Courier", "Helvetica"] as FontFamily[]).map((font) => (
                                            <button
                                                key={font}
                                                type="button"
                                                onClick={() => {
                                                    setFontFamily(font);
                                                    setIsFontOpen(false);
                                                }}
                                                className={`w-full px-4 py-3 text-left hover:bg-zinc-50 transition-colors flex items-center justify-between ${
                                                    fontFamily === font ? "bg-blue-50" : ""
                                                }`}
                                            >
                                                <span className="text-sm font-bold text-zinc-700">{font}</span>
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Size and Style */}
                        <div className="flex items-center gap-2">
                            <div className="flex-1 flex items-center gap-2 bg-zinc-50 border-2 border-zinc-200 rounded-xl px-3 py-2">
                                <Type size={16} className="text-zinc-400" />
                                <input
                                    type="number"
                                    min="8"
                                    max="72"
                                    value={fontSize}
                                    onChange={(e) => setFontSize(Math.max(8, Math.min(72, parseInt(e.target.value) || 12)))}
                                    className="flex-1 bg-transparent text-sm font-bold text-zinc-900 outline-none"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsBold(!isBold)}
                                className={`p-2.5 rounded-xl border-2 transition-all ${
                                    isBold
                                        ? "border-blue-600 bg-blue-50 text-blue-600"
                                        : "border-zinc-200 hover:border-blue-200 text-zinc-400"
                                }`}
                            >
                                <Bold size={18} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsItalic(!isItalic)}
                                className={`p-2.5 rounded-xl border-2 transition-all ${
                                    isItalic
                                        ? "border-blue-600 bg-blue-50 text-blue-600"
                                        : "border-zinc-200 hover:border-blue-200 text-zinc-400"
                                }`}
                            >
                                <Italic size={18} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsUnderline(!isUnderline)}
                                className={`p-2.5 rounded-xl border-2 transition-all ${
                                    isUnderline
                                        ? "border-blue-600 bg-blue-50 text-blue-600"
                                        : "border-zinc-200 hover:border-blue-200 text-zinc-400"
                                }`}
                            >
                                <Underline size={18} />
                            </button>
                            <div className="relative">
                                <input
                                    type="color"
                                    value={textColor}
                                    onChange={(e) => setTextColor(e.target.value)}
                                    className="w-10 h-10 rounded-xl border-2 border-zinc-200 cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-auto">
                <ProcessingButton
                    onClick={handleAddPageNumbers}
                    isProcessing={isProcessing}
                    disabled={!file || pages.length === 0}
                    icon={Hash}
                    text="Add Page Numbers"
                    processingText="Adding page numbers..."
                    bgColor="bg-blue-600"
                    className="shadow-blue-200"
                />
            </div>
        </div>
    );

    return (
        <ConversionLayout
            title="Add PDF page numbers"
            description="Add page numbers into PDFs with ease. Choose your positions, dimensions, typography."
            settingsPanel={!result ? SettingsPanel : (
                <div className="h-full flex flex-col justify-center">
                    <DownloadResult
                        fileName={result?.fileName || ""}
                        downloadUrl={result?.downloadUrl || ""}
                        onReset={handleReset}
                        stats={[
                            { label: "Pages", value: pages.length.toString() },
                            { label: "Status", value: "Page Numbers Added" }
                        ]}
                    />
                </div>
            )}
        >
            {result ? (
                <div className="w-full h-full max-w-4xl">
                    <PreviewContent url={result.downloadUrl} fileName={result.fileName} />
                </div>
            ) : file && pages.length > 0 ? (
                <div className="w-full h-full flex flex-col p-4">
                    <div className="mb-6 flex justify-between items-center">
                        <div>
                            <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                <FileText size={14} className="text-zinc-300" />
                                Document Preview
                            </h2>
                            <p className="text-xs text-zinc-500 font-bold">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-black text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl transition-all active:scale-95">
                                <Plus size={14} />
                                <span>Replace</span>
                                <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                            </label>
                            <button
                                onClick={handleReset}
                                className="text-xs font-black text-red-600 hover:text-red-700 flex items-center gap-2 bg-red-50 px-4 py-2 rounded-xl transition-all active:scale-95"
                            >
                                <Trash2 size={14} />
                                <span>Clear</span>
                            </button>
                        </div>
                    </div>

                    {isLoadingPages ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-sm font-bold text-zinc-500">Loading pages...</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {pages.map((page, idx) => (
                                    <div
                                        key={page.id}
                                        className="relative aspect-[1/1.414] bg-white rounded-2xl border-2 border-zinc-100 shadow-sm overflow-hidden"
                                    >
                                        <img
                                            src={page.thumbnailUrl}
                                            alt={`Page ${idx + 1}`}
                                            className="w-full h-full object-contain"
                                        />
                                        <div className="absolute bottom-1 left-1 bg-zinc-900/80 text-white text-[10px] font-black px-1.5 py-0.5 rounded">
                                            {idx + 1}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center max-w-sm px-6">
                    <div className="w-24 h-24 bg-blue-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner group">
                        <Hash className="text-blue-400 group-hover:scale-110 transition-transform duration-500" size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 mb-3 tracking-tight">Add PDF Page Numbers</h3>
                    <p className="text-zinc-500 font-medium text-sm mb-8 leading-relaxed">
                        Add professional page numbers to your PDF documents with customizable positions, styles, and formats.
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

