"use client";

import { useState, useRef } from "react";
import {
    RotateCw,
    RotateCcw,
    Plus,
    FileText,
    Check,
    X,
    Undo2,
    Redo2,
    RefreshCw
} from "lucide-react";
import ConversionLayout from "@/components/ConversionLayout";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";
import PreviewContent from "@/components/PreviewContent";
import { motion, AnimatePresence } from "framer-motion";
import { PDFDocument, degrees } from 'pdf-lib';

interface PageData {
    id: string;
    fileIndex: number;
    fileName: string;
    pageIndex: number;
    rotation: number;
    thumbnailUrl: string;
    selected: boolean;
}

interface RotationHistory {
    pages: PageData[];
}

export default function RotatePDF() {
    const [files, setFiles] = useState<File[]>([]);
    const [pages, setPages] = useState<PageData[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoadingPages, setIsLoadingPages] = useState(false);
    const [result, setResult] = useState<{ fileName: string; downloadUrl: string } | null>(null);
    const [rotationMode, setRotationMode] = useState<"all" | "selected">("all");
    const [rotationAngle, setRotationAngle] = useState<90 | 180 | 270>(90);
    const [rotationDirection, setRotationDirection] = useState<"clockwise" | "counterclockwise">("clockwise");
    const [history, setHistory] = useState<RotationHistory[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const MAX_FILES = 50;

    const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files).slice(0, MAX_FILES - files.length);
            if (files.length + newFiles.length > MAX_FILES) {
                alert(`Maximum ${MAX_FILES} files allowed. Only the first ${MAX_FILES - files.length} files will be added.`);
            }
            setFiles(prev => [...prev, ...newFiles]);
            await loadPDFPages(newFiles, files.length);
        }
    };

    const loadPDFPages = async (pdfFiles: File[], startFileIndex: number) => {
        setIsLoadingPages(true);
        try {
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

            const newPages: PageData[] = [];

            for (let fileIdx = 0; fileIdx < pdfFiles.length; fileIdx++) {
                const file = pdfFiles[fileIdx];
                const fileIndex = startFileIndex + fileIdx;
                const arrayBuffer = await file.arrayBuffer();
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;

                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    const viewport = page.getViewport({ scale: 0.3 });
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

                        newPages.push({
                            id: `file-${fileIndex}-page-${pageNum}-${Date.now()}`,
                            fileIndex: fileIndex,
                            fileName: file.name,
                            pageIndex: pageNum - 1,
                            rotation: 0,
                            thumbnailUrl: canvas.toDataURL(),
                            selected: false,
                        });
                    }
                }
            }

            setPages(prev => [...prev, ...newPages]);
            saveToHistory([...pages, ...newPages]);
        } catch (error) {
            console.error("Error loading PDF pages:", error);
            alert("Failed to load PDF pages");
        } finally {
            setIsLoadingPages(false);
        }
    };

    const saveToHistory = (pagesToSave: PageData[]) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push({ pages: pagesToSave.map(p => ({ ...p })) });
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const undo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setPages(history[newIndex].pages.map(p => ({ ...p })));
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setPages(history[newIndex].pages.map(p => ({ ...p })));
        }
    };

    const togglePageSelection = (id: string) => {
        setPages(prev => prev.map(p => 
            p.id === id ? { ...p, selected: !p.selected } : p
        ));
    };

    const selectAll = () => {
        setPages(prev => prev.map(p => ({ ...p, selected: true })));
    };

    const deselectAll = () => {
        setPages(prev => prev.map(p => ({ ...p, selected: false })));
    };

    const rotatePages = () => {
        const angle = rotationDirection === "clockwise" ? rotationAngle : -rotationAngle;
        const pagesToRotate = rotationMode === "all" 
            ? pages 
            : pages.filter(p => p.selected);

        if (pagesToRotate.length === 0) {
            alert("No pages selected. Please select pages or choose 'Rotate All Pages'.");
            return;
        }

        const updatedPages = pages.map(p => {
            if (rotationMode === "all" || p.selected) {
                return { ...p, rotation: (p.rotation + angle + 360) % 360 };
            }
            return p;
        });

        setPages(updatedPages);
        saveToHistory(updatedPages);
    };

    const rotatePage = (id: string, angle: number) => {
        const updatedPages = pages.map(p => 
            p.id === id ? { ...p, rotation: (p.rotation + angle + 360) % 360 } : p
        );
        setPages(updatedPages);
        saveToHistory(updatedPages);
    };

    const removeFile = (fileIndex: number) => {
        const updatedFiles = files.filter((_, i) => i !== fileIndex);
        const updatedPages = pages.filter(p => p.fileIndex !== fileIndex);
        setFiles(updatedFiles);
        setPages(updatedPages);
        saveToHistory(updatedPages);
    };

    const handleRotate = async () => {
        if (files.length === 0 || pages.length === 0) return;

        setIsProcessing(true);
        try {
            const { PDFDocument } = await import('pdf-lib');
            const mergedDoc = await PDFDocument.create();

            // Group pages by file
            const pagesByFile: { [key: number]: PageData[] } = {};
            pages.forEach(page => {
                if (!pagesByFile[page.fileIndex]) {
                    pagesByFile[page.fileIndex] = [];
                }
                pagesByFile[page.fileIndex].push(page);
            });

            // Process each file
            for (const fileIndex in pagesByFile) {
                const filePages = pagesByFile[fileIndex].sort((a, b) => a.pageIndex - b.pageIndex);
                const file = files[parseInt(fileIndex)];
                const arrayBuffer = await file.arrayBuffer();
                const sourceDoc = await PDFDocument.load(arrayBuffer);

                for (const pageInfo of filePages) {
                    // Get original page to check its rotation
                    const originalPage = sourceDoc.getPage(pageInfo.pageIndex);
                    const originalRotation = originalPage.getRotation().angle;
                    
                    const [copiedPage] = await mergedDoc.copyPages(sourceDoc, [pageInfo.pageIndex]);
                    
                    // Apply rotation: original rotation + our applied rotation
                    const totalRotation = (originalRotation + pageInfo.rotation) % 360;
                    copiedPage.setRotation(degrees(totalRotation));

                    mergedDoc.addPage(copiedPage);
                }
            }

            const pdfBytes = await mergedDoc.save({
                useObjectStreams: false,
                addDefaultPage: false,
                updateFieldAppearances: false,
            });

            const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);

            setResult({
                fileName: files.length === 1 
                    ? `rotated_${files[0].name}` 
                    : `rotated_merged_${files.length}_files.pdf`,
                downloadUrl: url,
            });
        } catch (error) {
            console.error("Rotation error:", error);
            alert("An error occurred during rotation");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = () => {
        setFiles([]);
        setPages([]);
        setResult(null);
        setHistory([]);
        setHistoryIndex(-1);
        setRotationMode("all");
        setRotationAngle(90);
        setRotationDirection("clockwise");
    };

    const selectedCount = pages.filter(p => p.selected).length;

    const SettingsPanel = (
        <div className="flex flex-col h-full">
            <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Files & Pages</span>
                    <span className="text-sm font-black text-blue-600 bg-white px-2 py-1 rounded-lg shadow-sm">
                        {files.length} file{files.length !== 1 ? 's' : ''} • {pages.length} page{pages.length !== 1 ? 's' : ''}
                    </span>
                </div>
                {pages.length > 0 && (
                    <div className="flex items-center gap-2 text-blue-600 text-xs font-bold bg-white p-2 rounded-xl border border-blue-100 shadow-sm">
                        <Check size={14} className="text-blue-500" />
                        {selectedCount > 0 ? `${selectedCount} page${selectedCount !== 1 ? 's' : ''} selected` : 'All pages ready'}
                    </div>
                )}
            </div>

            {files.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm mb-6">
                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Rotation Mode</h3>
                    <div className="space-y-2">
                        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                            <input
                                type="radio"
                                name="rotationMode"
                                checked={rotationMode === "all"}
                                onChange={() => setRotationMode("all")}
                                className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-xs font-bold text-zinc-700">Rotate All Pages</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                            <input
                                type="radio"
                                name="rotationMode"
                                checked={rotationMode === "selected"}
                                onChange={() => setRotationMode("selected")}
                                className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-xs font-bold text-zinc-700">Rotate Selected Pages</span>
                        </label>
                    </div>
                </div>
            )}

            {files.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm mb-6">
                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Rotation Angle</h3>
                    <div className="grid grid-cols-3 gap-2">
                        {[90, 180, 270].map(angle => (
                            <button
                                key={angle}
                                onClick={() => setRotationAngle(angle as 90 | 180 | 270)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                                    rotationAngle === angle
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-slate-100 text-zinc-700 hover:bg-slate-200'
                                }`}
                            >
                                {angle}°
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {files.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm mb-6">
                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Direction</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setRotationDirection("clockwise")}
                            className={`px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                rotationDirection === "clockwise"
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-slate-100 text-zinc-700 hover:bg-slate-200'
                            }`}
                        >
                            <RotateCw size={16} />
                            Clockwise
                        </button>
                        <button
                            onClick={() => setRotationDirection("counterclockwise")}
                            className={`px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                rotationDirection === "counterclockwise"
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-slate-100 text-zinc-700 hover:bg-slate-200'
                            }`}
                        >
                            <RotateCcw size={16} />
                            Counter-clockwise
                        </button>
                    </div>
                </div>
            )}

            {files.length > 0 && pages.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm mb-6">
                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Quick Actions</h3>
                    <button
                        onClick={rotatePages}
                        className="w-full mb-3 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        <RotateCw size={16} />
                        Rotate {rotationMode === "all" ? "All Pages" : "Selected Pages"} {rotationDirection === "clockwise" ? "→" : "←"} {rotationAngle}°
                    </button>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <button
                            onClick={selectAll}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-zinc-700 text-xs font-bold rounded-xl transition-colors"
                        >
                            Select All
                        </button>
                        <button
                            onClick={deselectAll}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-zinc-700 text-xs font-bold rounded-xl transition-colors"
                        >
                            Deselect All
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={undo}
                            disabled={historyIndex <= 0}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            <Undo2 size={14} />
                            Undo
                        </button>
                        <button
                            onClick={redo}
                            disabled={historyIndex >= history.length - 1}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            <Redo2 size={14} />
                            Redo
                        </button>
                    </div>
                </div>
            )}

            {files.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm mb-6 max-h-[200px] overflow-y-auto">
                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Uploaded Files</h3>
                    <div className="space-y-2">
                        {files.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <FileText size={14} className="text-zinc-400 flex-shrink-0" />
                                    <span className="text-xs font-bold text-zinc-700 truncate" title={file.name}>
                                        {file.name}
                                    </span>
                                </div>
                                <button
                                    onClick={() => removeFile(index)}
                                    className="text-red-500 hover:text-red-600 transition-colors flex-shrink-0 ml-2"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-auto">
                <ProcessingButton
                    onClick={handleRotate}
                    isProcessing={isProcessing}
                    disabled={files.length === 0 || pages.length === 0}
                    icon={RotateCw}
                    text="Apply Rotation"
                    processingText="Rotating..."
                    bgColor="bg-blue-600"
                    className="shadow-blue-200"
                />
            </div>
        </div>
    );

    return (
        <ConversionLayout
            title="Rotate PDF"
            description="Rotate pages in your PDF documents clockwise or counterclockwise"
            settingsPanel={!result ? SettingsPanel : (
                <div className="h-full flex flex-col justify-center">
                    <DownloadResult
                        fileName={result.fileName}
                        downloadUrl={result.downloadUrl}
                        onReset={handleReset}
                        stats={[
                            { label: "Files", value: files.length.toString() },
                            { label: "Pages", value: pages.length.toString() },
                        ]}
                    />
                </div>
            )}
        >
            {result ? (
                <div className="w-full h-full max-w-4xl">
                    <PreviewContent url={result.downloadUrl} fileName={result.fileName} />
                </div>
            ) : pages.length > 0 ? (
                <div className="w-full h-full max-w-6xl flex flex-col p-4">
                    <div className="mb-6 flex justify-between items-center">
                        <div>
                            <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                <FileText size={14} className="text-zinc-300" />
                                Page Preview
                            </h2>
                            <p className="text-xs text-zinc-500 font-bold">
                                {pages.length} page{pages.length !== 1 ? 's' : ''} • Click to select • Use controls to rotate
                            </p>
                        </div>
                        <label className="text-xs font-black text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl transition-all active:scale-95">
                            <Plus size={14} />
                            <span>Add PDFs</span>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf"
                                multiple
                                onChange={handleFilesChange}
                                className="hidden"
                            />
                        </label>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {pages.map((page) => (
                                <motion.div
                                    key={page.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={`relative bg-white rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${
                                        page.selected 
                                            ? 'border-blue-600 shadow-lg shadow-blue-100' 
                                            : 'border-zinc-200 hover:border-zinc-300'
                                    }`}
                                    onClick={() => togglePageSelection(page.id)}
                                >
                                    <div className="aspect-[3/4] bg-slate-50 flex items-center justify-center relative">
                                        <img
                                            src={page.thumbnailUrl}
                                            alt={`Page ${page.pageIndex + 1}`}
                                            className="max-w-full max-h-full object-contain"
                                            style={{
                                                transform: `rotate(${page.rotation}deg)`,
                                                transition: 'transform 0.3s ease'
                                            }}
                                        />
                                        {page.selected && (
                                            <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                                <Check size={14} className="text-white" />
                                            </div>
                                        )}
                                        {page.rotation !== 0 && (
                                            <div className="absolute top-2 left-2 bg-zinc-900/80 text-white text-[9px] font-black px-2 py-1 rounded">
                                                {page.rotation}°
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-2 border-t border-zinc-100">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-zinc-500 truncate flex-1" title={page.fileName}>
                                                {page.fileName}
                                            </span>
                                            <span className="text-[9px] font-black text-zinc-400 ml-1">
                                                P{page.pageIndex + 1}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 mt-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    rotatePage(page.id, -90);
                                                }}
                                                className="flex-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-zinc-700 rounded text-[9px] font-bold transition-colors flex items-center justify-center"
                                                title="Rotate counterclockwise"
                                            >
                                                <RotateCcw size={10} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    rotatePage(page.id, 90);
                                                }}
                                                className="flex-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-zinc-700 rounded text-[9px] font-bold transition-colors flex items-center justify-center"
                                                title="Rotate clockwise"
                                            >
                                                <RotateCw size={10} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center max-w-sm px-6">
                    <div className="w-24 h-24 bg-blue-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner group">
                        <RotateCw className="text-blue-400 group-hover:rotate-180 transition-transform duration-500" size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 mb-3 tracking-tight">Rotate PDF</h3>
                    <p className="text-zinc-500 font-medium text-sm mb-8 leading-relaxed">
                        Rotate pages in your PDF documents. Upload up to {MAX_FILES} PDFs and rotate all pages or selected pages.
                    </p>
                    <label className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 cursor-pointer transition-all shadow-xl shadow-blue-200 active:scale-95 group">
                        <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span>Select PDF Files</span>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf"
                            multiple
                            onChange={handleFilesChange}
                            className="hidden"
                        />
                    </label>
                    <p className="text-xs text-zinc-400 mt-4">
                        You can upload up to {MAX_FILES} PDF files
                    </p>
                </div>
            )}
        </ConversionLayout>
    );
}

