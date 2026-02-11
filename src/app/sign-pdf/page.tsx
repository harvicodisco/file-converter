"use client";

import { useState, useRef, useEffect } from "react";
import {
    PenTool,
    Image as ImageIcon,
    Type,
    FileText,
    Check,
    X,
    Upload,
    Calendar,
    User,
    Plus
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

type SignatureType = "upload" | "draw" | "text" | "initials";
type GridPosition = "1-1" | "1-2" | "1-3" | "2-1" | "2-2" | "2-3" | "3-1" | "3-2" | "3-3";

export default function SignPDF() {
    const [files, setFiles] = useState<File[]>([]);
    const [pages, setPages] = useState<PageData[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoadingPages, setIsLoadingPages] = useState(false);
    const [result, setResult] = useState<{ fileName: string; downloadUrl: string } | null>(null);
    const [signatureType, setSignatureType] = useState<SignatureType>("upload");
    const [pageMode, setPageMode] = useState<"all" | "selected">("all");
    
    // Upload signature settings
    const [signatureImage, setSignatureImage] = useState<File | null>(null);
    const [imageScale, setImageScale] = useState(30); // percentage
    
    // Draw signature settings
    const [drawnSignature, setDrawnSignature] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    
    // Text signature settings
    const [signatureText, setSignatureText] = useState("");
    const [fontSize, setFontSize] = useState(24);
    const [textColor, setTextColor] = useState("#000000");
    
    // Initials settings
    const [initials, setInitials] = useState("");
    const [initialsFontSize, setInitialsFontSize] = useState(20);
    
    // Common settings
    const [gridPosition, setGridPosition] = useState<GridPosition>("3-3"); // Default bottom-right
    const [includeDate, setIncludeDate] = useState(false);
    const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
    
    // Page range settings
    const [usePageRange, setUsePageRange] = useState(false);
    const [pageFrom, setPageFrom] = useState(1);
    const [pageTo, setPageTo] = useState(1);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const signatureInputRef = useRef<HTMLInputElement>(null);

    const MAX_FILES = 50;

    // Initialize canvas when draw mode is selected
    useEffect(() => {
        if (signatureType === "draw" && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d', { willReadFrequently: false });
            if (ctx && canvas.parentElement) {
                // Set canvas size to match container with high DPI support
                const container = canvas.parentElement;
                const dpr = window.devicePixelRatio || 1;
                const width = container.clientWidth - 16; // Account for padding
                const height = 200;
                
                // Set actual canvas size (scaled for high DPI)
                canvas.width = width * dpr;
                canvas.height = height * dpr;
                
                // Scale context to match device pixel ratio
                ctx.scale(dpr, dpr);
                
                // Set CSS size (actual display size)
                canvas.style.width = width + 'px';
                canvas.style.height = height + 'px';
                
                // Set drawing properties for smooth rendering
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
            }
        }
        
        // Cleanup on unmount or mode change
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [signatureType]);

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
                            canvas: canvas as any,
                        }).promise;

                        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
                        newPages.push({
                            id: `${fileIndex}-${pageNum}`,
                            fileIndex,
                            fileName: file.name,
                            pageIndex: pageNum - 1,
                            thumbnailUrl,
                            selected: true,
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

    const togglePageSelection = (pageId: string) => {
        setPages(prev => prev.map(page =>
            page.id === pageId ? { ...page, selected: !page.selected } : page
        ));
    };

    const selectAllPages = () => {
        setPages(prev => prev.map(page => ({ ...page, selected: true })));
    };

    const deselectAllPages = () => {
        setPages(prev => prev.map(page => ({ ...page, selected: false })));
    };

    // Get coordinates from event - context is already scaled by DPR in useEffect
    const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        
        // Use CSS coordinates (context is already scaled by DPR)
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    // Drawing signature functions - optimized for smooth performance
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d', { willReadFrequently: false });
        if (!ctx) return;
        
        const coords = getCoordinates(e);
        if (!coords) return;
        
        setIsDrawing(true);
        lastPointRef.current = coords;
        
        // Set drawing properties
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'source-over';
        
        // Start new path
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        e.preventDefault();
        
        // Cancel any pending animation frame
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        
        // Use requestAnimationFrame for smooth drawing
        animationFrameRef.current = requestAnimationFrame(() => {
            const canvas = canvasRef.current;
            if (!canvas || !isDrawing) return;
            
            const ctx = canvas.getContext('2d', { willReadFrequently: false });
            if (!ctx) return;
            
            const coords = getCoordinates(e);
            if (!coords) return;
            
            const lastPoint = lastPointRef.current;
            
            if (lastPoint) {
                // Draw smooth line between last point and current point
                ctx.beginPath();
                ctx.moveTo(lastPoint.x, lastPoint.y);
                ctx.lineTo(coords.x, coords.y);
                ctx.stroke();
            } else {
                // If no last point, just draw a dot
                ctx.beginPath();
                ctx.arc(coords.x, coords.y, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
            
            lastPointRef.current = coords;
        });
    };

    const stopDrawing = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        
        if (!isDrawing) return;
        setIsDrawing(false);
        lastPointRef.current = null;
        
        const canvas = canvasRef.current;
        if (canvas) {
            setDrawnSignature(canvas.toDataURL('image/png'));
        }
    };

    const clearDrawing = () => {
        // Cancel any pending animation
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            setDrawnSignature(null);
            lastPointRef.current = null;
            setIsDrawing(false);
        }
    };

    const calculatePosition = (pageWidth: number, pageHeight: number, signatureWidth: number, signatureHeight: number) => {
        const [row, col] = gridPosition.split('-').map(Number);
        const cellWidth = pageWidth / 3;
        const cellHeight = pageHeight / 3;
        
        const marginX = pageWidth * 0.05;
        const marginY = pageHeight * 0.05;
        
        const x = (col - 1) * cellWidth + marginX;
        const y = (3 - row) * cellHeight + marginY; // Invert Y axis
        
        return { x, y };
    };

    const formatDate = (date: Date): string => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        
        switch (dateFormat) {
            case "MM/DD/YYYY":
                return `${month}/${day}/${year}`;
            case "DD/MM/YYYY":
                return `${day}/${month}/${year}`;
            case "YYYY-MM-DD":
                return `${year}-${month}-${day}`;
            case "Month DD, YYYY":
                const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                return `${months[date.getMonth()]} ${day}, ${year}`;
            default:
                return `${month}/${day}/${year}`;
        }
    };

    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? {
                r: parseInt(result[1], 16) / 255,
                g: parseInt(result[2], 16) / 255,
                b: parseInt(result[3], 16) / 255,
            }
            : { r: 0, g: 0, b: 0 };
    };

    const handleSign = async () => {
        if (files.length === 0 || pages.length === 0) {
            alert("Please upload PDF files");
            return;
        }

        if (signatureType === "upload" && !signatureImage) {
            alert("Please upload a signature image");
            return;
        }
        if (signatureType === "draw" && !drawnSignature) {
            alert("Please draw your signature");
            return;
        }
        if (signatureType === "text" && !signatureText.trim()) {
            alert("Please enter your signature text");
            return;
        }
        if (signatureType === "initials" && !initials.trim()) {
            alert("Please enter your initials");
            return;
        }

        setIsProcessing(true);
        try {
            const { PDFDocument } = await import('pdf-lib');
            const mergedDoc = await PDFDocument.create();

            const pagesByFile: { [key: number]: PageData[] } = {};
            pages.forEach(page => {
                if (!pagesByFile[page.fileIndex]) {
                    pagesByFile[page.fileIndex] = [];
                }
                pagesByFile[page.fileIndex].push(page);
            });

            let embeddedImage: any = null;
            if (signatureType === "upload" && signatureImage) {
                const imageArrayBuffer = await signatureImage.arrayBuffer();
                const imageType = signatureImage.type;
                if (imageType === 'image/png') {
                    embeddedImage = await mergedDoc.embedPng(imageArrayBuffer);
                } else if (imageType === 'image/jpeg' || imageType === 'image/jpg') {
                    embeddedImage = await mergedDoc.embedJpg(imageArrayBuffer);
                } else {
                    const img = new Image();
                    img.src = URL.createObjectURL(signatureImage);
                    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0);
                    const pngData = canvas.toDataURL('image/png');
                    const pngBytes = await fetch(pngData).then(res => res.arrayBuffer());
                    embeddedImage = await mergedDoc.embedPng(pngBytes);
                }
            } else if (signatureType === "draw" && drawnSignature) {
                const pngBytes = await fetch(drawnSignature).then(res => res.arrayBuffer());
                embeddedImage = await mergedDoc.embedPng(pngBytes);
            }

            const font = await mergedDoc.embedFont(StandardFonts.HelveticaBold);
            const regularFont = await mergedDoc.embedFont(StandardFonts.Helvetica);

            for (const fileIndex in pagesByFile) {
                const filePages = pagesByFile[fileIndex].sort((a, b) => a.pageIndex - b.pageIndex);
                const file = files[parseInt(fileIndex)];
                const arrayBuffer = await file.arrayBuffer();
                const sourceDoc = await PDFDocument.load(arrayBuffer, {
                    ignoreEncryption: true,
                });

                for (const pageInfo of filePages) {
                    const pageNumber = pageInfo.pageIndex + 1;
                    const shouldSign = (!usePageRange || (pageNumber >= pageFrom && pageNumber <= pageTo)) &&
                                      (pageMode === "all" || pageInfo.selected);

                    const [copiedPage] = await mergedDoc.copyPages(sourceDoc, [pageInfo.pageIndex]);
                    const { width: pageWidth, height: pageHeight } = copiedPage.getSize();

                    if (shouldSign) {
                        if (signatureType === "upload" && embeddedImage) {
                            const { width: imgWidth, height: imgHeight } = embeddedImage.scale(1);
                            const scale = (imageScale / 100) * Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
                            const signatureWidth = imgWidth * scale;
                            const signatureHeight = imgHeight * scale;
                            const pos = calculatePosition(pageWidth, pageHeight, signatureWidth, signatureHeight);
                            
                            copiedPage.drawImage(embeddedImage, {
                                x: pos.x,
                                y: pos.y,
                                width: signatureWidth,
                                height: signatureHeight,
                            });

                            if (includeDate) {
                                const dateText = formatDate(new Date());
                                const dateFontSize = 10;
                                copiedPage.drawText(dateText, {
                                    x: pos.x,
                                    y: pos.y - dateFontSize - 5,
                                    size: dateFontSize,
                                    font: regularFont,
                                    color: rgb(0, 0, 0),
                                });
                            }
                        } else if (signatureType === "draw" && embeddedImage) {
                            const { width: imgWidth, height: imgHeight } = embeddedImage.scale(1);
                            const scale = (imageScale / 100) * Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
                            const signatureWidth = imgWidth * scale;
                            const signatureHeight = imgHeight * scale;
                            const pos = calculatePosition(pageWidth, pageHeight, signatureWidth, signatureHeight);
                            
                            copiedPage.drawImage(embeddedImage, {
                                x: pos.x,
                                y: pos.y,
                                width: signatureWidth,
                                height: signatureHeight,
                            });

                            if (includeDate) {
                                const dateText = formatDate(new Date());
                                const dateFontSize = 10;
                                copiedPage.drawText(dateText, {
                                    x: pos.x,
                                    y: pos.y - dateFontSize - 5,
                                    size: dateFontSize,
                                    font: regularFont,
                                    color: rgb(0, 0, 0),
                                });
                            }
                        } else if (signatureType === "text") {
                            const textWidth = font.widthOfTextAtSize(signatureText, fontSize);
                            const textHeight = fontSize;
                            const pos = calculatePosition(pageWidth, pageHeight, textWidth, textHeight);
                            const color = hexToRgb(textColor);
                            
                            copiedPage.drawText(signatureText, {
                                x: pos.x,
                                y: pos.y,
                                size: fontSize,
                                font: font,
                                color: rgb(color.r, color.g, color.b),
                            });

                            if (includeDate) {
                                const dateText = formatDate(new Date());
                                const dateFontSize = 10;
                                copiedPage.drawText(dateText, {
                                    x: pos.x,
                                    y: pos.y - dateFontSize - 5,
                                    size: dateFontSize,
                                    font: regularFont,
                                    color: rgb(0, 0, 0),
                                });
                            }
                        } else if (signatureType === "initials") {
                            const initialsWidth = font.widthOfTextAtSize(initials, initialsFontSize);
                            const initialsHeight = initialsFontSize;
                            const pos = calculatePosition(pageWidth, pageHeight, initialsWidth, initialsHeight);
                            
                            copiedPage.drawText(initials, {
                                x: pos.x,
                                y: pos.y,
                                size: initialsFontSize,
                                font: font,
                                color: rgb(0, 0, 0),
                            });

                            if (includeDate) {
                                const dateText = formatDate(new Date());
                                const dateFontSize = 10;
                                copiedPage.drawText(dateText, {
                                    x: pos.x,
                                    y: pos.y - dateFontSize - 5,
                                    size: dateFontSize,
                                    font: regularFont,
                                    color: rgb(0, 0, 0),
                                });
                            }
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
                    ? `signed_${files[0].name}`
                    : `signed_merged_${files.length}_files.pdf`,
                downloadUrl: url,
            });
        } catch (error) {
            console.error("Sign error:", error);
            alert("An error occurred during signing");
        } finally {
            setIsProcessing(false);
        }
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
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Upload PDF Files</h3>
                <label className="block">
                    <div className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-zinc-700 rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2 text-xs font-bold">
                        <Upload size={16} />
                        {files.length === 0 ? "Choose PDF Files" : `Add More (${files.length}/${MAX_FILES})`}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        multiple
                        onChange={handleFilesChange}
                        className="hidden"
                    />
                </label>
                {files.length > 0 && (
                    <div className="mt-3 space-y-2">
                        {files.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200">
                                <span className="text-xs font-bold text-zinc-700 truncate">{file.name}</span>
                                <button
                                    onClick={() => {
                                        const newFiles = files.filter((_, i) => i !== idx);
                                        setFiles(newFiles);
                                        setPages(pages.filter(p => p.fileIndex !== idx));
                                        // Reindex remaining files
                                        setPages(prev => prev.map(p => ({
                                            ...p,
                                            fileIndex: p.fileIndex > idx ? p.fileIndex - 1 : p.fileIndex
                                        })));
                                    }}
                                    className="text-red-500 hover:text-red-600"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

                <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm mb-6">
                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Signature Type</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setSignatureType("upload")}
                            className={`px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                signatureType === "upload"
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-slate-100 text-zinc-700 hover:bg-slate-200'
                            }`}
                        >
                            <ImageIcon size={16} />
                            Upload
                        </button>
                        <button
                            onClick={() => setSignatureType("draw")}
                            className={`px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                signatureType === "draw"
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-slate-100 text-zinc-700 hover:bg-slate-200'
                            }`}
                        >
                            <PenTool size={16} />
                            Draw
                        </button>
                        <button
                            onClick={() => setSignatureType("text")}
                            className={`px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                signatureType === "text"
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-slate-100 text-zinc-700 hover:bg-slate-200'
                            }`}
                        >
                            <Type size={16} />
                            Text
                        </button>
                        <button
                            onClick={() => setSignatureType("initials")}
                            className={`px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                signatureType === "initials"
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-slate-100 text-zinc-700 hover:bg-slate-200'
                            }`}
                        >
                            <User size={16} />
                            Initials
                        </button>
                    </div>
                </div>

                {signatureType === "upload" && (
                    <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm mb-6">
                        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Upload Signature</h3>
                        <div className="mb-3">
                            <label className="block cursor-pointer">
                                <div 
                                    onClick={() => signatureInputRef.current?.click()}
                                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-zinc-700 rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2 text-xs font-bold"
                                >
                                    <Upload size={16} />
                                    {signatureImage ? signatureImage.name : "Choose Signature Image"}
                                </div>
                                <input
                                    ref={signatureInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setSignatureImage(e.target.files[0]);
                                        }
                                    }}
                                    className="hidden"
                                />
                            </label>
                        </div>
                        {signatureImage && (
                            <div className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-zinc-700 truncate flex-1">{signatureImage.name}</span>
                                    <button
                                        onClick={() => setSignatureImage(null)}
                                        className="text-red-500 hover:text-red-600 ml-2"
                                        type="button"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                                <div className="mt-2">
                                    <img 
                                        src={URL.createObjectURL(signatureImage)} 
                                        alt="Signature preview" 
                                        className="max-w-full h-20 object-contain border border-zinc-200 rounded"
                                    />
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

                {signatureType === "draw" && (
                    <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm mb-6">
                        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Draw Signature</h3>
                        <div className="border-2 border-zinc-200 rounded-xl p-2 bg-white">
                            <canvas
                                ref={canvasRef}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                                className="border border-zinc-300 rounded-lg cursor-crosshair w-full"
                                style={{ touchAction: 'none', display: 'block', height: '200px' }}
                            />
                        </div>
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={clearDrawing}
                                type="button"
                                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-zinc-700 rounded-xl text-xs font-bold transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                )}

                {signatureType === "text" && (
                    <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm mb-6">
                        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Text Signature</h3>
                        <input
                            type="text"
                            value={signatureText}
                            onChange={(e) => setSignatureText(e.target.value)}
                            placeholder="Enter your name"
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
                                    max="100"
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
                )}

                {signatureType === "initials" && (
                    <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm mb-6">
                        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Initials</h3>
                        <input
                            type="text"
                            value={initials}
                            onChange={(e) => setInitials(e.target.value.toUpperCase())}
                            placeholder="Enter initials (e.g., JD)"
                            maxLength={5}
                            className="w-full px-4 py-3 bg-white border-2 border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 transition-colors mb-3"
                        />
                        <div>
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 block">Font Size</label>
                            <input
                                type="number"
                                value={initialsFontSize}
                                onChange={(e) => setInitialsFontSize(Number(e.target.value))}
                                min="10"
                                max="100"
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
                </div>

                <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm mb-6">
                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Date & Time</h3>
                    <label className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors mb-3">
                        <input
                            type="checkbox"
                            checked={includeDate}
                            onChange={(e) => setIncludeDate(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <span className="text-xs font-bold text-zinc-700 flex items-center gap-2">
                            <Calendar size={14} />
                            Include date
                        </span>
                    </label>
                    {includeDate && (
                        <select
                            value={dateFormat}
                            onChange={(e) => setDateFormat(e.target.value)}
                            className="w-full px-4 py-3 bg-white border-2 border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 focus:outline-none focus:border-indigo-600 transition-colors"
                        >
                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                            <option value="Month DD, YYYY">Month DD, YYYY</option>
                        </select>
                    )}
                </div>

                <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm mb-6">
                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Page Selection</h3>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <button
                            onClick={() => setPageMode("all")}
                            className={`px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                                pageMode === "all"
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-slate-100 text-zinc-700 hover:bg-slate-200'
                            }`}
                        >
                            All Pages
                        </button>
                        <button
                            onClick={() => setPageMode("selected")}
                            className={`px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                                pageMode === "selected"
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-slate-100 text-zinc-700 hover:bg-slate-200'
                            }`}
                        >
                            Selected Pages
                        </button>
                    </div>
                    <label className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                        <input
                            type="checkbox"
                            checked={usePageRange}
                            onChange={(e) => setUsePageRange(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <span className="text-xs font-bold text-zinc-700">Use page range</span>
                    </label>
                    {usePageRange && (
                        <div className="grid grid-cols-2 gap-2 mt-3">
                            <div>
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 block">From page</label>
                                <input
                                    type="number"
                                    value={pageFrom}
                                    onChange={(e) => setPageFrom(Math.max(1, Math.min(Number(e.target.value), pageTo)))}
                                    min="1"
                                    max={pages.length}
                                    className="w-full px-3 py-2 bg-white border-2 border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 focus:outline-none focus:border-indigo-600 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 block">To page</label>
                                <input
                                    type="number"
                                    value={pageTo}
                                    onChange={(e) => setPageTo(Math.max(pageFrom, Math.min(Number(e.target.value), pages.length)))}
                                    min={pageFrom}
                                    max={pages.length}
                                    className="w-full px-3 py-2 bg-white border-2 border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 focus:outline-none focus:border-indigo-600 transition-colors"
                                />
                            </div>
                        </div>
                    )}
                </div>

            <div className="mt-auto">
                <ProcessingButton
                    onClick={handleSign}
                    isProcessing={isProcessing}
                    disabled={files.length === 0 || pages.length === 0 || 
                        (signatureType === "upload" && !signatureImage) ||
                        (signatureType === "draw" && !drawnSignature) ||
                        (signatureType === "text" && !signatureText.trim()) ||
                        (signatureType === "initials" && !initials.trim())}
                    icon={PenTool}
                    text="Sign PDF"
                    processingText="Signing PDF..."
                    bgColor="bg-indigo-600"
                    className="shadow-indigo-200"
                />
            </div>
        </div>
    );

    const handleReset = () => {
        setResult(null);
        setFiles([]);
        setPages([]);
        setSignatureImage(null);
        setDrawnSignature(null);
        setSignatureText("");
        setInitials("");
        setUsePageRange(false);
        setPageFrom(1);
        setPageTo(1);
    };

    return (
        <ConversionLayout
            title="Sign PDF"
            description="Add your signature to PDF documents. Upload, draw, or type your signature."
            settingsPanel={!result ? SettingsPanel : (
                <div className="h-full flex flex-col justify-center">
                    <DownloadResult
                        fileName={result.fileName}
                        downloadUrl={result.downloadUrl}
                        onReset={handleReset}
                        stats={[
                            { label: "Files", value: files.length.toString() },
                            { label: "Pages", value: pages.length.toString() },
                            { label: "Type", value: signatureType === "upload" ? "Upload" : signatureType === "draw" ? "Draw" : signatureType === "text" ? "Text" : "Initials" },
                        ]}
                    />
                </div>
            )}
        >
            {result ? (
                <div className="w-full h-full max-w-4xl">
                    <PreviewContent url={result.downloadUrl} fileName={result.fileName} />
                </div>
            ) : isLoadingPages ? (
                <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-xs font-bold text-zinc-600 mt-2">Loading pages...</p>
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
                                        <p className="text-[10px] font-black text-zinc-600 text-center truncate">
                                            {page.fileName}
                                        </p>
                                        <p className="text-[9px] font-bold text-zinc-400 text-center">
                                            Page {page.pageIndex + 1}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center max-w-sm px-6">
                    <div className="w-24 h-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner group">
                        <PenTool className="text-indigo-400 group-hover:scale-110 transition-transform duration-500" size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 mb-3 tracking-tight">Sign PDF</h3>
                    <p className="text-zinc-500 font-medium text-sm mb-8 leading-relaxed">
                        Add your signature to PDF documents. Upload up to {MAX_FILES} PDFs and customize your signature.
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

