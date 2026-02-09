"use client";

import { useState, useRef, useEffect } from "react";
import {
    Crop,
    Plus,
    FileText,
    Check,
    RotateCw,
    Maximize2,
    X
} from "lucide-react";
import ConversionLayout from "@/components/ConversionLayout";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";
import PreviewContent from "@/components/PreviewContent";
import { motion, AnimatePresence } from "framer-motion";
import { PDFDocument } from 'pdf-lib';

interface CropArea {
    x: number; // percentage
    y: number; // percentage
    width: number; // percentage
    height: number; // percentage
}

interface PageData {
    id: string;
    originalIndex: number;
    thumbnailUrl: string;
    pageWidth: number;
    pageHeight: number;
    cropArea: CropArea | null;
}

export default function CropPDF() {
    const [file, setFile] = useState<File | null>(null);
    const [pages, setPages] = useState<PageData[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoadingPages, setIsLoadingPages] = useState(false);
    const [result, setResult] = useState<{ fileName: string; downloadUrl: string } | null>(null);
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
    const [applyToAll, setApplyToAll] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const canvasRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});

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
                const viewport = page.getViewport({ scale: 1.0 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');

                if (context) {
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    await page.render({
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        canvasContext: context as any,
                        viewport: viewport,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        canvas: canvas as any
                    }).promise;

                    loadedPages.push({
                        id: `page-${i}-${Date.now()}`,
                        originalIndex: i - 1,
                        thumbnailUrl: canvas.toDataURL(),
                        pageWidth: viewport.width,
                        pageHeight: viewport.height,
                        cropArea: null,
                    });
                }
            }

            setPages(loadedPages);
            if (loadedPages.length > 0) {
                setSelectedPageId(loadedPages[0].id);
            }
        } catch (error) {
            console.error("Error loading PDF pages:", error);
            alert("Failed to load PDF pages");
        } finally {
            setIsLoadingPages(false);
        }
    };

    const updateCropArea = (pageId: string, cropArea: CropArea | null) => {
        setPages(prev => prev.map(p => {
            if (applyToAll) {
                return { ...p, cropArea };
            }
            return p.id === pageId ? { ...p, cropArea } : p;
        }));
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, pageId: string) => {
        if (e.button !== 0) return; // Only left mouse button
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        setIsDragging(true);
        setDragStart({ x, y });
        setSelectedPageId(pageId);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, pageId: string) => {
        if (!isDragging || !dragStart) return;
        
        const rect = e.currentTarget.getBoundingClientRect();
        const currentX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const currentY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

        const x = Math.min(dragStart.x, currentX);
        const y = Math.min(dragStart.y, currentY);
        const width = Math.abs(currentX - dragStart.x);
        const height = Math.abs(currentY - dragStart.y);

        const cropArea: CropArea = {
            x: Math.max(0, Math.min(100, x)),
            y: Math.max(0, Math.min(100, y)),
            width: Math.max(1, Math.min(100 - x, width)),
            height: Math.max(1, Math.min(100 - y, height)),
        };

        updateCropArea(pageId, cropArea);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setDragStart(null);
    };

    const resetCrop = (pageId: string) => {
        updateCropArea(pageId, null);
    };

    const handleCrop = async () => {
        if (!file || pages.length === 0) return;

        setIsProcessing(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const sourceDoc = await PDFDocument.load(arrayBuffer);
            const newDoc = await PDFDocument.create();

            for (const pageInfo of pages) {
                const [copiedPage] = await newDoc.copyPages(sourceDoc, [pageInfo.originalIndex]);
                
                if (pageInfo.cropArea) {
                    const crop = pageInfo.cropArea;
                    const pageWidth = copiedPage.getSize().width;
                    const pageHeight = copiedPage.getSize().height;

                    // Convert percentage to points
                    const x = (crop.x / 100) * pageWidth;
                    const y = (crop.y / 100) * pageHeight;
                    const width = (crop.width / 100) * pageWidth;
                    const height = (crop.height / 100) * pageHeight;

                    // Set crop box (MediaBox)
                    // PDF coordinates start from bottom-left, so we need to adjust Y
                    const adjustedY = pageHeight - y - height;
                    
                    copiedPage.setMediaBox(x, adjustedY, width, height);
                }

                newDoc.addPage(copiedPage);
            }

            const pdfBytes = await newDoc.save();
            const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);

            setResult({
                fileName: `cropped_${file.name}`,
                downloadUrl: url,
            });
        } catch (error) {
            console.error("Crop error:", error);
            alert("An error occurred during cropping");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setPages([]);
        setResult(null);
        setSelectedPageId(null);
        setApplyToAll(false);
    };

    // Apply crop to all pages when applyToAll is enabled
    useEffect(() => {
        if (applyToAll && selectedPageId) {
            const selectedPage = pages.find(p => p.id === selectedPageId);
            if (selectedPage?.cropArea) {
                const cropToApply = selectedPage.cropArea;
                setPages(prev => prev.map(p => ({ ...p, cropArea: cropToApply })));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [applyToAll]);

    // Global mouse up handler for better drag experience
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                setDragStart(null);
            }
        };

        if (isDragging) {
            window.addEventListener('mouseup', handleGlobalMouseUp);
            return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
        }
    }, [isDragging]);

    const SettingsPanel = (
        <div className="flex flex-col h-full">
            <div className="bg-orange-50/50 rounded-2xl p-4 border border-orange-100 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Total Pages</span>
                    <span className="text-sm font-black text-orange-600 bg-white px-2 py-1 rounded-lg shadow-sm">{pages.length}</span>
                </div>
                {pages.some(p => p.cropArea) ? (
                    <div className="flex items-center gap-2 text-orange-600 text-xs font-bold bg-white p-2 rounded-xl border border-orange-100 shadow-sm">
                        <Check size={14} className="text-orange-500" />
                        Crop area defined
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold bg-white p-2 rounded-xl border border-zinc-100 italic">
                        No crop area set
                    </div>
                )}
            </div>

            <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3 p-3 bg-white border border-zinc-100 rounded-xl">
                    <input
                        type="checkbox"
                        id="applyToAll"
                        checked={applyToAll}
                        onChange={(e) => setApplyToAll(e.target.checked)}
                        className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 cursor-pointer"
                    />
                    <label htmlFor="applyToAll" className="text-sm font-bold text-zinc-700 cursor-pointer flex-1">
                        Apply crop to all pages
                    </label>
                </div>

                <div className="space-y-2">
                    <p className="text-xs font-bold text-zinc-500 leading-relaxed">
                        Click and drag on a page to select the crop area. The selected area will be kept in the final PDF.
                    </p>
                </div>
            </div>

            <div className="mt-auto">
                <ProcessingButton
                    onClick={handleCrop}
                    isProcessing={isProcessing}
                    disabled={pages.length === 0}
                    icon={Crop}
                    text="Crop PDF"
                    processingText="Cropping PDF..."
                    bgColor="bg-orange-600"
                    className="shadow-orange-200"
                />
            </div>
        </div>
    );

    return (
        <ConversionLayout
            title="Crop PDF"
            description="Remove unwanted margins and areas from your PDF pages"
            settingsPanel={!result ? SettingsPanel : (
                <div className="h-full flex flex-col justify-center">
                    <DownloadResult
                        fileName={result.fileName}
                        downloadUrl={result.downloadUrl}
                        onReset={handleReset}
                        stats={[
                            { label: "Pages", value: pages.length.toString() },
                            { label: "Format", value: "PDF" }
                        ]}
                    />
                </div>
            )}
        >
            {result ? (
                <div className="w-full h-full max-w-4xl">
                    <PreviewContent url={result.downloadUrl} fileName={result.fileName} />
                </div>
            ) : !file ? (
                <div className="text-center max-w-sm px-6">
                    <div className="w-24 h-24 bg-orange-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner group">
                        <Crop className="text-orange-400 group-hover:scale-110 transition-transform duration-500" size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 mb-3 tracking-tight">Crop PDF</h3>
                    <p className="text-zinc-500 font-medium text-sm mb-8 leading-relaxed">
                        Select areas to keep on your PDF pages. Drag to define the crop rectangle.
                    </p>
                    <label className="inline-flex items-center gap-3 px-8 py-4 bg-orange-600 text-white font-black rounded-2xl hover:bg-orange-700 cursor-pointer transition-all shadow-xl shadow-orange-200 active:scale-95 group">
                        <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span>Select PDF File</span>
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className="hidden"
                            ref={fileInputRef}
                        />
                    </label>
                </div>
            ) : isLoadingPages ? (
                <div className="flex flex-col items-center gap-6">
                    <div className="relative w-20 h-20">
                        <div className="absolute inset-0 border-4 border-orange-100 rounded-full" />
                        <div className="absolute inset-0 border-4 border-t-orange-600 rounded-full animate-spin" />
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-black text-zinc-900 mb-1">Loading Pages...</p>
                        <p className="text-zinc-400 font-bold text-sm">Extracting document structure</p>
                    </div>
                </div>
            ) : (
                <div className="w-full h-full p-6 flex flex-col">
                    <div className="mb-6 flex justify-between items-center max-w-6xl w-full mx-auto">
                        <div>
                            <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                <Crop size={14} className="text-zinc-300" />
                                Page Cropper
                            </h2>
                            <p className="text-xs text-zinc-500 font-bold">{pages.length} pages loaded from {file.name}</p>
                        </div>
                        <label className="text-xs font-black text-orange-600 hover:text-orange-700 cursor-pointer flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-xl transition-all active:scale-95">
                            <Plus size={14} />
                            <span>Replace File</span>
                            <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                        </label>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto pb-20">
                            {pages.map((page, index) => {
                                const isSelected = selectedPageId === page.id;
                                const hasCrop = page.cropArea !== null;

                                return (
                                    <motion.div
                                        key={page.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className={`relative group`}
                                    >
                                        <div
                                            className={`relative aspect-[1/1.414] bg-white rounded-2xl border-2 shadow-sm transition-all overflow-hidden ${
                                                isSelected
                                                    ? 'border-orange-500 shadow-lg'
                                                    : 'border-zinc-100 hover:border-orange-300'
                                            } ${isDragging ? 'cursor-grabbing' : 'cursor-crosshair'}`}
                                            onMouseDown={(e) => handleMouseDown(e, page.id)}
                                            onMouseMove={(e) => handleMouseMove(e, page.id)}
                                            onMouseUp={handleMouseUp}
                                            onMouseLeave={handleMouseUp}
                                            title="Click and drag to select crop area"
                                            style={{ cursor: isDragging ? 'grabbing' : 'crosshair' }}
                                        >
                                            {/* Page Thumbnail */}
                                            <img
                                                src={page.thumbnailUrl}
                                                alt={`Page ${index + 1}`}
                                                className="w-full h-full object-contain pointer-events-none"
                                            />

                                            {/* Crop Overlay */}
                                            {page.cropArea && (
                                                <>
                                                    {/* Dark overlay outside crop area */}
                                                    <div
                                                        className="absolute inset-0 bg-black/40 pointer-events-none"
                                                        style={{
                                                            clipPath: `polygon(
                                                                0% 0%,
                                                                0% 100%,
                                                                ${page.cropArea.x}% 100%,
                                                                ${page.cropArea.x}% ${page.cropArea.y}%,
                                                                ${page.cropArea.x + page.cropArea.width}% ${page.cropArea.y}%,
                                                                ${page.cropArea.x + page.cropArea.width}% ${page.cropArea.y + page.cropArea.height}%,
                                                                ${page.cropArea.x}% ${page.cropArea.y + page.cropArea.height}%,
                                                                ${page.cropArea.x}% 100%,
                                                                100% 100%,
                                                                100% 0%
                                                            )`,
                                                        }}
                                                    />
                                                    {/* Crop rectangle border */}
                                                    <div
                                                        className="absolute border-2 border-orange-500 bg-orange-500/10 pointer-events-none"
                                                        style={{
                                                            left: `${page.cropArea.x}%`,
                                                            top: `${page.cropArea.y}%`,
                                                            width: `${page.cropArea.width}%`,
                                                            height: `${page.cropArea.height}%`,
                                                        }}
                                                    />
                                                </>
                                            )}

                                            {/* Page Number Badge */}
                                            <div className="absolute top-2 left-2 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-[10px] font-black text-zinc-600 shadow-sm border border-zinc-100">
                                                PAGE {index + 1}
                                            </div>

                                            {/* Crop Indicator */}
                                            {hasCrop && (
                                                <div className="absolute top-2 right-2 px-2 py-1 bg-orange-500 text-white rounded-lg text-[10px] font-black shadow-sm">
                                                    CROPPED
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions Footer */}
                                        <div className="mt-2 flex items-center justify-between px-2">
                                            <button
                                                onClick={() => resetCrop(page.id)}
                                                disabled={!hasCrop}
                                                className="text-xs font-bold text-zinc-400 hover:text-orange-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                                            >
                                                <RotateCw size={12} />
                                                Reset
                                            </button>
                                            {hasCrop && (
                                                <div className="text-[10px] font-black text-orange-600 uppercase tracking-tighter">
                                                    Active
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </ConversionLayout>
    );
}

