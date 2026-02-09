"use client";

import { useState, useRef } from "react";
import {
    Eraser,
    Plus,
    FileText,
    Trash2,
    X,
    Square,
    Search,
    Type
} from "lucide-react";
import ConversionLayout from "@/components/ConversionLayout";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";
import PreviewContent from "@/components/PreviewContent";
import { motion } from "framer-motion";

interface RedactionArea {
    id: string;
    x: number; // percentage
    y: number; // percentage
    width: number; // percentage
    height: number; // percentage
    pageIndex: number;
    searchTerm?: string; // Optional: if created from text search
}

interface PageData {
    id: string;
    originalIndex: number;
    thumbnailUrl: string;
    pageWidth: number;
    pageHeight: number;
    pageObject?: any; // PDF.js page object for text extraction
    canvasElement?: HTMLCanvasElement; // Canvas element for pixel analysis
}

export default function RedactPDF() {
    const [file, setFile] = useState<File | null>(null);
    const [pages, setPages] = useState<PageData[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoadingPages, setIsLoadingPages] = useState(false);
    const [result, setResult] = useState<{ fileName: string; downloadUrl: string } | null>(null);
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
    const [redactions, setRedactions] = useState<RedactionArea[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const [currentRedaction, setCurrentRedaction] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const [redactionColor, setRedactionColor] = useState("#000000");
    const [contentWarning, setContentWarning] = useState<string | null>(null);
    const [searchTerms, setSearchTerms] = useState<string[]>([]);
    const [searchInput, setSearchInput] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [hasShownWhitespaceWarning, setHasShownWhitespaceWarning] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const canvasRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const pdfDocRef = useRef<any>(null); // Store PDF document reference

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
        setRedactions([]);
        try {
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

            const arrayBuffer = await pdfFile.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            pdfDocRef.current = pdf; // Store PDF reference

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
                        pageObject: page,
                        canvasElement: canvas,
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

    // Check if selected area contains content (text or images)
    const checkAreaHasContent = async (
        pageData: PageData,
        x: number,
        y: number,
        width: number,
        height: number
    ): Promise<boolean> => {
        try {
            // Convert percentage to actual coordinates
            const pageWidth = pageData.pageWidth;
            const pageHeight = pageData.pageHeight;
            const actualX = (x / 100) * pageWidth;
            const actualY = (y / 100) * pageHeight;
            const actualWidth = (width / 100) * pageWidth;
            const actualHeight = (height / 100) * pageHeight;

            // Check 1: Extract text from the selected region
            if (pageData.pageObject) {
                try {
                    const textContent = await pageData.pageObject.getTextContent();
                    const viewport = pageData.pageObject.getViewport({ scale: 1.0 });
                    
                    // Check if any text items intersect with the selected area
                    // PDF coordinates: origin is bottom-left, Y increases upward
                    const pdfY = pageHeight - (actualY + actualHeight);
                    const pdfY2 = pageHeight - actualY;

                    for (const item of textContent.items) {
                        if (item.transform) {
                            // item.transform[4] is X, item.transform[5] is Y
                            const textX = item.transform[4];
                            const textY = item.transform[5];
                            
                            // Check if text is within the selected area
                            if (
                                textX >= actualX &&
                                textX <= actualX + actualWidth &&
                                textY >= Math.min(pdfY, pdfY2) &&
                                textY <= Math.max(pdfY, pdfY2)
                            ) {
                                // Found text in the area
                                return true;
                            }
                        }
                    }
                } catch (textError) {
                    // If text extraction fails, continue to image check
                    console.warn("Text extraction failed:", textError);
                }
            }

            // Check 2: Analyze canvas pixels for non-white content
            if (pageData.canvasElement) {
                const canvas = pageData.canvasElement;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    const imgData = ctx.getImageData(
                        Math.floor(actualX),
                        Math.floor(actualY),
                        Math.floor(actualWidth),
                        Math.floor(actualHeight)
                    );
                    
                    // Check if there are non-white pixels (with some tolerance for near-white)
                    const pixels = imgData.data;
                    let nonWhitePixels = 0;
                    const totalPixels = pixels.length / 4; // RGBA = 4 values per pixel
                    
                    for (let i = 0; i < pixels.length; i += 4) {
                        const r = pixels[i];
                        const g = pixels[i + 1];
                        const b = pixels[i + 2];
                        const a = pixels[i + 3];
                        
                        // Check if pixel is not white/transparent
                        // Consider pixels with alpha > 0 and not near-white (RGB > 240)
                        if (a > 10 && (r < 240 || g < 240 || b < 240)) {
                            nonWhitePixels++;
                        }
                    }
                    
                    // If more than 5% of pixels are non-white, consider it as having content
                    const contentRatio = nonWhitePixels / totalPixels;
                    if (contentRatio > 0.05) {
                        return true;
                    }
                }
            }

            return false;
        } catch (error) {
            console.error("Error checking content:", error);
            // If check fails, allow redaction (fail-safe)
            return true;
        }
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, pageId: string) => {
        if (e.button !== 0) return; // Only left mouse button
        
        const container = canvasRefs.current[pageId];
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setIsDragging(true);
        setDragStart({ x, y });
        setCurrentRedaction({ x, y, width: 0, height: 0 });
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, pageId: string) => {
        if (!isDragging || !dragStart || !currentRedaction) return;

        const container = canvasRefs.current[pageId];
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const currentX = ((e.clientX - rect.left) / rect.width) * 100;
        const currentY = ((e.clientY - rect.top) / rect.height) * 100;

        const x = Math.min(dragStart.x, currentX);
        const y = Math.min(dragStart.y, currentY);
        const width = Math.abs(currentX - dragStart.x);
        const height = Math.abs(currentY - dragStart.y);

        setCurrentRedaction({ x, y, width, height });
    };

    const handleMouseUp = async (pageId: string) => {
        if (!isDragging || !currentRedaction || !dragStart) return;

        if (currentRedaction.width > 1 && currentRedaction.height > 1) {
            const pageData = pages.find(p => p.id === pageId);
            
            if (pageData) {
                // Check if the selected area contains content
                const hasContent = await checkAreaHasContent(
                    pageData,
                    currentRedaction.x,
                    currentRedaction.y,
                    currentRedaction.width,
                    currentRedaction.height
                );

                if (!hasContent) {
                    // Show warning only first time
                    if (!hasShownWhitespaceWarning) {
                        setContentWarning("No content detected in selected area. Please select an area with text or images.");
                        setTimeout(() => setContentWarning(null), 3000);
                        setHasShownWhitespaceWarning(true);
                    }
                    setIsDragging(false);
                    setDragStart(null);
                    setCurrentRedaction(null);
                    return;
                }

                // Clear any previous warning
                setContentWarning(null);

                // Add redaction if content is detected
                const pageIndex = pages.findIndex(p => p.id === pageId);
                const newRedaction: RedactionArea = {
                    id: `redact-${Date.now()}-${Math.random()}`,
                    x: currentRedaction.x,
                    y: currentRedaction.y,
                    width: currentRedaction.width,
                    height: currentRedaction.height,
                    pageIndex: pageIndex,
                };
                setRedactions([...redactions, newRedaction]);
            }
        }

        setIsDragging(false);
        setDragStart(null);
        setCurrentRedaction(null);
    };

    const removeRedaction = (id: string) => {
        setRedactions(redactions.filter(r => r.id !== id));
    };

    const clearAllRedactions = () => {
        setRedactions([]);
        setSearchTerms([]);
    };

    // Search for text and create redactions automatically
    const searchAndRedactText = async (searchText: string) => {
        if (!searchText.trim() || !pdfDocRef.current || pages.length === 0) return;

        setIsSearching(true);
        const foundRedactions: RedactionArea[] = [];

        try {
            const pdf = pdfDocRef.current;

            // Search through all pages
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const pageData = pages.find(p => p.originalIndex === pageNum - 1);
                
                if (!pageData || !pageData.pageObject) continue;

                const textContent = await page.getTextContent();
                const viewport = page.getViewport({ scale: 1.0 });
                const pageWidth = pageData.pageWidth;
                const pageHeight = pageData.pageHeight;

                // Build full text string with positions
                const textItems: Array<{ text: string; x: number; y: number; width: number; height: number }> = [];
                
                for (const item of textContent.items) {
                    if (item.str && typeof item.str === 'string' && item.transform && item.transform.length >= 6) {
                        const x = item.transform[4];
                        const y = item.transform[5];
                        const fontSize = item.height || 12;
                        const textWidth = item.width || (item.str.length * fontSize * 0.6);
                        
                        textItems.push({
                            text: item.str,
                            x,
                            y,
                            width: textWidth,
                            height: fontSize,
                        });
                    }
                }
                
                // Find exact word matches (case-insensitive)
                const normalizedSearch = searchText.toLowerCase().trim();
                const escapedSearch = normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const searchRegex = new RegExp(`\\b${escapedSearch}\\b`, 'gi');
                
                // Combine text items into full text for searching
                let fullText = '';
                for (const item of textItems) {
                    fullText += item.text;
                }
                
                // Find all matches
                let match;
                
                while ((match = searchRegex.exec(fullText)) !== null) {
                    const matchStart = match.index;
                    const matchEnd = matchStart + match[0].length;
                    
                    // Find which text items contain this match
                    let currentCharIndex = 0;
                    let startItemIndex = -1;
                    let endItemIndex = -1;
                    
                    for (let i = 0; i < textItems.length; i++) {
                        const itemLength = textItems[i].text.length;
                        const itemStart = currentCharIndex;
                        const itemEnd = currentCharIndex + itemLength;
                        
                        if (matchStart >= itemStart && matchStart < itemEnd) {
                            startItemIndex = i;
                        }
                        if (matchEnd > itemStart && matchEnd <= itemEnd) {
                            endItemIndex = i;
                            break;
                        }
                        
                        currentCharIndex += itemLength;
                    }
                    
                    if (startItemIndex !== -1 && endItemIndex !== -1) {
                        // Calculate bounding box for the matched text
                        const startItem = textItems[startItemIndex];
                        const endItem = textItems[endItemIndex];
                        
                        const minX = startItem.x;
                        const maxX = endItem.x + endItem.width;
                        const minY = Math.min(...textItems.slice(startItemIndex, endItemIndex + 1).map(item => item.y));
                        const maxY = Math.max(...textItems.slice(startItemIndex, endItemIndex + 1).map(item => item.y + item.height));
                        
                        // Convert to percentage (PDF origin is bottom-left)
                        const pdfMinY = pageHeight - maxY;
                        const pdfMaxY = pageHeight - minY;
                        
                        const xPercent = (minX / pageWidth) * 100;
                        const yPercent = (pdfMinY / pageHeight) * 100;
                        const widthPercent = ((maxX - minX) / pageWidth) * 100;
                        const heightPercent = ((pdfMaxY - pdfMinY) / pageHeight) * 100;
                        
                        if (widthPercent > 0 && heightPercent > 0) {
                            foundRedactions.push({
                                id: `search-${Date.now()}-${Math.random()}-${matchStart}`,
                                x: Math.max(0, Math.min(xPercent, 100)),
                                y: Math.max(0, Math.min(yPercent, 100)),
                                width: Math.min(widthPercent, 100 - xPercent),
                                height: Math.min(heightPercent, 100 - yPercent),
                                pageIndex: pageNum - 1,
                                searchTerm: searchText,
                            });
                        }
                    }
                }
            }

            if (foundRedactions.length > 0) {
                setRedactions(prev => [...prev, ...foundRedactions]);
                if (!searchTerms.includes(searchText.trim())) {
                    setSearchTerms(prev => [...prev, searchText.trim()]);
                }
                setSearchInput("");
            } else {
                setContentWarning(`No matches found for "${searchText}"`);
                setTimeout(() => setContentWarning(null), 3000);
            }
        } catch (error) {
            console.error("Text search error:", error);
            setContentWarning("Error searching for text. Please try again.");
            setTimeout(() => setContentWarning(null), 3000);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchInput.trim()) {
            searchAndRedactText(searchInput.trim());
        }
    };

    const removeSearchTerm = (term: string) => {
        setSearchTerms(prev => prev.filter(t => t !== term));
        // Remove all redactions created from this search term
        setRedactions(prev => prev.filter(r => r.searchTerm !== term));
    };

    const handleRedact = async () => {
        if (!file || redactions.length === 0) return;

        setIsProcessing(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("redactions", JSON.stringify(redactions));
        formData.append("redactionColor", redactionColor);

        try {
            const response = await fetch("/api/redact-pdf", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                const blob = await response.blob();
                const downloadUrl = URL.createObjectURL(blob);

                setResult({
                    fileName: `redacted_${file.name}`,
                    downloadUrl: downloadUrl,
                });
            } else {
                const error = await response.json();
                alert(error.error || "Failed to redact PDF");
            }
        } catch (error) {
            console.error("Redact error:", error);
            alert("An error occurred during PDF redaction");
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
        setRedactions([]);
        setResult(null);
        setSelectedPageId(null);
        setCurrentRedaction(null);
        setSearchTerms([]);
        setSearchInput("");
        setHasShownWhitespaceWarning(false);
    };

    const selectedPage = pages.find(p => p.id === selectedPageId);
    const pageRedactions = selectedPage ? redactions.filter(r => {
        const pageIndex = pages.findIndex(p => p.id === selectedPageId);
        return r.pageIndex === pageIndex;
    }) : [];

    const SettingsPanel = (
        <div className="flex flex-col h-full">
            <div className="space-y-6 mb-6">
                {/* Info Box */}
                <div className="bg-red-50/50 rounded-xl p-4 border border-red-100">
                    <div className="flex items-start gap-3">
                        <Eraser className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                        <div>
                            <p className="text-xs font-black text-red-700 mb-1">Permanent Redaction</p>
                            <p className="text-xs font-semibold text-red-600 leading-relaxed">
                                Draw boxes over sensitive information to permanently remove it. Redacted content cannot be recovered.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Text Search */}
                <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">
                        Search & Redact Text
                    </label>
                    <form onSubmit={handleSearchSubmit} className="space-y-2">
                        <div className="flex flex-wrap gap-2 p-2 min-h-[44px] border-2 border-zinc-200 rounded-xl bg-white focus-within:border-red-400 transition-colors">
                            {/* Search Tags */}
                            {searchTerms.map((term) => (
                                <div
                                    key={term}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-300 rounded-lg"
                                >
                                    <Type size={12} className="text-blue-600" />
                                    <span className="text-xs font-bold text-zinc-700">{term}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeSearchTerm(term)}
                                        className="text-blue-600 hover:text-blue-700 transition-colors"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                            {/* Search Input */}
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder={searchTerms.length === 0 ? "Search text" : ""}
                                className="flex-1 min-w-[120px] text-xs font-semibold text-zinc-700 outline-none bg-transparent"
                                disabled={isSearching || !file}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!searchInput.trim() || isSearching || !file}
                            className="w-full px-4 py-2 bg-red-600 text-white text-xs font-black rounded-xl hover:bg-red-700 disabled:bg-zinc-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {isSearching ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Searching...</span>
                                </>
                            ) : (
                                <>
                                    <Search size={14} />
                                    <span>Search & Redact</span>
                                </>
                            )}
                        </button>
                    </form>
                    <p className="text-xs font-semibold text-zinc-500 mt-2 ml-1">
                        Enter text to find and automatically redact all occurrences
                    </p>
                </div>

                {/* Instructions */}
                <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">
                        Manual Selection
                    </label>
                    <div className="space-y-2 text-xs font-semibold text-zinc-700">
                        <div className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 flex-shrink-0" />
                            <span>Click and drag on the PDF preview to create redaction boxes</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 flex-shrink-0" />
                            <span>Select a page from the grid to add redactions</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 flex-shrink-0" />
                            <span>Click the X on a redaction box to remove it</span>
                        </div>
                    </div>
                </div>

                {/* Redaction Color */}
                <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">
                        Redaction Color
                    </label>
                    <div className="flex items-center gap-3">
                        <input
                            type="color"
                            value={redactionColor}
                            onChange={(e) => setRedactionColor(e.target.value)}
                            className="w-12 h-12 rounded-xl border-2 border-zinc-200 cursor-pointer"
                        />
                        <div className="flex-1">
                            <p className="text-xs font-bold text-zinc-700">Color used for redaction boxes</p>
                            <p className="text-xs font-semibold text-zinc-500">Default: Black (recommended)</p>
                        </div>
                    </div>
                </div>

                {/* Redactions List */}
                {redactions.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                                Redactions ({redactions.length})
                            </label>
                            <button
                                onClick={clearAllRedactions}
                                className="text-xs font-black text-red-600 hover:text-red-700 transition-colors"
                            >
                                Clear All
                            </button>
                        </div>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {redactions.map((redaction, idx) => {
                                const pageNum = redaction.pageIndex + 1;
                                return (
                                    <div
                                        key={redaction.id}
                                        className="flex items-center justify-between p-2 bg-zinc-50 rounded-lg border border-zinc-200"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Square size={12} className="text-red-600" />
                                            <span className="text-xs font-bold text-zinc-700">
                                                Page {pageNum} - Redaction {idx + 1}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => removeRedaction(redaction.id)}
                                            className="text-red-600 hover:text-red-700 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Warning */}
                <div className="bg-red-50/50 rounded-xl p-3 border border-red-100">
                    <p className="text-xs font-black text-red-700 mb-1">⚠️ Warning</p>
                    <p className="text-xs font-semibold text-red-600 leading-relaxed">
                        Redaction is permanent. Once applied, the underlying content cannot be recovered. Make sure you have a backup of the original file.
                    </p>
                </div>
            </div>

            <div className="mt-auto">
                <ProcessingButton
                    onClick={handleRedact}
                    isProcessing={isProcessing}
                    disabled={!file || redactions.length === 0}
                    icon={Eraser}
                    text="Apply Redactions"
                    processingText="Applying redactions..."
                    bgColor="bg-red-600"
                    className="shadow-red-200"
                />
            </div>
        </div>
    );

    return (
        <ConversionLayout
            title="Redact PDF"
            description="Permanently remove sensitive information from PDFs. Draw boxes over content to redact it forever."
            settingsPanel={!result ? SettingsPanel : (
                <div className="h-full flex flex-col justify-center">
                    <DownloadResult
                        fileName={result?.fileName || ""}
                        downloadUrl={result?.downloadUrl || ""}
                        onReset={handleReset}
                        stats={[
                            { label: "Redactions", value: redactions.length.toString() },
                            { label: "Status", value: "Redacted" }
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
                                Document Preview - Click & Drag to Redact
                            </h2>
                            <p className="text-xs text-zinc-500 font-bold">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-black text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl transition-all active:scale-95">
                                <Plus size={14} />
                                <span>Replace</span>
                                <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                            </label>
                            {redactions.length > 0 && (
                                <button
                                    onClick={clearAllRedactions}
                                    className="text-xs font-black text-red-600 hover:text-red-700 flex items-center gap-2 bg-red-50 px-4 py-2 rounded-xl transition-all active:scale-95"
                                >
                                    <Trash2 size={14} />
                                    <span>Clear All</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Content Warning */}
                    {contentWarning && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mb-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl p-3 flex items-center gap-3"
                        >
                            <X className="text-yellow-600 flex-shrink-0" size={18} />
                            <p className="text-xs font-bold text-yellow-800">{contentWarning}</p>
                        </motion.div>
                    )}

                    {/* Page Grid */}
                    <div className="mb-4">
                        <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1">
                            Select Page to Redact
                        </label>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {pages.map((page, idx) => (
                                <button
                                    key={page.id}
                                    onClick={() => setSelectedPageId(page.id)}
                                    className={`flex-shrink-0 w-20 h-28 rounded-lg border-2 overflow-hidden transition-all ${
                                        selectedPageId === page.id
                                            ? "border-red-600 shadow-lg shadow-red-100"
                                            : "border-zinc-200 hover:border-red-300"
                                    }`}
                                >
                                    <img
                                        src={page.thumbnailUrl}
                                        alt={`Page ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                    {/* Page number overlay - commented out */}
                                    {/* <div className="absolute bottom-0 left-0 right-0 bg-zinc-900/80 text-white text-[10px] font-black px-1 py-0.5 text-center">
                                        {idx + 1}
                                    </div> */}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Preview with Redaction */}
                    {selectedPage && (
                        <div className="flex-1 min-h-[500px] bg-white rounded-3xl overflow-hidden border-2 border-zinc-200 shadow-lg relative">
                            <div
                                ref={(el) => {
                                    if (el) canvasRefs.current[selectedPage.id] = el;
                                }}
                                onMouseDown={(e) => handleMouseDown(e, selectedPage.id)}
                                onMouseMove={(e) => handleMouseMove(e, selectedPage.id)}
                                onMouseUp={() => handleMouseUp(selectedPage.id)}
                                onMouseLeave={() => {
                                    if (isDragging) {
                                        handleMouseUp(selectedPage.id);
                                    }
                                }}
                                className="w-full h-full relative cursor-crosshair overflow-auto"
                                style={{ minHeight: "500px" }}
                            >
                                <img
                                    src={selectedPage.thumbnailUrl}
                                    alt={`Page ${selectedPage.originalIndex + 1}`}
                                    className="w-full h-full object-contain"
                                    draggable={false}
                                />

                                {/* Existing Redactions */}
                                {pageRedactions.map((redaction) => (
                                    <div
                                        key={redaction.id}
                                        className="absolute border-2 border-red-500 bg-red-500/20 pointer-events-none group"
                                        style={{
                                            left: `${redaction.x}%`,
                                            top: `${redaction.y}%`,
                                            width: `${redaction.width}%`,
                                            height: `${redaction.height}%`,
                                        }}
                                    >
                                        <div
                                            className="absolute inset-0"
                                            style={{ backgroundColor: redactionColor }}
                                        />
                                        <button
                                            onClick={() => removeRedaction(redaction.id)}
                                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto shadow-lg"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}

                                {/* Current Redaction Being Drawn */}
                                {currentRedaction && currentRedaction.width > 0 && currentRedaction.height > 0 && (
                                    <div
                                        className="absolute border-2 border-red-500 bg-red-500/20 pointer-events-none"
                                        style={{
                                            left: `${currentRedaction.x}%`,
                                            top: `${currentRedaction.y}%`,
                                            width: `${currentRedaction.width}%`,
                                            height: `${currentRedaction.height}%`,
                                        }}
                                    >
                                        <div
                                            className="absolute inset-0 border-2 border-dashed border-red-600"
                                            style={{ backgroundColor: `${redactionColor}40` }}
                                        />
                                    </div>
                                )}

                                {/* Instructions Overlay */}
                                {redactions.length === 0 && !isDragging && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border-2 border-red-200 shadow-xl">
                                            <Eraser className="text-red-600 mx-auto mb-3" size={32} />
                                            <p className="text-sm font-black text-zinc-900 text-center mb-1">
                                                Click and drag to create redaction boxes
                                            </p>
                                            <p className="text-xs font-semibold text-zinc-500 text-center">
                                                Draw over sensitive information to permanently remove it
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center max-w-sm px-6">
                    <div className="w-24 h-24 bg-red-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner group">
                        <Eraser className="text-red-400 group-hover:scale-110 transition-transform duration-500" size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 mb-3 tracking-tight">Redact PDF</h3>
                    <p className="text-zinc-500 font-medium text-sm mb-8 leading-relaxed">
                        Permanently remove sensitive information from PDFs. Draw boxes over content to redact it forever.
                    </p>
                    <label className="inline-flex items-center gap-3 px-8 py-4 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 cursor-pointer transition-all shadow-xl shadow-red-200 active:scale-95 group">
                        <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span>Select PDF File</span>
                        <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" ref={fileInputRef} />
                    </label>
                </div>
            )}
        </ConversionLayout>
    );
}

