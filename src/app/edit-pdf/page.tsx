"use client";

import { useState, useRef, useEffect } from "react";
import {
    Pencil,
    Type,
    Square,
    Circle as CircleIcon,
    Star,
    Trash2,
    X,
    Plus,
    FileText,
    Download,
    Home,
    ChevronRight,
    MousePointer2,
    Palette,
    Minus,
    GripVertical,
    ChevronLeft,
    Layers,
    ArrowRight,
    Undo2,
    Redo2,
    Hand,
    Image as ImageIcon,
    RotateCw,
    Maximize2,
    Blend,
    Bold,
    Italic,
    Underline,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Type as TypeIcon
} from "lucide-react";
import ConversionLayout from "@/components/ConversionLayout";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";
import PreviewContent from "@/components/PreviewContent";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface EditElement {
    id: string;
    type: 'text' | 'rect' | 'circle' | 'draw' | 'symbol' | 'image';
    x: number; // percentage
    y: number; // percentage
    width?: number; // percentage
    height?: number; // percentage
    points?: { x: number; y: number }[]; // for freehand 'draw' (percentages)
    text?: string;
    symbol?: string; // Icon name
    imageData?: string; // base64 for image tool
    color?: string;
    size?: number; // fontSize or strokeWidth
    rotation?: number; // degrees
    opacity?: number; // 0-1
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    textDecoration?: string;
    backgroundColor?: string;
    textAlign?: 'left' | 'center' | 'right';
    pageIndex: number;
}

interface PageData {
    id: string;
    originalIndex: number;
    thumbnailUrl: string;
    pageWidth: number;
    pageHeight: number;
}

const SYMBOLS = ["Star", "Heart", "Check", "X", "Arrow"];

export default function EditPDF() {
    const [file, setFile] = useState<File | null>(null);
    const [pages, setPages] = useState<PageData[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoadingPages, setIsLoadingPages] = useState(false);
    const [result, setResult] = useState<{ fileName: string; downloadUrl: string } | null>(null);
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
    const [elements, setElements] = useState<EditElement[]>([]);

    // Tools State
    const [activeTool, setActiveTool] = useState<'select' | 'text' | 'rect' | 'circle' | 'draw' | 'symbol' | 'image'>('select');
    const [currentColor, setCurrentColor] = useState("#4f46e5");
    const [currentSize, setCurrentSize] = useState(4);
    const [currentSymbol, setCurrentSymbol] = useState("Star");
    const [zoom, setZoom] = useState(100);

    // Interaction State
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const [tempElement, setTempElement] = useState<Partial<EditElement> | null>(null);
    const [editingTextId, setEditingTextId] = useState<string | null>(null);
    const [editingTextValue, setEditingTextValue] = useState("");
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [draggingElementId, setDraggingElementId] = useState<string | null>(null);
    const [resizingElementId, setResizingElementId] = useState<string | null>(null);
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const containerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const imageRefs = useRef<{ [key: string]: HTMLImageElement | null }>({});
    const pdfDocRef = useRef<any>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.type === "application/pdf") {
            setFile(selectedFile);
            loadPDFPages(selectedFile);
        }
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.type.startsWith("image/") && selectedPageId) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                const newId = `edit-${Date.now()}`;
                const pageIndex = pages.findIndex(p => p.id === selectedPageId);

                const newElement: EditElement = {
                    id: newId,
                    type: 'image',
                    x: 20, // Center-ish
                    y: 20,
                    width: 30, // Default 30% width
                    height: 30,
                    imageData: dataUrl,
                    pageIndex
                };
                setElements(prev => [...prev, newElement]);
                setActiveTool('select');
            };
            reader.readAsDataURL(selectedFile);
        }
    };

    const loadPDFPages = async (pdfFile: File) => {
        setIsLoadingPages(true);
        setPages([]);
        setElements([]);
        try {
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

            const arrayBuffer = await pdfFile.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            pdfDocRef.current = pdf;

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
                        canvasContext: context as any,
                        viewport: viewport,
                        canvas: canvas as any
                    }).promise;

                    loadedPages.push({
                        id: `page-${i}-${Date.now()}`,
                        originalIndex: i - 1,
                        thumbnailUrl: canvas.toDataURL(),
                        pageWidth: viewport.width,
                        pageHeight: viewport.height,
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

    const getImageBounds = (pageId: string) => {
        const container = containerRefs.current[pageId];
        const image = imageRefs.current[pageId];
        if (!container || !image) return null;

        const containerRect = container.getBoundingClientRect();
        const imageRect = image.getBoundingClientRect();

        const naturalWidth = image.naturalWidth;
        const naturalHeight = image.naturalHeight;

        if (!naturalWidth || !naturalHeight) return null;

        const contentRatio = naturalWidth / naturalHeight;
        const containerRatio = imageRect.width / imageRect.height;

        let renderedWidth, renderedHeight, renderedLeft, renderedTop;

        if (containerRatio > contentRatio) {
            renderedHeight = imageRect.height;
            renderedWidth = renderedHeight * contentRatio;
            renderedLeft = (imageRect.width - renderedWidth) / 2;
            renderedTop = 0;
        } else {
            renderedWidth = imageRect.width;
            renderedHeight = renderedWidth / contentRatio;
            renderedLeft = 0;
            renderedTop = (imageRect.height - renderedHeight) / 2;
        }

        return {
            left: (imageRect.left - containerRect.left) + renderedLeft,
            top: (imageRect.top - containerRect.top) + renderedTop,
            width: renderedWidth,
            height: renderedHeight,
        };
    };

    const handleMouseDown = (e: React.MouseEvent, pageId: string) => {
        if (editingTextId) return;

        const bounds = getImageBounds(pageId);
        if (!bounds) return;

        const container = containerRefs.current[pageId];
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const mouseX = e.clientX - containerRect.left;
        const mouseY = e.clientY - containerRect.top;

        const x = ((mouseX - bounds.left) / bounds.width) * 100;
        const y = ((mouseY - bounds.top) / bounds.height) * 100;

        if (activeTool === 'select') {
            const pageIndex = pages.findIndex(p => p.id === pageId);
            // Find if mouse is over an element
            const clickedElement = elements.slice().reverse().find(el => {
                if (el.pageIndex !== pageIndex) return false;
                const elW = el.width || 5; // default touch/click area for text
                const elH = el.height || 5;
                return x >= el.x && x <= el.x + elW && y >= el.y && y <= el.y + elH;
            });

            if (clickedElement) {
                setSelectedElementId(clickedElement.id);
                setDraggingElementId(clickedElement.id);
                setIsDragging(true);
                setDragStart({ x, y });
            } else {
                setSelectedElementId(null);
            }
            return;
        }

        if (activeTool === 'image') return;

        setIsDragging(true);
        setDragStart({ x, y });

        const pageIndex = pages.findIndex(p => p.id === pageId);

        if (activeTool === 'draw') {
            setTempElement({
                type: 'draw',
                points: [{ x, y }],
                color: currentColor,
                size: currentSize,
                pageIndex
            });
        } else if (activeTool === 'text') {
            const newId = `edit-${Date.now()}`;
            const newElement: EditElement = {
                id: newId,
                type: 'text',
                x,
                y,
                text: "",
                color: currentColor,
                size: currentSize * 4,
                pageIndex
            };
            setElements(prev => [...prev, newElement]);
            setEditingTextId(newId);
            setEditingTextValue("");
            setIsDragging(false);
        } else if (activeTool === 'symbol') {
            const defaultSize = 5; // 5% of page
            const newElement: EditElement = {
                id: `edit-${Date.now()}`,
                type: 'symbol',
                x: x - defaultSize / 2,
                y: y - defaultSize / 2,
                width: defaultSize,
                height: defaultSize,
                symbol: currentSymbol,
                color: currentColor,
                size: currentSize * 10,
                pageIndex
            };
            setElements(prev => [...prev, newElement]);
            setIsDragging(false);
        } else {
            setTempElement({
                type: activeTool as any,
                x,
                y,
                width: 0,
                height: 0,
                color: currentColor,
                size: currentSize,
                pageIndex
            });
        }
    };

    const handleMouseMove = (e: React.MouseEvent, pageId: string) => {
        if (!isDragging || !dragStart) return;

        const bounds = getImageBounds(pageId);
        if (!bounds) return;

        const container = containerRefs.current[pageId];
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const mouseX = e.clientX - containerRect.left;
        const mouseY = e.clientY - containerRect.top;

        const constrainedX = Math.max(bounds.left, Math.min(mouseX, bounds.left + bounds.width));
        const constrainedY = Math.max(bounds.top, Math.min(mouseY, bounds.top + bounds.height));

        const currentX = ((constrainedX - bounds.left) / bounds.width) * 100;
        const currentY = ((constrainedY - bounds.top) / bounds.height) * 100;

        if (draggingElementId) {
            const dx = currentX - dragStart.x;
            const dy = currentY - dragStart.y;
            setElements(prev => prev.map(el =>
                el.id === draggingElementId ? { ...el, x: el.x + dx, y: el.y + dy } : el
            ));
            setDragStart({ x: currentX, y: currentY });
            return;
        }

        if (resizingElementId) {
            const dx = currentX - dragStart.x;
            const dy = currentY - dragStart.y;
            setElements(prev => prev.map(el =>
                el.id === resizingElementId ? {
                    ...el,
                    width: Math.max(1, (el.width || 0) + dx),
                    height: Math.max(1, (el.height || 0) + dy)
                } : el
            ));
            setDragStart({ x: currentX, y: currentY });
            return;
        }

        if (!tempElement) return;

        if (tempElement.type === 'draw') {
            setTempElement(prev => ({
                ...prev,
                points: [...(prev?.points || []), { x: currentX, y: currentY }]
            }));
        } else {
            const x = Math.min(dragStart.x, currentX);
            const y = Math.min(dragStart.y, currentY);
            const width = Math.abs(currentX - dragStart.x);
            const height = Math.abs(currentY - dragStart.y);
            setTempElement(prev => ({ ...prev, x, y, width, height }));
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setDraggingElementId(null);
        setResizingElementId(null);

        if (tempElement) {
            if (tempElement.type === 'draw') {
                if (tempElement.points && tempElement.points.length > 1) {
                    setElements(prev => [...prev, { ...tempElement, id: `edit-${Date.now()}` } as EditElement]);
                }
            } else if (tempElement.width && tempElement.height && (tempElement.width > 0.5 || tempElement.height > 0.5)) {
                setElements(prev => [...prev, { ...tempElement, id: `edit-${Date.now()}` } as EditElement]);
            }
        }
        setTempElement(null);
        setDragStart(null);
    };

    const removeElement = (id: string) => {
        setElements(prev => prev.filter(el => el.id !== id));
        if (editingTextId === id) setEditingTextId(null);
        if (selectedElementId === id) setSelectedElementId(null);
    };

    const removeAllElements = () => {
        setElements([]);
        setEditingTextId(null);
        setSelectedElementId(null);
        setShowRemoveConfirm(false);
    };

    const updateElement = (id: string, updates: Partial<EditElement>) => {
        setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
    };

    const moveToFront = (id: string) => {
        setElements(prev => {
            const index = prev.findIndex(el => el.id === id);
            if (index === -1) return prev;
            const newElements = [...prev];
            const element = newElements.splice(index, 1)[0];
            newElements.push(element);
            return newElements;
        });
    };

    const moveToBack = (id: string) => {
        setElements(prev => {
            const index = prev.findIndex(el => el.id === id);
            if (index === -1) return prev;
            const newElements = [...prev];
            const element = newElements.splice(index, 1)[0];
            newElements.unshift(element);
            return newElements;
        });
    };

    const handleTextEditComplete = () => {
        if (editingTextId) {
            if (editingTextValue.trim() === "") {
                removeElement(editingTextId);
            } else {
                setElements(prev => prev.map(el =>
                    el.id === editingTextId ? { ...el, text: editingTextValue } : el
                ));
            }
            setEditingTextId(null);
            setEditingTextValue("");
        }
    };

    const handleSave = async () => {
        if (!file || elements.length === 0 || !pdfDocRef.current) return;

        setIsProcessing(true);
        try {
            const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
            const pdfData = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(pdfData);
            const pagesInDoc = pdfDoc.getPages();

            const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

            for (const el of elements) {
                const page = pagesInDoc[el.pageIndex];
                if (!page) continue;

                const { width, height } = page.getSize();
                const colorHex = el.color || "#000000";
                const color = hexToRgb(colorHex);
                const rgbColor = rgb(color.r / 255, color.g / 255, color.b / 255);

                const x = (el.x / 100) * width;
                const y = height - ((el.y / 100) * height);
                const elWidth = (el.width || 0) / 100 * width;
                const elHeight = (el.height || 0) / 100 * height;
                const elSize = el.size || 12;

                if (el.type === 'rect') {
                    page.drawRectangle({
                        x,
                        y: y - elHeight,
                        width: elWidth,
                        height: elHeight,
                        borderColor: rgbColor,
                        borderWidth: elSize,
                        opacity: el.opacity,
                        rotate: { type: 'degrees', angle: el.rotation || 0 } as any,
                    });
                } else if (el.type === 'circle') {
                    page.drawEllipse({
                        x: x + elWidth / 2,
                        y: y - elHeight / 2,
                        xScale: elWidth / 2,
                        yScale: elHeight / 2,
                        borderColor: rgbColor,
                        borderWidth: elSize,
                        opacity: el.opacity,
                    });
                } else if (el.type === 'text') {
                    // Font Selection
                    let fontSelection: any = StandardFonts.Helvetica;
                    if (el.fontFamily?.includes('serif') && !el.fontFamily?.includes('sans')) {
                        if (el.fontWeight === 'bold') {
                            fontSelection = el.fontStyle === 'italic' ? StandardFonts.TimesRomanBoldItalic : StandardFonts.TimesRomanBold;
                        } else {
                            fontSelection = el.fontStyle === 'italic' ? StandardFonts.TimesRomanItalic : StandardFonts.TimesRoman;
                        }
                    } else if (el.fontFamily?.includes('monospace')) {
                        if (el.fontWeight === 'bold') {
                            fontSelection = el.fontStyle === 'italic' ? StandardFonts.CourierBoldOblique : StandardFonts.CourierBold;
                        } else {
                            fontSelection = el.fontStyle === 'italic' ? StandardFonts.CourierOblique : StandardFonts.Courier;
                        }
                    } else {
                        if (el.fontWeight === 'bold') {
                            fontSelection = el.fontStyle === 'italic' ? StandardFonts.HelveticaBoldOblique : StandardFonts.HelveticaBold;
                        } else {
                            fontSelection = el.fontStyle === 'italic' ? StandardFonts.HelveticaOblique : StandardFonts.Helvetica;
                        }
                    }

                    const embeddedFont = await pdfDoc.embedFont(fontSelection);
                    const textContent = el.text || "";

                    if (el.backgroundColor && el.backgroundColor !== 'transparent') {
                        const bg = hexToRgb(el.backgroundColor);
                        const textWidth = embeddedFont.widthOfTextAtSize(textContent, elSize);
                        page.drawRectangle({
                            x: x - 2,
                            y: y - elSize - 2,
                            width: textWidth + 4,
                            height: elSize + 4,
                            color: rgb(bg.r / 255, bg.g / 255, bg.b / 255),
                            opacity: el.opacity,
                        });
                    }

                    page.drawText(textContent, {
                        x,
                        y: y - elSize,
                        size: elSize,
                        font: embeddedFont,
                        color: rgbColor,
                        opacity: el.opacity,
                        rotate: { type: 'degrees', angle: el.rotation || 0 } as any,
                    });

                    if (el.textDecoration === 'underline') {
                        const textWidth = embeddedFont.widthOfTextAtSize(textContent, elSize);
                        page.drawLine({
                            start: { x, y: y - elSize - 2 },
                            end: { x: x + textWidth, y: y - elSize - 2 },
                            thickness: 1,
                            color: rgbColor,
                            opacity: el.opacity,
                        });
                    }
                } else if (el.type === 'draw' && el.points) {
                    for (let i = 0; i < el.points.length - 1; i++) {
                        const start = el.points[i];
                        const end = el.points[i + 1];
                        page.drawLine({
                            start: { x: (start.x / 100) * width, y: height - (start.y / 100) * height },
                            end: { x: (end.x / 100) * width, y: height - (end.y / 100) * height },
                            thickness: elSize,
                            color: rgbColor,
                            opacity: el.opacity,
                        });
                    }
                } else if (el.type === 'symbol') {
                    const text = el.symbol === "Star" ? "★" : el.symbol === "Heart" ? "❤" : el.symbol === "Check" ? "✔" : el.symbol === "X" ? "✖" : "➡";
                    const sSize = el.height ? elHeight : elSize;
                    page.drawText(text, {
                        x,
                        y: y - sSize,
                        size: sSize,
                        color: rgbColor,
                        opacity: el.opacity,
                    });
                } else if (el.type === 'image' && el.imageData) {
                    try {
                        const isPng = el.imageData.includes('image/png');
                        const image = isPng ? await pdfDoc.embedPng(el.imageData) : await pdfDoc.embedJpg(el.imageData);
                        page.drawImage(image, {
                            x,
                            y: y - elHeight,
                            width: elWidth,
                            height: elHeight,
                            opacity: el.opacity,
                            rotate: { type: 'degrees', angle: el.rotation || 0 } as any,
                        });
                    } catch (e) {
                        console.error("Error embedding image:", e);
                    }
                }
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
            const downloadUrl = URL.createObjectURL(blob);

            setResult({
                fileName: `edited_${file.name}`,
                downloadUrl,
            });
        } catch (error) {
            console.error("Save error:", error);
            alert("Error saving PDF");
        } finally {
            setIsProcessing(false);
        }
    };

    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 0, b: 0 };
    };

    const handleReset = () => {
        setFile(null);
        setPages([]);
        setElements([]);
        setResult(null);
        setSelectedPageId(null);
        setSelectedElementId(null);
    };

    const selectedPage = pages.find(p => p.id === selectedPageId);
    const pageElements = selectedPage ? elements.filter(el => el.pageIndex === pages.findIndex(p => p.id === selectedPageId)) : [];

    const TopToolbar = (
        <div className="bg-white border-b border-zinc-200 px-4 py-2 flex items-center justify-between shadow-sm sticky top-0 z-50">
            <div className="flex items-center gap-2">
                <Link
                    href="/"
                    className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all mr-2 flex items-center gap-2 group"
                    title="Back to Home"
                >
                    <Home size={20} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Home</span>
                </Link>
                <div className="w-px h-6 bg-zinc-200 mx-2" />
                <div className="flex items-center gap-1 mr-4">
                    {[
                        { id: 'select', icon: Hand, label: 'Hand Tool' },
                        { id: 'text', icon: Type, label: 'Add Text' },
                        { id: 'image', icon: ImageIcon, label: 'Add Image' },
                        { id: 'draw', icon: Pencil, label: 'Draw' },
                    ].map(tool => (
                        <button
                            key={tool.id}
                            onClick={() => {
                                if (tool.id === 'image') {
                                    imageInputRef.current?.click();
                                } else if (tool.id === 'text') {
                                    if (!selectedPageId) return;
                                    const pageIndex = pages.findIndex(p => p.id === selectedPageId);
                                    const newId = `edit-${Date.now()}`;
                                    const newElement: EditElement = {
                                        id: newId,
                                        type: 'text',
                                        x: 35, // Near center
                                        y: 40,
                                        text: "Type your text here",
                                        color: "#000000",
                                        backgroundColor: "transparent",
                                        fontFamily: "Inter, sans-serif",
                                        size: 18,
                                        fontWeight: "normal",
                                        fontStyle: "normal",
                                        textDecoration: "none",
                                        textAlign: "left",
                                        pageIndex
                                    };
                                    setElements(prev => [...prev, newElement]);
                                    setSelectedElementId(newId);
                                    setEditingTextId(newId);
                                    setEditingTextValue("Type your text here");
                                    setActiveTool('select');
                                } else {
                                    setActiveTool(tool.id as any);
                                }
                            }}
                            title={tool.label}
                            className={`p-2 rounded-lg transition-all ${activeTool === tool.id ? 'bg-indigo-50 text-indigo-600' : 'text-zinc-500 hover:bg-zinc-100'}`}
                        >
                            <tool.icon size={18} />
                        </button>
                    ))}
                    <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />

                    <div className="relative group">
                        <button className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-lg">
                            <Square size={18} style={{ color: currentColor }} />
                        </button>
                        {/* Invisible bridge to keep menu open while hovering between button and menu */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-full h-4 bg-transparent hidden group-hover:block z-[55]" />

                        <div className="absolute top-full left-0 mt-2 bg-transparent hidden group-hover:block z-[60] min-w-[200px]">
                            <div className="p-4 bg-white border border-zinc-200 shadow-2xl rounded-2xl relative">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Shapes</span>
                                    <div className="flex gap-1">
                                        <button onClick={() => setActiveTool('rect')} className={`p-1.5 rounded-md ${activeTool === 'rect' ? 'bg-indigo-600 text-white' : 'hover:bg-zinc-100 text-zinc-600'}`}><Square size={14} /></button>
                                        <button onClick={() => setActiveTool('circle')} className={`p-1.5 rounded-md ${activeTool === 'circle' ? 'bg-indigo-600 text-white' : 'hover:bg-zinc-100 text-zinc-600'}`}><CircleIcon size={14} /></button>
                                        <button onClick={() => setActiveTool('symbol')} className={`p-1.5 rounded-md ${activeTool === 'symbol' ? 'bg-indigo-600 text-white' : 'hover:bg-zinc-100 text-zinc-600'}`}><Star size={14} /></button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-zinc-600">Color</span>
                                        <input
                                            type="color"
                                            value={currentColor}
                                            onChange={(e) => setCurrentColor(e.target.value)}
                                            className="w-10 h-10 rounded-lg border-2 border-zinc-100 cursor-pointer"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-xs font-bold text-zinc-600">Stroke</span>
                                            <span className="text-xs font-black text-indigo-600">{currentSize}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="20"
                                            value={currentSize}
                                            onChange={(e) => setCurrentSize(parseInt(e.target.value))}
                                            className="w-full accent-indigo-600"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-6 w-px bg-zinc-200 mx-2" />

                <div className="flex items-center gap-1">
                    <button className="p-2 text-zinc-300 cursor-not-allowed"><Undo2 size={18} /></button>
                    <button className="p-2 text-zinc-300 cursor-not-allowed"><Redo2 size={18} /></button>
                    <button onClick={() => setShowRemoveConfirm(true)} className="p-2 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-lg ml-2" title="Remove All Edits">
                        <Trash2 size={18} />
                    </button>
                </div>

                <div className="h-6 w-px bg-zinc-200 mx-2" />

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-zinc-100 rounded-lg p-1">
                        <button onClick={() => setZoom(Math.max(25, zoom - 25))} className="p-1 text-zinc-500 hover:text-zinc-800"><Minus size={14} /></button>
                        <span className="text-[10px] font-black px-2 min-w-[45px] text-center">{zoom}%</span>
                        <button onClick={() => setZoom(Math.min(200, zoom + 25))} className="p-1 text-zinc-500 hover:text-zinc-800"><Plus size={14} /></button>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={handleReset}
                    className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-xl transition-all mr-2"
                    title="Close Editor"
                >
                    <X size={20} />
                </button>
                <ProcessingButton
                    onClick={handleSave}
                    isProcessing={isProcessing}
                    disabled={!file || elements.length === 0}
                    icon={Download}
                    text="Export PDF"
                    processingText="Exporting..."
                    bgColor="bg-red-600"
                    className="!py-2.5 !px-5 !text-[11px] !font-black !rounded-xl shadow-lg shadow-red-100 hover:shadow-red-200 transition-all active:scale-95"
                />
            </div>
        </div>
    );

    const RightPanel = (
        <div className="flex flex-col h-full">
            <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 mb-6">
                <p className="text-xs font-semibold text-sky-800 leading-relaxed text-center">
                    Reorder items to move them to the back or front.
                </p>
            </div>

            <div className="flex items-center justify-between mb-4">
                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">
                    Page {selectedPageId?.split('-')[1] || '1'} Edits
                </label>
                <button
                    onClick={removeAllElements}
                    className="text-[11px] font-black text-red-500 hover:text-red-700 underline decoration-red-200"
                >
                    Remove all
                </button>
            </div>

            <div className="flex-1 space-y-3 pb-8">
                {elements.filter(el => pages[el.pageIndex]?.id === selectedPageId).length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center opacity-40 text-center px-4">
                        <Plus size={24} className="mb-2" />
                        <p className="text-[11px] font-bold">No edits on this page.</p>
                    </div>
                ) : (
                    elements
                        .filter(el => pages[el.pageIndex]?.id === selectedPageId)
                        .map((el, idx) => (
                            <div
                                key={el.id}
                                className="bg-white border border-zinc-200 rounded-xl p-3 flex items-center justify-between hover:border-indigo-200 transition-all shadow-sm hover:shadow-md"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="text-zinc-400 cursor-grab active:cursor-grabbing">
                                        <GripVertical size={14} />
                                    </div>
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-50 border border-zinc-100 text-zinc-500">
                                        {el.type === 'text' && <Type size={14} />}
                                        {el.type === 'rect' && <Square size={14} />}
                                        {el.type === 'circle' && <CircleIcon size={14} />}
                                        {el.type === 'draw' && <Pencil size={14} />}
                                        {el.type === 'symbol' && <Star size={14} />}
                                        {el.type === 'image' && <ImageIcon size={14} />}
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold text-zinc-700 capitalize">
                                            {el.text ? (el.text.length > 15 ? el.text.substring(0, 15) + '...' : el.text) : `New ${el.type} ${idx + 1}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {el.type === 'text' && (
                                        <button
                                            onClick={() => {
                                                setEditingTextId(el.id);
                                                setEditingTextValue(el.text || "");
                                            }}
                                            className="p-1.5 text-zinc-400 hover:text-indigo-600 transition-colors"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => removeElement(el.id)}
                                        className="p-1.5 text-zinc-400 hover:text-red-600 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))
                ).reverse()}
            </div>

            <div className="pt-6 border-t border-zinc-100">
                <ProcessingButton
                    onClick={handleSave}
                    isProcessing={isProcessing}
                    disabled={elements.length === 0}
                    icon={Download}
                    text="Export PDF"
                    processingText="Exporting..."
                    bgColor="bg-red-600"
                    className="w-full !py-4 !rounded-2xl shadow-xl shadow-red-100 hover:bg-red-700 transition-all active:scale-[0.98]"
                />
            </div>
        </div>
    );

    return (
        <ConversionLayout
            title="Edit PDF"
            description="Add shapes, draw freehand, insert text and symbols into your PDF documents with professional tools."
            variant="full"
            settingsPanel={result ? (
                <div className="h-full flex flex-col justify-center">
                    <DownloadResult
                        fileName={result?.fileName || ""}
                        downloadUrl={result?.downloadUrl || ""}
                        onReset={handleReset}
                        stats={[
                            { label: "Elements", value: elements.length.toString() },
                            { label: "Status", value: "Success" }
                        ]}
                    />
                </div>
            ) : (file && pages.length > 0 ? RightPanel : null)}
        >
            <div className="flex flex-col w-full h-full overflow-hidden bg-zinc-50 rounded-2xl border border-zinc-100">
                {file && pages.length > 0 && !result && TopToolbar}

                <div className="flex flex-1 overflow-hidden">
                    {/* Left Sidebar Thumbnails */}
                    {file && pages.length > 0 && !result && (
                        <div className="w-24 border-r border-zinc-200 bg-white flex flex-col h-full overflow-hidden shrink-0">
                            <div className="p-2 border-b border-zinc-100 flex items-center justify-center">
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Pages</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-3 scrollbar-hide">
                                {pages.map((page, idx) => (
                                    <button
                                        key={page.id}
                                        onClick={() => setSelectedPageId(page.id)}
                                        className={`w-full aspect-[3/4] rounded-lg border-2 overflow-hidden transition-all relative group ${selectedPageId === page.id ? 'border-indigo-600 shadow-md' : 'border-zinc-100 hover:border-zinc-300'}`}
                                    >
                                        <img src={page.thumbnailUrl} className="w-full h-full object-cover" alt={`Page ${idx + 1}`} />
                                        <div className={`absolute inset-0 bg-indigo-600/5 transition-opacity ${selectedPageId === page.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                                        <div className="absolute bottom-1 right-1 bg-zinc-900/60 text-white text-[8px] font-black px-1 py-0.5 rounded backdrop-blur-sm">
                                            {idx + 1}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-100/30">
                        {!file ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-white">
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="w-24 h-24 bg-red-50 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner group"
                                >
                                    <Pencil className="text-red-400 group-hover:scale-110 transition-transform duration-500" size={48} />
                                </motion.div>
                                <h3 className="text-3xl font-black text-zinc-900 mb-3 tracking-tight">Professional PDF Editor</h3>
                                <p className="text-zinc-500 font-medium text-sm mb-8 max-w-sm">
                                    Full-featured editing: add shapes, draw, insert text and symbols. All processing happens in your browser for maximum security.
                                </p>
                                <label className="inline-flex items-center gap-3 px-8 py-4 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 cursor-pointer transition-all shadow-xl shadow-red-200 active:scale-95 group">
                                    <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" />
                                    <span>Select PDF File</span>
                                    <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" ref={fileInputRef} />
                                </label>
                            </div>
                        ) : pages.length > 0 ? (
                            <div className="flex flex-col h-full overflow-hidden relative">
                                {result ? (
                                    <div className="w-full h-full p-8">
                                        <PreviewContent url={result.downloadUrl} fileName={result.fileName} />
                                    </div>
                                ) : (
                                    <>
                                        {/* Editor Canvas Container */}
                                        <div className="flex-1 overflow-auto flex flex-col items-center p-8 sm:p-12 scrollbar-thin">
                                            {selectedPage && (
                                                <div
                                                    ref={el => { if (el) containerRefs.current[selectedPage.id] = el }}
                                                    onMouseDown={e => handleMouseDown(e, selectedPage.id)}
                                                    onMouseMove={e => handleMouseMove(e, selectedPage.id)}
                                                    onMouseUp={handleMouseUp}
                                                    onMouseLeave={handleMouseUp}
                                                    className={`relative shadow-2xl bg-white mb-20 shrink-0 ${activeTool === 'select' ? 'cursor-default' :
                                                        activeTool === 'text' ? 'cursor-text' :
                                                            'cursor-crosshair'
                                                        }`}
                                                    style={{
                                                        width: `${zoom * 0.8}%`, // Slightly restricted to fit better
                                                        maxWidth: '100%',
                                                        aspectRatio: `${selectedPage.pageWidth}/${selectedPage.pageHeight}`
                                                    }}
                                                >
                                                    <img
                                                        ref={el => { if (el) imageRefs.current[selectedPage.id] = el }}
                                                        src={selectedPage.thumbnailUrl}
                                                        alt="Current Page"
                                                        className="w-full h-full object-contain pointer-events-none select-none"
                                                        draggable={false}
                                                    />

                                                    {/* Placed Elements */}
                                                    {(() => {
                                                        const bounds = getImageBounds(selectedPage.id);
                                                        if (!bounds) return null;

                                                        return pageElements.map(el => {
                                                            const left = (el.x / 100) * bounds.width + bounds.left;
                                                            const top = (el.y / 100) * bounds.height + bounds.top;
                                                            const w = (el.width || 0) / 100 * bounds.width;
                                                            const h = (el.height || 0) / 100 * bounds.height;
                                                            const isSelected = selectedElementId === el.id;

                                                            return (
                                                                <div
                                                                    key={el.id}
                                                                    onMouseDown={(e) => {
                                                                        if (activeTool === 'select') {
                                                                            e.stopPropagation();
                                                                            setSelectedElementId(el.id);
                                                                            setDraggingElementId(el.id);
                                                                            setIsDragging(true);
                                                                            const bounds = getImageBounds(selectedPage.id);
                                                                            const rect = containerRefs.current[selectedPage.id]?.getBoundingClientRect();
                                                                            if (bounds && rect) {
                                                                                setDragStart({
                                                                                    x: ((e.clientX - rect.left - bounds.left) / bounds.width) * 100,
                                                                                    y: ((e.clientY - rect.top - bounds.top) / bounds.height) * 100
                                                                                });
                                                                            }
                                                                        }
                                                                    }}
                                                                    onClick={(e) => {
                                                                        if (activeTool === 'select') {
                                                                            e.stopPropagation();
                                                                            setSelectedElementId(el.id);
                                                                        }
                                                                    }}
                                                                    className={`absolute group ${activeTool === 'select' ? 'pointer-events-auto' : 'pointer-events-none'}`}
                                                                    style={{
                                                                        left: el.type === 'draw' ? 0 : left,
                                                                        top: el.type === 'draw' ? 0 : top,
                                                                        width: el.type === 'draw' ? '100%' : (w || 'auto'),
                                                                        height: el.type === 'draw' ? '100%' : (h || 'auto'),
                                                                        color: el.color,
                                                                        transform: `rotate(${el.rotation || 0}deg)`,
                                                                        zIndex: elements.indexOf(el),
                                                                        cursor: activeTool === 'select' ? 'move' : (el.type === 'text' ? 'text' : 'default')
                                                                    }}
                                                                >
                                                                    {isSelected && el.type !== 'draw' && (
                                                                        <div className="absolute -inset-2 border-2 border-indigo-500 border-dashed rounded-lg pointer-events-none animate-pulse" />
                                                                    )}

                                                                    {isSelected && el.type !== 'draw' && (
                                                                        <>
                                                                            <div
                                                                                className="absolute bottom-0 right-0 w-4 h-4 bg-indigo-500 rounded-full cursor-se-resize -mb-2 -mr-2 shadow-lg z-[110]"
                                                                                onMouseDown={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setResizingElementId(el.id);
                                                                                    setIsDragging(true);
                                                                                    const rect = containerRefs.current[selectedPage.id]?.getBoundingClientRect();
                                                                                    if (rect) {
                                                                                        setDragStart({
                                                                                            x: ((e.clientX - rect.left - bounds.left) / bounds.width) * 100,
                                                                                            y: ((e.clientY - rect.top - bounds.top) / bounds.height) * 100
                                                                                        });
                                                                                    }
                                                                                }}
                                                                            />
                                                                            <div
                                                                                onMouseDown={e => e.stopPropagation()}
                                                                                className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-4 flex items-center gap-1 bg-zinc-900/95 text-white p-1.5 rounded-xl shadow-2xl backdrop-blur-md border border-white/10 z-[110] whitespace-nowrap`}
                                                                            >
                                                                                {/* Rotation (Common) */}
                                                                                <button onClick={(e) => { e.stopPropagation(); updateElement(el.id, { rotation: (el.rotation || 0) + 15 }) }} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Rotate">
                                                                                    <RotateCw size={14} />
                                                                                </button>

                                                                                {el.type === 'text' && (
                                                                                    <>
                                                                                        <div className="w-[1px] h-4 bg-white/10 mx-1" />
                                                                                        {/* Font Family */}
                                                                                        <select
                                                                                            value={el.fontFamily || "Inter, sans-serif"}
                                                                                            onChange={(e) => updateElement(el.id, { fontFamily: e.target.value })}
                                                                                            className="bg-white/10 text-[10px] text-white outline-none rounded px-1 py-0.5 border-none"
                                                                                        >
                                                                                            <option value="Inter, sans-serif" className="text-black">Sans</option>
                                                                                            <option value="serif" className="text-black">Serif</option>
                                                                                            <option value="monospace" className="text-black">Mono</option>
                                                                                            <option value="cursive" className="text-black">Cursive</option>
                                                                                        </select>

                                                                                        {/* Font Size */}
                                                                                        <input
                                                                                            type="number"
                                                                                            value={el.size || 18}
                                                                                            onChange={(e) => updateElement(el.id, { size: parseInt(e.target.value) || 1 })}
                                                                                            className="w-10 bg-white/10 text-[10px] text-white outline-none rounded px-1 py-0.5"
                                                                                        />

                                                                                        <div className="w-[1px] h-4 bg-white/10 mx-1" />

                                                                                        {/* Styles */}
                                                                                        <button onClick={() => updateElement(el.id, { fontWeight: el.fontWeight === 'bold' ? 'normal' : 'bold' })} className={`p-1.5 rounded-lg transition-colors ${el.fontWeight === 'bold' ? 'bg-indigo-600' : 'hover:bg-white/10'}`}>
                                                                                            <Bold size={14} />
                                                                                        </button>
                                                                                        <button onClick={() => updateElement(el.id, { fontStyle: el.fontStyle === 'italic' ? 'normal' : 'italic' })} className={`p-1.5 rounded-lg transition-colors ${el.fontStyle === 'italic' ? 'bg-indigo-600' : 'hover:bg-white/10'}`}>
                                                                                            <Italic size={14} />
                                                                                        </button>
                                                                                        <button onClick={() => updateElement(el.id, { textDecoration: el.textDecoration === 'underline' ? 'none' : 'underline' })} className={`p-1.5 rounded-lg transition-colors ${el.textDecoration === 'underline' ? 'bg-indigo-600' : 'hover:bg-white/10'}`}>
                                                                                            <Underline size={14} />
                                                                                        </button>

                                                                                        <div className="w-[1px] h-4 bg-white/10 mx-1" />

                                                                                        {/* Text Color */}
                                                                                        <div className="relative group/color p-1 hover:bg-white/10 rounded-lg cursor-pointer">
                                                                                            <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: el.color || '#000000' }} />
                                                                                            <input
                                                                                                type="color"
                                                                                                value={el.color || "#000000"}
                                                                                                onChange={(e) => updateElement(el.id, { color: e.target.value })}
                                                                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                                                            />
                                                                                        </div>

                                                                                        {/* BG Color */}
                                                                                        <div className="relative group/bg p-1 hover:bg-white/10 rounded-lg cursor-pointer">
                                                                                            <div className="w-4 h-4 rounded-sm border border-white/20 bg-white/20 flex items-center justify-center">
                                                                                                <div className="w-3 h-3 border border-white/40" style={{ backgroundColor: el.backgroundColor === 'transparent' ? 'transparent' : el.backgroundColor }} />
                                                                                            </div>
                                                                                            <input
                                                                                                type="color"
                                                                                                value={el.backgroundColor === 'transparent' ? '#ffffff' : el.backgroundColor}
                                                                                                onChange={(e) => updateElement(el.id, { backgroundColor: e.target.value })}
                                                                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                                                            />
                                                                                            <button
                                                                                                onClick={(e) => { e.stopPropagation(); updateElement(el.id, { backgroundColor: 'transparent' }) }}
                                                                                                className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full hidden group-hover/bg:block"
                                                                                            />
                                                                                        </div>

                                                                                        <div className="w-[1px] h-4 bg-white/10 mx-1" />

                                                                                        {/* Alignment */}
                                                                                        <button onClick={() => updateElement(el.id, { textAlign: 'left' })} className={`p-1.5 rounded-lg transition-colors ${el.textAlign === 'left' ? 'bg-indigo-600' : 'hover:bg-white/10'}`}>
                                                                                            <AlignLeft size={14} />
                                                                                        </button>
                                                                                        <button onClick={() => updateElement(el.id, { textAlign: 'center' })} className={`p-1.5 rounded-lg transition-colors ${el.textAlign === 'center' ? 'bg-indigo-600' : 'hover:bg-white/10'}`}>
                                                                                            <AlignCenter size={14} />
                                                                                        </button>
                                                                                        <button onClick={() => updateElement(el.id, { textAlign: 'right' })} className={`p-1.5 rounded-lg transition-colors ${el.textAlign === 'right' ? 'bg-indigo-600' : 'hover:bg-white/10'}`}>
                                                                                            <AlignRight size={14} />
                                                                                        </button>
                                                                                    </>
                                                                                )}

                                                                                {(el.type === 'rect' || el.type === 'circle' || el.type === 'symbol') && (
                                                                                    <>
                                                                                        <div className="w-[1px] h-4 bg-white/10 mx-1" />
                                                                                        <div className="relative group/color p-1 hover:bg-white/10 rounded-lg cursor-pointer">
                                                                                            <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: el.color || '#000000' }} />
                                                                                            <input
                                                                                                type="color"
                                                                                                value={el.color || "#000000"}
                                                                                                onChange={(e) => updateElement(el.id, { color: e.target.value })}
                                                                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                                                            />
                                                                                        </div>
                                                                                    </>
                                                                                )}

                                                                                <div className="w-[1px] h-4 bg-white/10 mx-1" />

                                                                                {/* Opacity */}
                                                                                <div className="flex items-center gap-1 px-1">
                                                                                    <Blend size={12} className="text-white/50" />
                                                                                    <input
                                                                                        type="range" min="0.1" max="1" step="0.1"
                                                                                        value={el.opacity ?? 1}
                                                                                        onChange={(e) => updateElement(el.id, { opacity: parseFloat(e.target.value) })}
                                                                                        className="w-12 accent-indigo-500 opacity-80 hover:opacity-100 transition-opacity cursor-pointer h-1"
                                                                                    />
                                                                                </div>

                                                                                <div className="w-[1px] h-4 bg-white/10 mx-1" />

                                                                                <button onClick={(e) => { e.stopPropagation(); removeElement(el.id) }} className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors" title="Delete">
                                                                                    <Trash2 size={14} />
                                                                                </button>
                                                                            </div>
                                                                        </>
                                                                    )}

                                                                    <div style={{ opacity: el.opacity ?? 1, width: '100%', height: '100%' }}>
                                                                        {el.type === 'rect' && (
                                                                            <div className="border-2 w-full h-full" style={{ borderColor: el.color, borderWidth: el.size }} />
                                                                        )}
                                                                        {el.type === 'circle' && (
                                                                            <div className="border-2 rounded-full w-full h-full" style={{ borderColor: el.color, borderWidth: el.size }} />
                                                                        )}
                                                                        {el.type === 'image' && el.imageData && (
                                                                            <img src={el.imageData} className="w-full h-full object-contain" draggable={false} />
                                                                        )}
                                                                        {el.type === 'text' && (
                                                                            <div className="relative group/text">
                                                                                {editingTextId === el.id ? (
                                                                                    <div
                                                                                        className="absolute top-0 left-0 shadow-xl border border-indigo-500 pointer-events-auto z-[70]"
                                                                                        style={{ backgroundColor: el.backgroundColor || 'white' }}
                                                                                    >
                                                                                        <input
                                                                                            autoFocus
                                                                                            type="text"
                                                                                            value={editingTextValue}
                                                                                            onChange={(e) => setEditingTextValue(e.target.value)}
                                                                                            onKeyDown={(e) => {
                                                                                                if (e.key === 'Enter') handleTextEditComplete();
                                                                                                if (e.key === 'Escape') setEditingTextId(null);
                                                                                            }}
                                                                                            onBlur={handleTextEditComplete}
                                                                                            onFocus={(e) => e.target.select()}
                                                                                            className="bg-transparent outline-none px-2 py-1 min-w-[150px]"
                                                                                            style={{
                                                                                                color: el.color,
                                                                                                fontSize: (el.size || 16),
                                                                                                fontFamily: el.fontFamily,
                                                                                                fontWeight: el.fontWeight,
                                                                                                fontStyle: el.fontStyle,
                                                                                                textDecoration: el.textDecoration,
                                                                                                textAlign: el.textAlign
                                                                                            }}
                                                                                        />
                                                                                    </div>
                                                                                ) : (
                                                                                    <div
                                                                                        style={{
                                                                                            color: el.color,
                                                                                            fontSize: (el.size || 16),
                                                                                            backgroundColor: el.backgroundColor === 'transparent' ? 'transparent' : (el.backgroundColor || 'white'),
                                                                                            fontFamily: el.fontFamily,
                                                                                            fontWeight: el.fontWeight,
                                                                                            fontStyle: el.fontStyle,
                                                                                            textDecoration: el.textDecoration,
                                                                                            textAlign: el.textAlign
                                                                                        }}
                                                                                        className="px-3 py-1.5 transition-all min-w-[20px]"
                                                                                        onDoubleClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setEditingTextId(el.id);
                                                                                            setEditingTextValue(el.text || "");
                                                                                        }}
                                                                                    >
                                                                                        {el.text || "Type your text here"}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                        {el.type === 'symbol' && (
                                                                            <div
                                                                                className="w-full h-full flex items-center justify-center overflow-hidden"
                                                                                style={{
                                                                                    color: el.color,
                                                                                    fontSize: el.height ? `${h}px` : `${el.size}px`,
                                                                                    lineHeight: 1
                                                                                }}
                                                                            >
                                                                                {el.symbol === "Star" && "★"}
                                                                                {el.symbol === "Heart" && "❤"}
                                                                                {el.symbol === "Check" && "✔"}
                                                                                {el.symbol === "X" && "✖"}
                                                                                {el.symbol === "Arrow" && "➡"}
                                                                            </div>
                                                                        )}
                                                                        {el.type === 'draw' && el.points && (
                                                                            <svg className="absolute inset-0 w-full h-full">
                                                                                <polyline
                                                                                    points={el.points.map(p => `${(p.x / 100) * bounds.width + bounds.left},${(p.y / 100) * bounds.height + bounds.top}`).join(' ')}
                                                                                    fill="none"
                                                                                    stroke={el.color}
                                                                                    strokeWidth={el.size}
                                                                                    strokeLinecap="round"
                                                                                    strokeLinejoin="round"
                                                                                />
                                                                            </svg>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        });
                                                    })()}

                                                    {/* Temp Drawing */}
                                                    {tempElement && (() => {
                                                        const bounds = getImageBounds(selectedPage.id);
                                                        if (!bounds) return null;

                                                        const left = (tempElement.x! / 100) * bounds.width + bounds.left;
                                                        const top = (tempElement.y! / 100) * bounds.height + bounds.top;
                                                        const w = (tempElement.width || 0) / 100 * bounds.width;
                                                        const h = (tempElement.height || 0) / 100 * bounds.height;

                                                        return (
                                                            <div
                                                                className="absolute pointer-events-none"
                                                                style={{
                                                                    left: tempElement.type === 'draw' ? 0 : left,
                                                                    top: tempElement.type === 'draw' ? 0 : top,
                                                                    width: tempElement.type === 'draw' ? '100%' : (w || 'auto'),
                                                                    height: tempElement.type === 'draw' ? '100%' : (h || 'auto'),
                                                                    color: tempElement.color,
                                                                }}
                                                            >
                                                                {tempElement.type === 'rect' && (
                                                                    <div className="border border-dashed border-indigo-600 w-full h-full bg-indigo-50/20" />
                                                                )}
                                                                {tempElement.type === 'circle' && (
                                                                    <div className="border border-dashed border-indigo-600 rounded-full w-full h-full bg-indigo-50/20" />
                                                                )}
                                                                {tempElement.type === 'draw' && tempElement.points && (
                                                                    <svg className="absolute inset-0 w-full h-full">
                                                                        <polyline
                                                                            points={tempElement.points.map(p => `${(p.x / 100) * bounds.width + bounds.left},${(p.y / 100) * bounds.height + bounds.top}`).join(' ')}
                                                                            fill="none"
                                                                            stroke={tempElement.color}
                                                                            strokeWidth={tempElement.size}
                                                                            strokeLinecap="round"
                                                                            strokeLinejoin="round"
                                                                        />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                        </div>

                                        {/* Bottom Control Bar */}
                                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900/90 backdrop-blur-xl text-white px-6 py-3 border border-white/10 flex items-center gap-6 z-50 rounded-2xl shadow-2xl">
                                            <div className="flex items-center gap-4">
                                                <button onClick={() => {
                                                    const idx = pages.findIndex(p => p.id === selectedPageId);
                                                    if (idx > 0) setSelectedPageId(pages[idx - 1].id);
                                                }} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30" disabled={pages.findIndex(p => p.id === selectedPageId) === 0}>
                                                    <ChevronLeft size={18} />
                                                </button>
                                                <div className="text-[10px] font-black tracking-widest uppercase flex items-center gap-2">
                                                    Page <span className="bg-indigo-600 px-2 py-1 rounded text-white">{pages.findIndex(p => p.id === selectedPageId) + 1}</span> / {pages.length}
                                                </div>
                                                <button onClick={() => {
                                                    const idx = pages.findIndex(p => p.id === selectedPageId);
                                                    if (idx < pages.length - 1) setSelectedPageId(pages[idx + 1].id);
                                                }} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30" disabled={pages.findIndex(p => p.id === selectedPageId) === pages.length - 1}>
                                                    <ChevronRight size={18} />
                                                </button>
                                            </div>

                                            <div className="h-6 w-px bg-white/10" />

                                            <div className="flex items-center gap-4">
                                                <button onClick={() => setZoom(Math.max(25, zoom - 25))} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><Minus size={16} /></button>
                                                <div className="text-[10px] font-black min-w-[35px] text-center">{zoom}%</div>
                                                <button onClick={() => setZoom(Math.min(200, zoom + 25))} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><Plus size={16} /></button>
                                            </div>

                                            <div className="h-6 w-px bg-white/10" />

                                            <div className="relative group/layers">
                                                <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Layer Ordering">
                                                    <Layers size={18} />
                                                </button>
                                                {/* Layers Tooltip/Menu */}
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-1.5 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl hidden group-hover/layers:flex items-center gap-1 z-[60]">
                                                    {/* Bridge to prevent closing */}
                                                    <div className="absolute -bottom-2 inset-x-0 h-2 cursor-default" />
                                                    <button
                                                        onClick={() => selectedElementId && moveToBack(selectedElementId)}
                                                        disabled={!selectedElementId}
                                                        className="px-2 py-1 hover:bg-white/10 rounded-lg text-[10px] font-bold whitespace-nowrap disabled:opacity-30"
                                                        title="Move to Back"
                                                    >
                                                        Send to Back
                                                    </button>
                                                    <div className="w-[1px] h-3 bg-white/10" />
                                                    <button
                                                        onClick={() => selectedElementId && moveToFront(selectedElementId)}
                                                        disabled={!selectedElementId}
                                                        className="px-2 py-1 hover:bg-white/10 rounded-lg text-[10px] font-bold whitespace-nowrap disabled:opacity-30"
                                                        title="Bring to Front"
                                                    >
                                                        Bring to Front
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="animate-spin w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Remove All Confirmation Modal */}
            <AnimatePresence>
                {showRemoveConfirm && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowRemoveConfirm(false)}
                            className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative bg-white rounded-3xl shadow-2xl border border-zinc-200 p-8 max-w-sm w-full text-center overflow-hidden"
                        >
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-red-500" />
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Trash2 className="text-red-600" size={28} />
                            </div>
                            <h3 className="text-xl font-black text-zinc-900 mb-2">Clear all edits?</h3>
                            <p className="text-sm text-zinc-500 mb-8 leading-relaxed">
                                This will permanently remove all text, shapes, and drawings from all pages. This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowRemoveConfirm(false)}
                                    className="flex-1 px-6 py-3 rounded-2xl text-sm font-bold text-zinc-600 hover:bg-zinc-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={removeAllElements}
                                    className="flex-1 px-6 py-3 rounded-2xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 transition-all active:scale-95"
                                >
                                    Remove All
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </ConversionLayout>
    );
}
