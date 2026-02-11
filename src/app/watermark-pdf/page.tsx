"use client";

import { useState, useRef } from "react";
import {
    Droplet,
    Image as ImageIcon,
    Plus,
    FileText,
    Check,
    X,
    Type,
    Upload
} from "lucide-react";
import ConversionLayout from "@/components/ConversionLayout";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";
import PreviewContent from "@/components/PreviewContent";
import { motion } from "framer-motion";
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';

interface PageData {
    id: string;
    fileIndex: number;
    fileName: string;
    pageIndex: number;
    thumbnailUrl: string;
    selected: boolean;
}

type WatermarkType = "text" | "image";
type GridPosition = "1-1" | "1-2" | "1-3" | "2-1" | "2-2" | "2-3" | "3-1" | "3-2" | "3-3" | "mosaic"; // 3x3 grid positions + mosaic
type Layer = "foreground" | "background";

export default function WatermarkPDF() {
    const [files, setFiles] = useState<File[]>([]);
    const [pages, setPages] = useState<PageData[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoadingPages, setIsLoadingPages] = useState(false);
    const [result, setResult] = useState<{ fileName: string; downloadUrl: string } | null>(null);
    const [watermarkType, setWatermarkType] = useState<WatermarkType>("text");
    const [pageMode, setPageMode] = useState<"all" | "selected">("all");
    
    // Text watermark settings
    const [text, setText] = useState("WATERMARK");
    const [fontSize, setFontSize] = useState(48);
    const [textColor, setTextColor] = useState("#000000");
    
    // Image watermark settings
    const [watermarkImage, setWatermarkImage] = useState<File | null>(null);
    const [imageScale, setImageScale] = useState(50); // percentage of page width
    
    // Common watermark settings
    const [transparency, setTransparency] = useState<"none" | number>("none"); // "none" or 0-100
    const [rotation, setRotation] = useState<"none" | 45 | 90 | 180 | 270>("none");
    const [gridPosition, setGridPosition] = useState<GridPosition>("2-2"); // Default center
    const [layer, setLayer] = useState<Layer>("background");
    
    // Page range settings
    const [usePageRange, setUsePageRange] = useState(false);
    const [pageFrom, setPageFrom] = useState(1);
    const [pageTo, setPageTo] = useState(1);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

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
                            thumbnailUrl: canvas.toDataURL(),
                            selected: false,
                        });
                    }
                }
            }

            const updatedPages = [...pages, ...newPages];
            setPages(updatedPages);
            
            // Update page range max when pages are loaded
            if (updatedPages.length > 0) {
                setPageTo(Math.max(pageTo, updatedPages.length));
            }
        } catch (error) {
            console.error("Error loading PDF pages:", error);
            alert("Failed to load PDF pages");
        } finally {
            setIsLoadingPages(false);
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

    const removeFile = (fileIndex: number) => {
        const updatedFiles = files.filter((_, i) => i !== fileIndex);
        const updatedPages = pages.filter(p => p.fileIndex !== fileIndex);
        setFiles(updatedFiles);
        setPages(updatedPages);
    };

    const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? {
                r: parseInt(result[1], 16) / 255,
                g: parseInt(result[2], 16) / 255,
                b: parseInt(result[3], 16) / 255,
            }
            : { r: 0, g: 0, b: 0 };
    };

    const calculateGridPositions = (pageWidth: number, pageHeight: number, watermarkWidth: number, watermarkHeight: number): Array<{x: number, y: number, width?: number, height?: number}> => {
        const positions: Array<{x: number, y: number, width?: number, height?: number}> = [];
        
        if (gridPosition === "mosaic") {
            // Calculate all 9 positions with scaled watermark to fit cells
            const cellWidth = pageWidth / 3;
            const cellHeight = pageHeight / 3;
            
            // Scale watermark to fit within cell (with some padding)
            const padding = 0.1; // 10% padding
            const maxWidth = cellWidth * (1 - padding * 2);
            const maxHeight = cellHeight * (1 - padding * 2);
            const scale = Math.min(maxWidth / watermarkWidth, maxHeight / watermarkHeight);
            const scaledWidth = watermarkWidth * scale;
            const scaledHeight = watermarkHeight * scale;
            
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 3; col++) {
                    const x = col * cellWidth + (cellWidth - scaledWidth) / 2;
                    const y = (2 - row) * cellHeight + (cellHeight - scaledHeight) / 2; // Invert Y axis
                    positions.push({ x, y, width: scaledWidth, height: scaledHeight });
                }
            }
        } else {
            // Single position from grid
            const [row, col] = gridPosition.split('-').map(Number);
            const cellWidth = pageWidth / 3;
            const cellHeight = pageHeight / 3;
            
            const x = (col - 1) * cellWidth + (cellWidth - watermarkWidth) / 2;
            const y = (3 - row) * cellHeight + (cellHeight - watermarkHeight) / 2; // Invert Y axis
            positions.push({ x, y });
        }
        
        return positions;
    };

    const handleWatermark = async () => {
        if (files.length === 0 || pages.length === 0) return;
        if (watermarkType === "text" && !text.trim()) {
            alert("Please enter watermark text");
            return;
        }
        if (watermarkType === "image" && !watermarkImage) {
            alert("Please upload a watermark image");
            return;
        }

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

            // Embed watermark image if image type
            let embeddedImage: any = null;
            if (watermarkType === "image" && watermarkImage) {
                const imageArrayBuffer = await watermarkImage.arrayBuffer();
                const imageType = watermarkImage.type;
                if (imageType === 'image/png') {
                    embeddedImage = await mergedDoc.embedPng(imageArrayBuffer);
                } else if (imageType === 'image/jpeg' || imageType === 'image/jpg') {
                    embeddedImage = await mergedDoc.embedJpg(imageArrayBuffer);
                } else {
                    // Convert to PNG using canvas
                    const img = new Image();
                    img.src = URL.createObjectURL(watermarkImage);
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                    });
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0);
                    const pngData = canvas.toDataURL('image/png');
                    const pngBytes = await fetch(pngData).then(res => res.arrayBuffer());
                    embeddedImage = await mergedDoc.embedPng(pngBytes);
                }
            }

            // Embed font for text watermark
            const font = await mergedDoc.embedFont(StandardFonts.HelveticaBold);

            // Track global page number across all files
            let globalPageNumber = 0;

            // Process each file
            for (const fileIndex in pagesByFile) {
                const filePages = pagesByFile[fileIndex].sort((a, b) => a.pageIndex - b.pageIndex);
                const file = files[parseInt(fileIndex)];
                const arrayBuffer = await file.arrayBuffer();
                const sourceDoc = await PDFDocument.load(arrayBuffer, {
                    ignoreEncryption: true,
                });

                for (const pageInfo of filePages) {
                    globalPageNumber++;
                    
                    // Check page range (global across all files)
                    if (usePageRange && (globalPageNumber < pageFrom || globalPageNumber > pageTo)) {
                        // Add page without watermark if outside range
                        const [copiedPage] = await mergedDoc.copyPages(sourceDoc, [pageInfo.pageIndex]);
                        mergedDoc.addPage(copiedPage);
                        continue;
                    }

                    // Check if page should be watermarked
                    if (pageMode === "selected" && !pageInfo.selected) {
                        // Still add page but without watermark
                        const [copiedPage] = await mergedDoc.copyPages(sourceDoc, [pageInfo.pageIndex]);
                        mergedDoc.addPage(copiedPage);
                        continue;
                    }

                    const [copiedPage] = await mergedDoc.copyPages(sourceDoc, [pageInfo.pageIndex]);
                    const { width: pageWidth, height: pageHeight } = copiedPage.getSize();

                    // Calculate opacity
                    const opacity = transparency === "none" ? 1.0 : (100 - transparency) / 100;
                    
                    // Calculate rotation angle
                    const rotationAngle = rotation === "none" ? 0 : rotation;

                    // Draw watermark on the copied page
                    // Note: pdf-lib draws in order, so watermark will be on top of page content
                    // For true background layer, we'd need to render page as image first (more complex)
                    if (watermarkType === "text") {
                        const textWidth = font.widthOfTextAtSize(text, fontSize);
                        const textHeight = fontSize;
                        const positions = calculateGridPositions(pageWidth, pageHeight, textWidth, textHeight);
                        const color = hexToRgb(textColor);
                        for (const pos of positions) {
                            // For mosaic, use scaled size; for single position, use original size
                            const textSize = gridPosition === "mosaic" && pos.width 
                                ? fontSize * (pos.width / textWidth) 
                                : fontSize;
                            
                            copiedPage.drawText(text, {
                                x: pos.x,
                                y: pos.y,
                                size: textSize,
                                font: font,
                                color: rgb(color.r, color.g, color.b),
                                opacity: opacity,
                                rotate: degrees(rotationAngle),
                            });
                        }
                    } else if (watermarkType === "image" && embeddedImage) {
                        const { width: imgWidth, height: imgHeight } = embeddedImage.scale(1);
                        const scale = (imageScale / 100) * Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
                        const watermarkWidth = imgWidth * scale;
                        const watermarkHeight = imgHeight * scale;
                        const positions = calculateGridPositions(pageWidth, pageHeight, watermarkWidth, watermarkHeight);
                        for (const pos of positions) {
                            // For mosaic, use scaled dimensions; for single position, use original dimensions
                            const drawWidth = pos.width || watermarkWidth;
                            const drawHeight = pos.height || watermarkHeight;
                            
                            copiedPage.drawImage(embeddedImage, {
                                x: pos.x,
                                y: pos.y,
                                width: drawWidth,
                                height: drawHeight,
                                opacity: opacity,
                                rotate: degrees(rotationAngle),
                            });
                        }
                    }

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
                    ? `watermarked_${files[0].name}` 
                    : `watermarked_merged_${files.length}_files.pdf`,
                downloadUrl: url,
            });
        } catch (error) {
            console.error("Watermark error:", error);
            alert("An error occurred during watermarking");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = () => {
        setFiles([]);
        setPages([]);
        setResult(null);
        setWatermarkType("text");
        setPageMode("all");
        setText("WATERMARK");
        setFontSize(48);
        setTextColor("#000000");
        setWatermarkImage(null);
        setImageScale(50);
        setTransparency("none");
        setRotation("none");
        setGridPosition("2-2");
        setLayer("background");
        setUsePageRange(false);
        setPageFrom(1);
        setPageTo(1);
    };

    const selectedCount = pages.filter(p => p.selected).length;

    const SettingsPanel = (
        <div className="flex flex-col h-full">
            <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Files & Pages</span>
                    <span className="text-sm font-black text-indigo-600 bg-white px-2 py-1 rounded-lg shadow-sm">
                        {files.length} file{files.length !== 1 ? 's' : ''} • {pages.length} page{pages.length !== 1 ? 's' : ''}
                    </span>
                </div>
                {pages.length > 0 && (
                    <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold bg-white p-2 rounded-xl border border-indigo-100 shadow-sm">
                        <Check size={14} className="text-indigo-500" />
                        {selectedCount > 0 ? `${selectedCount} page${selectedCount !== 1 ? 's' : ''} selected` : 'All pages ready'}
                    </div>
                )}
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm mb-6">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Watermark Type</h3>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => setWatermarkType("text")}
                        className={`px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                            watermarkType === "text"
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-slate-100 text-zinc-700 hover:bg-slate-200'
                        }`}
                    >
                        <Type size={16} />
                        Text
                    </button>
                    <button
                        onClick={() => setWatermarkType("image")}
                        className={`px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                            watermarkType === "image"
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-slate-100 text-zinc-700 hover:bg-slate-200'
                        }`}
                    >
                        <ImageIcon size={16} />
                        Image
                    </button>
                </div>
            </div>

            {watermarkType === "text" && (
                <>
                    <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm mb-6">
                        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Text Settings</h3>
                        <input
                            type="text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Enter watermark text"
                            className="w-full px-4 py-3 bg-white border-2 border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 transition-colors mb-3"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 block">Font Size</label>
                                <input
                                    type="number"
                                    value={fontSize}
                                    onChange={(e) => setFontSize(Number(e.target.value))}
                                    min="10"
                                    max="200"
                                    className="w-full px-3 py-2 bg-white border-2 border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 focus:outline-none focus:border-indigo-600 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 block">Color</label>
                                <input
                                    type="color"
                                    value={textColor}
                                    onChange={(e) => setTextColor(e.target.value)}
                                    className="w-full h-10 bg-white border-2 border-zinc-200 rounded-xl cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                </>
            )}

            {watermarkType === "image" && (
                <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm mb-6">
                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Image Settings</h3>
                    <label className="block mb-3">
                        <div className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-zinc-700 rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2 text-xs font-bold">
                            <Upload size={16} />
                            {watermarkImage ? watermarkImage.name : "Upload Image"}
                        </div>
                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    setWatermarkImage(e.target.files[0]);
                                }
                            }}
                            className="hidden"
                        />
                    </label>
                    {watermarkImage && (
                        <div className="mb-3 p-2 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-zinc-700 truncate">{watermarkImage.name}</span>
                                <button
                                    onClick={() => setWatermarkImage(null)}
                                    className="text-red-500 hover:text-red-600"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 block">Scale (%)</label>
                        <input
                            type="number"
                            value={imageScale}
                            onChange={(e) => setImageScale(Number(e.target.value))}
                            min="10"
                            max="200"
                            className="w-full px-3 py-2 bg-white border-2 border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 focus:outline-none focus:border-indigo-600 transition-colors"
                        />
                    </div>
                </div>
            )}

            <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm mb-6">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Position</h3>
                <div className="mb-3">
                    <div className="grid grid-cols-3 gap-1 w-full max-w-[180px] mx-auto border-2 border-zinc-200 rounded-lg p-1 bg-slate-50">
                        {[1, 2, 3].map((row) => (
                            [1, 2, 3].map((col) => {
                                const pos = `${row}-${col}` as GridPosition;
                                const isSelected = gridPosition === pos;
                                return (
                                    <button
                                        key={pos}
                                        onClick={() => setGridPosition(pos)}
                                        className={`aspect-square rounded border-2 transition-all ${
                                            isSelected
                                                ? 'bg-indigo-600 border-indigo-700 shadow-md'
                                                : 'bg-white border-zinc-300 hover:border-indigo-400'
                                        }`}
                                    >
                                        {isSelected && (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <div className="w-2 h-2 bg-white rounded-full"></div>
                                            </div>
                                        )}
                                    </button>
                                );
                            })
                        ))}
                    </div>
                </div>
                <label className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                        type="checkbox"
                        checked={gridPosition === "mosaic"}
                        onChange={(e) => setGridPosition(e.target.checked ? "mosaic" : "2-2")}
                        className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-xs font-bold text-zinc-700">Mosaic</span>
                </label>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm mb-6">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Transparency</h3>
                <select
                    value={transparency === "none" ? "none" : transparency.toString()}
                    onChange={(e) => setTransparency(e.target.value === "none" ? "none" : Number(e.target.value))}
                    className="w-full px-4 py-3 bg-white border-2 border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 focus:outline-none focus:border-indigo-600 transition-colors"
                >
                    <option value="none">No transparency</option>
                    <option value="10">10%</option>
                    <option value="20">20%</option>
                    <option value="30">30%</option>
                    <option value="40">40%</option>
                    <option value="50">50%</option>
                    <option value="60">60%</option>
                    <option value="70">70%</option>
                    <option value="80">80%</option>
                    <option value="90">90%</option>
                </select>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm mb-6">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Rotation</h3>
                <select
                    value={rotation === "none" ? "none" : rotation.toString()}
                    onChange={(e) => setRotation(e.target.value === "none" ? "none" : Number(e.target.value) as 45 | 90 | 180 | 270)}
                    className="w-full px-4 py-3 bg-white border-2 border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 focus:outline-none focus:border-indigo-600 transition-colors"
                >
                    <option value="none">Do not rotate</option>
                    <option value="45">45 degrees</option>
                    <option value="90">90 degrees</option>
                    <option value="180">180 degrees</option>
                    <option value="270">270 degrees</option>
                </select>
            </div>

            {pages.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm mb-6">
                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Pages</h3>
                    <label className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors mb-3">
                        <input
                            type="checkbox"
                            checked={usePageRange}
                            onChange={(e) => setUsePageRange(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <span className="text-xs font-bold text-zinc-700">Use page range</span>
                    </label>
                    {usePageRange && (
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 block">From page</label>
                                <input
                                    type="number"
                                    value={pageFrom}
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setPageFrom(Math.max(1, Math.min(val, pages.length)));
                                        if (val > pageTo) setPageTo(val);
                                    }}
                                    min="1"
                                    max={pages.length}
                                    className="w-full px-3 py-2 bg-white border-2 border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 focus:outline-none focus:border-indigo-600 transition-colors"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 block">To page</label>
                                <input
                                    type="number"
                                    value={pageTo}
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setPageTo(Math.max(pageFrom, Math.min(val, pages.length)));
                                    }}
                                    min={pageFrom}
                                    max={pages.length}
                                    className="w-full px-3 py-2 bg-white border-2 border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 focus:outline-none focus:border-indigo-600 transition-colors"
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm mb-6">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Layer</h3>
                <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                        <input
                            type="radio"
                            name="layer"
                            checked={layer === "background"}
                            onChange={() => setLayer("background")}
                            className="w-4 h-4 text-indigo-600"
                        />
                        <span className="text-xs font-bold text-zinc-700">Background</span>
                    </label>
                    <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                        <input
                            type="radio"
                            name="layer"
                            checked={layer === "foreground"}
                            onChange={() => setLayer("foreground")}
                            className="w-4 h-4 text-indigo-600"
                        />
                        <span className="text-xs font-bold text-zinc-700">Foreground</span>
                    </label>
                </div>
            </div>

            {files.length > 0 && pages.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm mb-6">
                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Page Selection</h3>
                    <div className="space-y-2">
                        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                            <input
                                type="radio"
                                name="pageMode"
                                checked={pageMode === "all"}
                                onChange={() => setPageMode("all")}
                                className="w-4 h-4 text-indigo-600"
                            />
                            <span className="text-xs font-bold text-zinc-700">All Pages</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                            <input
                                type="radio"
                                name="pageMode"
                                checked={pageMode === "selected"}
                                onChange={() => setPageMode("selected")}
                                className="w-4 h-4 text-indigo-600"
                            />
                            <span className="text-xs font-bold text-zinc-700">Selected Pages Only</span>
                        </label>
                    </div>
                    {pageMode === "selected" && (
                        <div className="grid grid-cols-2 gap-2 mt-3">
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
                    )}
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
                    onClick={handleWatermark}
                    isProcessing={isProcessing}
                    disabled={files.length === 0 || pages.length === 0 || (watermarkType === "text" && !text.trim()) || (watermarkType === "image" && !watermarkImage)}
                    icon={Droplet}
                    text="Apply Watermark"
                    processingText="Watermarking..."
                    bgColor="bg-indigo-600"
                    className="shadow-indigo-200"
                />
            </div>
        </div>
    );

    return (
        <ConversionLayout
            title="Watermark PDF"
            description="Add text or image watermarks to your PDF documents"
            settingsPanel={!result ? SettingsPanel : (
                <div className="h-full flex flex-col justify-center">
                    <DownloadResult
                        fileName={result.fileName}
                        downloadUrl={result.downloadUrl}
                        onReset={handleReset}
                        stats={[
                            { label: "Files", value: files.length.toString() },
                            { label: "Pages", value: pages.length.toString() },
                            { label: "Type", value: watermarkType === "text" ? "Text" : "Image" },
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
                                {pages.length} page{pages.length !== 1 ? 's' : ''} • Click to select pages
                            </p>
                        </div>
                        <label className="text-xs font-black text-indigo-600 hover:text-indigo-700 cursor-pointer flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl transition-all active:scale-95">
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
                                            ? 'border-indigo-600 shadow-lg shadow-indigo-100' 
                                            : 'border-zinc-200 hover:border-zinc-300'
                                    }`}
                                    onClick={() => togglePageSelection(page.id)}
                                >
                                    <div className="aspect-[3/4] bg-slate-50 flex items-center justify-center relative">
                                        <img
                                            src={page.thumbnailUrl}
                                            alt={`Page ${page.pageIndex + 1}`}
                                            className="max-w-full max-h-full object-contain"
                                        />
                                        {page.selected && (
                                            <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                                                <Check size={14} className="text-white" />
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
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center max-w-sm px-6">
                    <div className="w-24 h-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner group">
                        <Droplet className="text-indigo-400 group-hover:scale-110 transition-transform duration-500" size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 mb-3 tracking-tight">Watermark PDF</h3>
                    <p className="text-zinc-500 font-medium text-sm mb-8 leading-relaxed">
                        Add text or image watermarks to your PDF documents. Upload up to {MAX_FILES} PDFs and customize your watermark.
                    </p>
                    <label className="inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 cursor-pointer transition-all shadow-xl shadow-indigo-200 active:scale-95 group">
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

