"use client";

import { useState, useRef } from "react";
import {
    GitCompare,
    FileText,
    Plus,
    X,
    Download,
    Search,
    BookOpen,
    Layers,
    CheckCircle2,
    ArrowRight,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import ConversionLayout from "@/components/ConversionLayout";
import { motion, AnimatePresence } from "framer-motion";

interface PageComparison {
    pageNumber: number;
    originalImage: string;
    modifiedImage: string;
    differences: Difference[];
    hasDifferences: boolean;
}

interface Difference {
    type: 'added' | 'deleted' | 'modified';
    x: number;
    y: number;
    width: number;
    height: number;
    text?: string;
    pageNumber: number;
}

interface ComparisonResult {
    totalPages: number;
    pagesWithDifferences: number;
    totalDifferences: number;
    pages: PageComparison[];
}

export default function ComparePDF() {
    const [file1, setFile1] = useState<File | null>(null);
    const [file2, setFile2] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoadingPages, setIsLoadingPages] = useState(false);
    const [result, setResult] = useState<ComparisonResult | null>(null);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [comparisonMode, setComparisonMode] = useState<'semantic' | 'overlay'>('semantic');
    const [searchText, setSearchText] = useState("");
    const file1InputRef = useRef<HTMLInputElement>(null);
    const file2InputRef = useRef<HTMLInputElement>(null);
    const [dragOver1, setDragOver1] = useState(false);
    const [dragOver2, setDragOver2] = useState(false);
    const leftScrollRef = useRef<HTMLDivElement>(null);
    const rightScrollRef = useRef<HTMLDivElement>(null);
    const [isScrolling, setIsScrolling] = useState(false);

    const handleFile1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.type === "application/pdf") {
            setFile1(selectedFile);
            setResult(null);
        }
    };

    const handleFile2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.type === "application/pdf") {
            setFile2(selectedFile);
            setResult(null);
        }
    };

    const handleDragOver = (e: React.DragEvent, panel: 1 | 2) => {
        e.preventDefault();
        if (panel === 1) setDragOver1(true);
        else setDragOver2(true);
    };

    const handleDragLeave = (panel: 1 | 2) => {
        if (panel === 1) setDragOver1(false);
        else setDragOver2(false);
    };

    const handleDrop = (e: React.DragEvent, panel: 1 | 2) => {
        e.preventDefault();
        if (panel === 1) setDragOver1(false);
        else setDragOver2(false);

        const file = e.dataTransfer.files[0];
        if (file && file.type === "application/pdf") {
            if (panel === 1) {
                setFile1(file);
            } else {
                setFile2(file);
            }
            setResult(null);
        }
    };

    /**
     * PDF Comparison Flow:
     * 1. Upload 2 PDFs ✓
     * 2. Parse both PDFs ✓
     * 3. Align pages (by page number) ✓
     * 4. Text diff engine (word-by-word, line-by-line) ✓
     * 5. Visual render engine (pixel comparison) ✓
     * 6. Highlight differences ✓
     * 7. Generate comparison PDF ✓
     */
    const handleCompare = async () => {
        if (!file1 || !file2) return;

        setIsProcessing(true);
        setIsLoadingPages(true);

        try {
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

            const arrayBuffer1 = await file1.arrayBuffer();
            const arrayBuffer2 = await file2.arrayBuffer();

            const loadingTask1 = pdfjsLib.getDocument({ data: arrayBuffer1 });
            const loadingTask2 = pdfjsLib.getDocument({ data: arrayBuffer2 });

            const pdf1 = await loadingTask1.promise;
            const pdf2 = await loadingTask2.promise;

            // Step 1: Parse both PDFs ✓
            // Step 2: Align pages (by page number, can be enhanced with content similarity)
            const maxPages = Math.max(pdf1.numPages, pdf2.numPages);
            const pages: PageComparison[] = [];
            let totalDifferences = 0;
            let pagesWithDifferences = 0;

            // Step 3: Compare each aligned page pair
            // Step 4: Text diff engine + Step 5: Visual render engine
            for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
                const page1 = pageNum <= pdf1.numPages ? await pdf1.getPage(pageNum) : null;
                const page2 = pageNum <= pdf2.numPages ? await pdf2.getPage(pageNum) : null;

                if (!page1 && !page2) continue;

                // Render at higher scale for better visibility
                const viewport1 = page1 ? page1.getViewport({ scale: 2.0 }) : null;
                const viewport2 = page2 ? page2.getViewport({ scale: 2.0 }) : null;

                const canvas1 = page1 ? document.createElement('canvas') : null;
                const canvas2 = page2 ? document.createElement('canvas') : null;

                if (canvas1 && viewport1 && page1) {
                    canvas1.width = viewport1.width;
                    canvas1.height = viewport1.height;
                    const context1 = canvas1.getContext('2d');
                    if (context1) {
                        await page1.render({
                            canvasContext: context1 as any,
                            viewport: viewport1,
                            canvas: canvas1 as any,
                        }).promise;
                    }
                }

                if (canvas2 && viewport2 && page2) {
                    canvas2.width = viewport2.width;
                    canvas2.height = viewport2.height;
                    const context2 = canvas2.getContext('2d');
                    if (context2) {
                        await page2.render({
                            canvasContext: context2 as any,
                            viewport: viewport2,
                            canvas: canvas2 as any,
                        }).promise;
                    }
                }

                const image1 = canvas1 ? canvas1.toDataURL('image/png') : '';
                const image2 = canvas2 ? canvas2.toDataURL('image/png') : '';

                let textItems1: any[] = [];
                let textItems2: any[] = [];

                if (page1) {
                    try {
                        const textContent1 = await page1.getTextContent();
                        textItems1 = textContent1.items;
                    } catch (e) {
                        console.warn('Failed to extract text from page 1:', e);
                    }
                }

                if (page2) {
                    try {
                        const textContent2 = await page2.getTextContent();
                        textItems2 = textContent2.items;
                    } catch (e) {
                        console.warn('Failed to extract text from page 2:', e);
                    }
                }

                const differences = findDifferences(
                    textItems1,
                    textItems2,
                    viewport1,
                    viewport2,
                    canvas1,
                    canvas2,
                    pageNum
                );

                const hasDifferences = differences.length > 0;
                if (hasDifferences) {
                    pagesWithDifferences++;
                    totalDifferences += differences.length;
                }

                pages.push({
                    pageNumber: pageNum,
                    originalImage: image1,
                    modifiedImage: image2,
                    differences: differences,
                    hasDifferences: hasDifferences,
                });
            }

            setResult({
                totalPages: maxPages,
                pagesWithDifferences,
                totalDifferences,
                pages,
            });
            setCurrentPageIndex(0);
        } catch (error) {
            console.error("Comparison error:", error);
            alert("An error occurred during PDF comparison: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsProcessing(false);
            setIsLoadingPages(false);
        }
    };

    // Text normalization - remove extra spaces, normalize formatting
    function normalizeText(text: string): string {
        if (!text) return '';
        // Normalize whitespace: multiple spaces/tabs/newlines -> single space
        return text.replace(/[\s\n\r\t]+/g, ' ').trim();
    }

    function isOnlyWhitespace(text: string): boolean {
        return !text || /^\s*$/.test(text);
    }

    // Word-by-word comparison using diff algorithm
    function compareWords(text1: string, text2: string): Array<{ type: 'equal' | 'delete' | 'insert'; text: string }> {
        const words1 = normalizeText(text1).split(/\s+/).filter(w => w.length > 0);
        const words2 = normalizeText(text2).split(/\s+/).filter(w => w.length > 0);
        
        const diff: Array<{ type: 'equal' | 'delete' | 'insert'; text: string }> = [];
        let i = 0, j = 0;

        while (i < words1.length || j < words2.length) {
            if (i < words1.length && j < words2.length && words1[i] === words2[j]) {
                diff.push({ type: 'equal', text: words1[i] });
                i++;
                j++;
            } else if (i < words1.length && (j >= words2.length || words1[i] < words2[j])) {
                diff.push({ type: 'delete', text: words1[i] });
                i++;
            } else {
                diff.push({ type: 'insert', text: words2[j] });
                j++;
            }
        }

        return diff;
    }

    // Extract text lines from text items
    function extractTextLines(textItems: any[], viewport: any): Array<{ text: string; y: number; items: any[] }> {
        const lines = new Map<number, { text: string; items: any[] }>();
        
        textItems.forEach((item: any) => {
            if (item.str && item.transform && item.transform.length >= 6 && !isOnlyWhitespace(item.str)) {
                // Group by Y position (rounded to nearest 5px for line detection)
                const y = Math.round(item.transform[5] / 5) * 5;
                
                if (!lines.has(y)) {
                    lines.set(y, { text: '', items: [] });
                }
                
                const line = lines.get(y)!;
                line.text += (line.text ? ' ' : '') + item.str;
                line.items.push(item);
            }
        });

        // Convert to array and sort by Y position (top to bottom)
        return Array.from(lines.entries())
            .map(([y, data]) => ({ ...data, y }))
            .sort((a, b) => b.y - a.y); // PDF Y is bottom-up, so reverse sort
    }

    // Hybrid comparison: Text + Visual
    function findDifferences(
        textItems1: any[],
        textItems2: any[],
        viewport1: any,
        viewport2: any,
        canvas1: HTMLCanvasElement | null,
        canvas2: HTMLCanvasElement | null,
        pageNumber: number
    ): Difference[] {
        const differences: Difference[] = [];

        // Step 1: Extract and normalize text from both PDFs
        const text1 = normalizeText(textItems1.map((item: any) => item.str || '').join(' '));
        const text2 = normalizeText(textItems2.map((item: any) => item.str || '').join(' '));

        // Step 2: Line-by-line comparison
        const lines1 = extractTextLines(textItems1, viewport1);
        const lines2 = extractTextLines(textItems2, viewport2);

        // Compare lines
        const maxLines = Math.max(lines1.length, lines2.length);
        for (let i = 0; i < maxLines; i++) {
            const line1 = lines1[i];
            const line2 = lines2[i];

            if (!line1 && line2) {
                // Line added in PDF2
                line2.items.forEach((item: any) => {
                    if (viewport2) {
                        const x = (item.transform[4] / viewport2.width) * 100;
                        const y = ((viewport2.height - item.transform[5]) / viewport2.height) * 100;
                        const width = ((item.width || item.str.length * 6) / viewport2.width) * 100;
                        const height = ((item.height || 12) / viewport2.height) * 100;

                        differences.push({
                            type: 'added',
                            x: Math.max(0, Math.min(100, x)),
                            y: Math.max(0, Math.min(100, y)),
                            width: Math.max(1, Math.min(100, width)),
                            height: Math.max(1, Math.min(100, height)),
                            text: item.str,
                            pageNumber,
                        });
                    }
                });
            } else if (line1 && !line2) {
                // Line deleted from PDF1
                line1.items.forEach((item: any) => {
                    if (viewport1) {
                        const x = (item.transform[4] / viewport1.width) * 100;
                        const y = ((viewport1.height - item.transform[5]) / viewport1.height) * 100;
                        const width = ((item.width || item.str.length * 6) / viewport1.width) * 100;
                        const height = ((item.height || 12) / viewport1.height) * 100;

                        differences.push({
                            type: 'deleted',
                            x: Math.max(0, Math.min(100, x)),
                            y: Math.max(0, Math.min(100, y)),
                            width: Math.max(1, Math.min(100, width)),
                            height: Math.max(1, Math.min(100, height)),
                            text: item.str,
                            pageNumber,
                        });
                    }
                });
            } else if (line1 && line2) {
                // Compare words in the line
                const normalizedLine1 = normalizeText(line1.text);
                const normalizedLine2 = normalizeText(line2.text);

                if (normalizedLine1 !== normalizedLine2) {
                    const wordDiff = compareWords(normalizedLine1, normalizedLine2);
                    
                    // Find changed words and highlight them
                    let wordIndex1 = 0;
                    let wordIndex2 = 0;

                    wordDiff.forEach((diffItem) => {
                        if (diffItem.type === 'delete') {
                            // Find corresponding item in line1
                            const words = normalizedLine1.split(/\s+/);
                            if (wordIndex1 < words.length) {
                                const word = words[wordIndex1];
                                const item = line1.items.find((it: any) => 
                                    it.str && normalizeText(it.str).includes(word)
                                );
                                
                                if (item && viewport1) {
                                    const x = (item.transform[4] / viewport1.width) * 100;
                                    const y = ((viewport1.height - item.transform[5]) / viewport1.height) * 100;
                                    const width = ((item.width || word.length * 6) / viewport1.width) * 100;
                                    const height = ((item.height || 12) / viewport1.height) * 100;

                                    differences.push({
                                        type: 'deleted',
                                        x: Math.max(0, Math.min(100, x)),
                                        y: Math.max(0, Math.min(100, y)),
                                        width: Math.max(1, Math.min(100, width)),
                                        height: Math.max(1, Math.min(100, height)),
                                        text: word,
                                        pageNumber,
                                    });
                                }
                                wordIndex1++;
                            }
                        } else if (diffItem.type === 'insert') {
                            // Find corresponding item in line2
                            const words = normalizedLine2.split(/\s+/);
                            if (wordIndex2 < words.length) {
                                const word = words[wordIndex2];
                                const item = line2.items.find((it: any) => 
                                    it.str && normalizeText(it.str).includes(word)
                                );
                                
                                if (item && viewport2) {
                                    const x = (item.transform[4] / viewport2.width) * 100;
                                    const y = ((viewport2.height - item.transform[5]) / viewport2.height) * 100;
                                    const width = ((item.width || word.length * 6) / viewport2.width) * 100;
                                    const height = ((item.height || 12) / viewport2.height) * 100;

                                    differences.push({
                                        type: 'added',
                                        x: Math.max(0, Math.min(100, x)),
                                        y: Math.max(0, Math.min(100, y)),
                                        width: Math.max(1, Math.min(100, width)),
                                        height: Math.max(1, Math.min(100, height)),
                                        text: word,
                                        pageNumber,
                                    });
                                }
                                wordIndex2++;
                            }
                        } else {
                            // Equal - skip
                            wordIndex1++;
                            wordIndex2++;
                        }
                    });
                }
            }
        }

        // Step 3: Visual comparison (pixel-level) for layout changes
        if (canvas1 && canvas2 && viewport1 && viewport2) {
            try {
                const ctx1 = canvas1.getContext('2d');
                const ctx2 = canvas2.getContext('2d');

                if (ctx1 && ctx2) {
                    const width = Math.min(canvas1.width, canvas2.width);
                    const height = Math.min(canvas1.height, canvas2.height);

                    // Sample pixels (every 15th pixel for performance)
                    const sampleRate = 15;
                    const imageData1 = ctx1.getImageData(0, 0, width, height);
                    const imageData2 = ctx2.getImageData(0, 0, width, height);

                    const diffRegions: Array<{ x: number; y: number; width: number; height: number }> = [];
                    const threshold = 25; // Color difference threshold

                    for (let y = 0; y < height; y += sampleRate) {
                        for (let x = 0; x < width; x += sampleRate) {
                            const idx = (y * width + x) * 4;
                            const r1 = imageData1.data[idx];
                            const g1 = imageData1.data[idx + 1];
                            const b1 = imageData1.data[idx + 2];
                            const r2 = imageData2.data[idx];
                            const g2 = imageData2.data[idx + 1];
                            const b2 = imageData2.data[idx + 2];

                            const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);

                            if (diff > threshold) {
                                const xPercent = (x / width) * 100;
                                const yPercent = (y / height) * 100;
                                const wPercent = (sampleRate / width) * 100;
                                const hPercent = (sampleRate / height) * 100;

                                // Check if this overlaps with existing text differences
                                const overlapsWithText = differences.some((diff) => {
                                    const diffRight = diff.x + diff.width;
                                    const diffBottom = diff.y + diff.height;
                                    const regionRight = xPercent + wPercent;
                                    const regionBottom = yPercent + hPercent;

                                    return !(
                                        xPercent > diffRight ||
                                        regionRight < diff.x ||
                                        yPercent > diffBottom ||
                                        regionBottom < diff.y
                                    );
                                });

                                if (!overlapsWithText) {
                                    diffRegions.push({
                                        x: xPercent,
                                        y: yPercent,
                                        width: wPercent,
                                        height: hPercent,
                                    });
                                }
                            }
                        }
                    }

                    // Merge nearby regions
                    const mergedRegions = mergeNearbyRegions(diffRegions);
                    mergedRegions.forEach((region) => {
                        differences.push({
                            type: 'modified',
                            x: region.x,
                            y: region.y,
                            width: region.width,
                            height: region.height,
                            text: 'Visual change',
                            pageNumber,
                        });
                    });
                }
            } catch (e) {
                console.warn('Visual comparison failed:', e);
            }
        }

        return differences;
    }

    function mergeNearbyRegions(
        regions: Array<{ x: number; y: number; width: number; height: number }>
    ): Array<{ x: number; y: number; width: number; height: number }> {
        if (regions.length === 0) return [];

        const merged: Array<{ x: number; y: number; width: number; height: number }> = [];
        const threshold = 8; // Merge regions within 8% of each other

        regions.forEach((region) => {
            let mergedWith = false;

            for (let i = 0; i < merged.length; i++) {
                const existing = merged[i];
                const distance = Math.sqrt(
                    Math.pow(existing.x - region.x, 2) + Math.pow(existing.y - region.y, 2)
                );

                if (distance < threshold) {
                    const minX = Math.min(existing.x, region.x);
                    const minY = Math.min(existing.y, region.y);
                    const maxX = Math.max(existing.x + existing.width, region.x + region.width);
                    const maxY = Math.max(existing.y + existing.height, region.y + region.height);

                    merged[i] = {
                        x: minX,
                        y: minY,
                        width: maxX - minX,
                        height: maxY - minY,
                    };
                    mergedWith = true;
                    break;
                }
            }

            if (!mergedWith) {
                merged.push({ ...region });
            }
        });

        return merged;
    }

    const generateComparisonPDF = async () => {
        if (!result || !file1 || !file2) return;

        try {
            const { PDFDocument, rgb } = await import('pdf-lib');

            // Load the original PDF (file1/left side) to highlight changes on it
            const arrayBuffer1 = await file1.arrayBuffer();
            
            // Load original PDF into pdf-lib for annotation
            const pdfDoc = await PDFDocument.load(arrayBuffer1);
            const maxPages = result.totalPages;

            // Add highlights for each page showing changes from original
            for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
                const pageData = result.pages.find(p => p.pageNumber === pageNum);
                if (!pageData || !pageData.hasDifferences) continue;

                if (pageNum <= pdfDoc.getPageCount()) {
                    const page = pdfDoc.getPage(pageNum - 1);
                    const { width, height } = page.getSize();

                    // Draw red rectangles for differences (deleted and modified content)
                    pageData.differences.forEach((diff) => {
                        // Highlight deleted and modified content on the original PDF
                        if (diff.type === 'deleted' || diff.type === 'modified') {
                            const x = (diff.x / 100) * width;
                            const y = height - ((diff.y + diff.height) / 100) * height; // PDF Y is bottom-up
                            const w = (diff.width / 100) * width;
                            const h = (diff.height / 100) * height;

                            // Draw red highlight
                            page.drawRectangle({
                                x: Math.max(0, x),
                                y: Math.max(0, y),
                                width: Math.min(w, width - x),
                                height: Math.min(h, height - y),
                                borderColor: rgb(1, 0, 0),
                                borderWidth: 1,
                                color: rgb(1, 0, 0),
                                opacity: 0.2,
                            });
                        }
                    });
                }
            }

            const pdfBytes = await pdfDoc.save({
                useObjectStreams: false,
                addDefaultPage: false,
            });

            // Convert Uint8Array to ArrayBuffer properly
            // Create a new ArrayBuffer by copying the bytes
            const buffer = new ArrayBuffer(pdfBytes.length);
            const view = new Uint8Array(buffer);
            view.set(pdfBytes);
            const blob = new Blob([buffer], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            // Trigger download
            const a = document.createElement('a');
            a.href = url;
            a.download = `comparison_${file1.name.replace('.pdf', '')}_vs_${file2.name.replace('.pdf', '')}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("PDF generation error:", error);
            alert("Failed to generate comparison PDF: " + (error instanceof Error ? error.message : String(error)));
        }
    };

    const handleReset = () => {
        setFile1(null);
        setFile2(null);
        setResult(null);
        setCurrentPageIndex(0);
        setSearchText("");
    };

    const goToPage = (pageNumber: number) => {
        const index = result?.pages.findIndex(p => p.pageNumber === pageNumber) ?? -1;
        if (index >= 0) {
            setCurrentPageIndex(index);
        }
    };

    const nextPage = () => {
        if (result && currentPageIndex < result.pages.length - 1) {
            setCurrentPageIndex(currentPageIndex + 1);
        }
    };

    const prevPage = () => {
        if (currentPageIndex > 0) {
            setCurrentPageIndex(currentPageIndex - 1);
        }
    };

    // Synchronized scrolling handler
    const handleLeftScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (isScrolling) return;
        setIsScrolling(true);
        if (rightScrollRef.current) {
            rightScrollRef.current.scrollTop = e.currentTarget.scrollTop;
        }
        setTimeout(() => setIsScrolling(false), 50);
    };

    const handleRightScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (isScrolling) return;
        setIsScrolling(true);
        if (leftScrollRef.current) {
            leftScrollRef.current.scrollTop = e.currentTarget.scrollTop;
        }
        setTimeout(() => setIsScrolling(false), 50);
    };

    // Get all differences across all pages for the change report
    const allDifferences = result ? result.pages.flatMap(page => 
        page.differences.map(diff => ({ ...diff, pageNumber: page.pageNumber }))
    ) : [];

    // Filter differences by search text
    const filteredDifferences = searchText
        ? allDifferences.filter(diff => 
            diff.text?.toLowerCase().includes(searchText.toLowerCase())
        )
        : allDifferences;

    const currentPage = result?.pages[currentPageIndex];

    // Change Report Sidebar
    const ChangeReportPanel = result ? (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto">
                {/* Comparison Mode Tabs */}
                <div className="mb-6">
                    <div className="flex gap-2 border-b border-zinc-200 mb-4">
                        <button
                            onClick={() => setComparisonMode('semantic')}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                                comparisonMode === 'semantic'
                                    ? 'border-blue-600 text-zinc-900'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-700'
                            }`}
                        >
                            <BookOpen size={18} />
                            <span className="font-bold text-sm">Semantic Text</span>
                            {comparisonMode === 'semantic' && (
                                <CheckCircle2 className="text-green-600" size={16} />
                            )}
                        </button>
                        <button
                            onClick={() => setComparisonMode('overlay')}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                                comparisonMode === 'overlay'
                                    ? 'border-blue-600 text-zinc-900'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-700'
                            }`}
                        >
                            <Layers size={18} />
                            <span className="font-bold text-sm">Content Overlay</span>
                        </button>
                    </div>
                </div>

                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-lg font-black text-zinc-900 mb-2">Change report ({result.totalDifferences})</h2>
                </div>

                {/* Search */}
                <div className="mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search text"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg text-sm font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Changes List */}
                <div className="space-y-3">
                    {filteredDifferences.length === 0 ? (
                        <div className="text-center py-8">
                            <CheckCircle2 className="text-green-500 mx-auto mb-2" size={32} />
                            <p className="text-sm font-semibold text-zinc-500">No changes found</p>
                        </div>
                    ) : (
                        filteredDifferences.map((diff, idx) => (
                            <div
                                key={`diff-${diff.pageNumber}-${idx}`}
                                className="border border-zinc-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => goToPage(diff.pageNumber)}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-zinc-500 uppercase">
                                        {diff.type === 'deleted' ? 'Deletion' : diff.type === 'added' ? 'Addition' : 'Modification'}
                                    </span>
                                    {diff.text && (
                                        <span className="text-xs font-bold text-zinc-400">
                                            {diff.type === 'deleted' ? '-' : '+'}{diff.text.length}
                                        </span>
                                    )}
                                </div>
                                <div className="border-2 border-red-500 bg-red-50 rounded p-3">
                                    <div className="text-xs font-bold text-zinc-600 mb-1">
                                        {diff.type === 'deleted' ? 'Old' : diff.type === 'added' ? 'New' : 'Changed'}
                                    </div>
                                    <div className="text-sm font-semibold text-zinc-900">
                                        {diff.text || 'Content changed'}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Download Button */}
            <div className="mt-6 pt-6 border-t border-zinc-200 space-y-2">
                <button
                    onClick={generateComparisonPDF}
                    className="w-full px-4 py-3 bg-red-600 text-white text-sm font-black rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                    <Download size={18} />
                    <span>Download report</span>
                    <ArrowRight size={18} />
                </button>
                <button
                    onClick={handleReset}
                    className="w-full px-4 py-2 bg-zinc-200 text-zinc-700 text-sm font-bold rounded-lg hover:bg-zinc-300 transition-colors"
                >
                    Compare Another
                </button>
            </div>
        </div>
    ) : null;

    return (
        <ConversionLayout
            title="Compare PDF"
            description="Compare two PDFs to find differences"
            settingsPanel={ChangeReportPanel || (
                <div className="flex flex-col h-full items-center justify-center text-center p-8">
                    <GitCompare className="text-zinc-300 mb-4" size={48} />
                    <p className="text-sm font-semibold text-zinc-400">
                        Upload two PDFs to see the change report
                    </p>
                </div>
            )}
        >
            {result && result.pages.length > 0 ? (
                <div className="w-full h-full flex flex-col">
                    {/* Comparison View - All Pages Scrollable */}
                    <div className="flex-1 overflow-hidden bg-zinc-50 rounded-xl border border-zinc-200">
                        {comparisonMode === 'semantic' ? (
                            <div className="flex h-full">
                                {/* Original PDF - Left Side - All Pages */}
                                <div className="flex-1 bg-white flex flex-col h-full border-r border-red-300">
                                    <div className="px-4 py-3 flex items-center justify-between flex-shrink-0 border-b border-zinc-200 bg-zinc-50">
                                        <h3 className="text-xs font-black text-zinc-400 uppercase">Original</h3>
                                    </div>
                                    <div 
                                        ref={leftScrollRef}
                                        onScroll={handleLeftScroll}
                                        className="flex-1 overflow-auto bg-white"
                                        style={{ minHeight: 0 }}
                                    >
                                        <div className="space-y-4 p-4">
                                            {result.pages.map((page) => (
                                                <div key={`original-${page.pageNumber}`} className="relative flex justify-center">
                                                    <div className="relative">
                                                        <div className="mb-2 text-center">
                                                            <span className="text-xs font-semibold text-zinc-500">Page {page.pageNumber}</span>
                                                        </div>
                                                        <img
                                                            src={page.originalImage}
                                                            alt={`Original page ${page.pageNumber}`}
                                                            className="block border border-zinc-200 rounded shadow-sm bg-white"
                                                            style={{ 
                                                                width: 'auto',
                                                                height: 'auto',
                                                                maxWidth: '100%',
                                                                minWidth: '500px'
                                                            }}
                                                        />
                                                        {page.differences
                                                            .filter(d => d.type === 'deleted')
                                                            .map((diff, idx) => (
                                                                <div
                                                                    key={`deleted-${page.pageNumber}-${idx}`}
                                                                    className="absolute border-2 border-red-500 bg-red-500/20 pointer-events-none"
                                                                    style={{
                                                                        left: `${diff.x}%`,
                                                                        top: `${diff.y}%`,
                                                                        width: `${diff.width}%`,
                                                                        height: `${diff.height}%`,
                                                                    }}
                                                                />
                                                            ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Modified PDF - Right Side - All Pages */}
                                <div className="flex-1 bg-white flex flex-col h-full">
                                    <div className="px-4 py-3 flex items-center justify-between flex-shrink-0 border-b border-zinc-200 bg-zinc-50">
                                        <h3 className="text-xs font-black text-zinc-400 uppercase">Modified</h3>
                                    </div>
                                    <div 
                                        ref={rightScrollRef}
                                        onScroll={handleRightScroll}
                                        className="flex-1 overflow-auto bg-white"
                                        style={{ minHeight: 0 }}
                                    >
                                        <div className="space-y-4 p-4">
                                            {result.pages.map((page) => (
                                                <div key={`modified-${page.pageNumber}`} className="relative flex justify-center">
                                                    <div className="relative">
                                                        <div className="mb-2 text-center">
                                                            <span className="text-xs font-semibold text-zinc-500">Page {page.pageNumber}</span>
                                                        </div>
                                                        <img
                                                            src={page.modifiedImage}
                                                            alt={`Modified page ${page.pageNumber}`}
                                                            className="block border border-zinc-200 rounded shadow-sm bg-white"
                                                            style={{ 
                                                                width: 'auto',
                                                                height: 'auto',
                                                                maxWidth: '100%',
                                                                minWidth: '500px'
                                                            }}
                                                        />
                                                        {page.differences
                                                            .filter(d => d.type === 'added' || d.type === 'modified')
                                                            .map((diff, idx) => (
                                                                <div
                                                                    key={`added-${page.pageNumber}-${idx}`}
                                                                    className="absolute border-2 border-red-500 bg-red-500/20 pointer-events-none"
                                                                    style={{
                                                                        left: `${diff.x}%`,
                                                                        top: `${diff.y}%`,
                                                                        width: `${diff.width}%`,
                                                                        height: `${diff.height}%`,
                                                                    }}
                                                                />
                                                            ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 bg-white flex flex-col h-full">
                                <div className="px-4 py-3 flex items-center justify-between flex-shrink-0 border-b border-zinc-200 bg-zinc-50">
                                    <h3 className="text-xs font-black text-zinc-400 uppercase">Content Overlay</h3>
                                </div>
                                <div className="flex-1 overflow-auto bg-white" style={{ minHeight: 0 }}>
                                    <div className="space-y-4 p-4">
                                        {result.pages.map((page) => (
                                            <div key={`overlay-${page.pageNumber}`} className="relative flex justify-center">
                                                <div className="relative">
                                                    <div className="mb-2 text-center">
                                                        <span className="text-xs font-semibold text-zinc-500">Page {page.pageNumber}</span>
                                                    </div>
                                                    <img
                                                        src={page.modifiedImage}
                                                        alt={`Page ${page.pageNumber}`}
                                                        className="block border border-zinc-200 rounded shadow-sm bg-white"
                                                        style={{ 
                                                            width: 'auto',
                                                            height: 'auto',
                                                            maxWidth: '100%',
                                                            minWidth: '500px'
                                                        }}
                                                    />
                                                    {page.differences.map((diff, idx) => (
                                                        <div
                                                            key={`diff-${page.pageNumber}-${idx}`}
                                                            className="absolute border-2 border-red-500 bg-red-500/20 pointer-events-none"
                                                            style={{
                                                                left: `${diff.x}%`,
                                                                top: `${diff.y}%`,
                                                                width: `${diff.width}%`,
                                                                height: `${diff.height}%`,
                                                            }}
                                                            title={diff.text || diff.type}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <div className="w-full max-w-6xl">
                        {/* Side-by-Side File Upload */}
                        <div className="flex gap-4 h-[500px]">
                            {/* Left Panel */}
                            <div className="flex-1 flex flex-col">
                                <div
                                    onDragOver={(e) => handleDragOver(e, 1)}
                                    onDragLeave={() => handleDragLeave(1)}
                                    onDrop={(e) => handleDrop(e, 1)}
                                    className={`flex-1 border-2 border-dashed rounded-lg bg-white flex flex-col items-center justify-center cursor-pointer transition-colors ${
                                        dragOver1 ? 'border-blue-500 bg-blue-50' : 'border-zinc-300 hover:border-blue-400'
                                    }`}
                                    onClick={() => file1InputRef.current?.click()}
                                >
                                    {file1 ? (
                                        <div className="flex flex-col items-center gap-3 p-6">
                                            <FileText className="text-blue-600" size={32} />
                                            <div className="text-center">
                                                <p className="text-sm font-bold text-zinc-700">{file1.name}</p>
                                                <p className="text-xs font-semibold text-zinc-500 mt-1">
                                                    {(file1.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFile1(null);
                                                }}
                                                className="text-zinc-400 hover:text-red-600 transition-colors"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3">
                                            <p className="text-base font-semibold text-zinc-600">Drag and drop</p>
                                            <p className="text-sm font-semibold text-zinc-500">Or</p>
                                            <button className="px-6 py-2 border-2 border-red-500 text-red-600 rounded-lg font-bold hover:bg-red-50 transition-colors">
                                                Select file
                                            </button>
                                        </div>
                                    )}
                                    <input
                                        ref={file1InputRef}
                                        type="file"
                                        accept=".pdf"
                                        onChange={handleFile1Change}
                                        className="hidden"
                                    />
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="w-px bg-blue-300 my-8" />

                            {/* Right Panel */}
                            <div className="flex-1 flex flex-col">
                                <div
                                    onDragOver={(e) => handleDragOver(e, 2)}
                                    onDragLeave={() => handleDragLeave(2)}
                                    onDrop={(e) => handleDrop(e, 2)}
                                    className={`flex-1 border-2 border-dashed rounded-lg bg-white flex flex-col items-center justify-center cursor-pointer transition-colors ${
                                        dragOver2 ? 'border-blue-500 bg-blue-50' : 'border-zinc-300 hover:border-blue-400'
                                    }`}
                                    onClick={() => file2InputRef.current?.click()}
                                >
                                    {file2 ? (
                                        <div className="flex flex-col items-center gap-3 p-6">
                                            <FileText className="text-blue-600" size={32} />
                                            <div className="text-center">
                                                <p className="text-sm font-bold text-zinc-700">{file2.name}</p>
                                                <p className="text-xs font-semibold text-zinc-500 mt-1">
                                                    {(file2.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFile2(null);
                                                }}
                                                className="text-zinc-400 hover:text-red-600 transition-colors"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3">
                                            <p className="text-base font-semibold text-zinc-600">Drag and drop</p>
                                            <p className="text-sm font-semibold text-zinc-500">Or</p>
                                            <button className="px-6 py-2 border-2 border-red-500 text-red-600 rounded-lg font-bold hover:bg-red-50 transition-colors">
                                                Select file
                                            </button>
                                        </div>
                                    )}
                                    <input
                                        ref={file2InputRef}
                                        type="file"
                                        accept=".pdf"
                                        onChange={handleFile2Change}
                                        className="hidden"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Compare Button */}
                        {file1 && file2 && (
                            <div className="mt-6 flex justify-center">
                                <button
                                    onClick={handleCompare}
                                    disabled={isProcessing}
                                    className="px-8 py-3 bg-blue-600 text-white rounded-lg font-black hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                >
                                    {isProcessing ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>Comparing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <GitCompare size={20} />
                                            <span>Compare PDFs</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </ConversionLayout>
    );
}
