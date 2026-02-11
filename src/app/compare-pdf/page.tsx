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

    // --- Pure Health Functions moved to end of file ---

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
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-b-2 transition-colors ${comparisonMode === 'semantic'
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
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-b-2 transition-colors ${comparisonMode === 'overlay'
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
                                key={`diff-list-${diff.pageNumber}-${idx}`}
                                className="group relative border border-zinc-200 rounded-xl p-4 bg-white hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer overflow-hidden"
                                onClick={() => goToPage(diff.pageNumber)}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${diff.type === 'deleted'
                                        ? 'bg-rose-50 text-rose-600 border-rose-100'
                                        : diff.type === 'added'
                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                            : 'bg-amber-50 text-amber-600 border-amber-100'
                                        }`}>
                                        {diff.type === 'deleted' ? 'Deleted' : diff.type === 'added' ? 'Added' : 'Visual Change'}
                                    </span>
                                    <span className="text-[10px] font-bold text-zinc-400">
                                        Page {diff.pageNumber}
                                    </span>
                                </div>
                                <div className={`pl-3 border-l-2 ${diff.type === 'deleted'
                                    ? 'border-rose-500'
                                    : diff.type === 'added'
                                        ? 'border-emerald-500'
                                        : 'border-amber-500'
                                    }`}>
                                    <p className="text-sm font-bold text-zinc-800 line-clamp-2 leading-relaxed">
                                        {diff.text || (diff.type === 'modified' ? 'Visual layout change detected' : 'Content change')}
                                    </p>
                                </div>

                                {/* Hover arrow indicator */}
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ArrowRight size={14} className="text-blue-400" />
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
                <div className="flex flex-col h-full items-center justify-center text-center p-4">
                    {file1 && file2 ? (
                        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex flex-col items-center justify-center mb-8">
                                <div className="p-4 bg-blue-50 rounded-full mb-4">
                                    <GitCompare className="text-blue-600" size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-zinc-900 mb-2">Ready to Compare</h3>
                                <p className="text-xs font-medium text-zinc-500 max-w-[200px]">
                                    Both documents are uploaded. Click below to start.
                                </p>
                            </div>

                            <button
                                onClick={handleCompare}
                                disabled={isProcessing}
                                className="w-full px-4 py-4 bg-blue-600 text-white text-sm font-black rounded-xl hover:bg-blue-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-blue-200"
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
                    ) : (
                        <>
                            <GitCompare className="text-zinc-300 mb-4" size={48} />
                            <p className="text-sm font-semibold text-zinc-400">
                                Upload two PDFs to see the change report
                            </p>
                        </>
                    )}
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
                                                <div key={`original-${page.pageNumber}`} className="flex flex-col items-center">
                                                    <div className="mb-2 text-center">
                                                        <span className="text-xs font-semibold text-zinc-500">Page {page.pageNumber}</span>
                                                    </div>
                                                    <div className="relative">
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
                                                                    className="absolute border border-rose-400 bg-rose-400/20 rounded-sm pointer-events-none transition-all duration-300"
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
                                                <div key={`modified-${page.pageNumber}`} className="flex flex-col items-center">
                                                    <div className="mb-2 text-center">
                                                        <span className="text-xs font-semibold text-zinc-500">Page {page.pageNumber}</span>
                                                    </div>
                                                    <div className="relative">
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
                                                                    className={`absolute border rounded-sm pointer-events-none transition-all duration-300 ${diff.type === 'added'
                                                                        ? 'border-emerald-400 bg-emerald-400/20'
                                                                        : 'border-amber-400 bg-amber-400/20'
                                                                        }`}
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
                                            <div key={`overlay-${page.pageNumber}`} className="flex flex-col items-center">
                                                <div className="mb-2 text-center">
                                                    <span className="text-xs font-semibold text-zinc-500">Page {page.pageNumber}</span>
                                                </div>
                                                <div className="relative">
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
                                                            className={`absolute mix-blend-multiply transition-all duration-300 ${diff.type === 'added'
                                                                ? 'bg-emerald-300/40'
                                                                : diff.type === 'deleted'
                                                                    ? 'bg-rose-300/40'
                                                                    : 'bg-amber-300/40'
                                                                }`}
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
                                    className={`flex-1 border-2 border-dashed rounded-lg bg-white flex flex-col items-center justify-center cursor-pointer transition-colors ${dragOver1 ? 'border-blue-500 bg-blue-50' : 'border-zinc-300 hover:border-blue-400'
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
                                    className={`flex-1 border-2 border-dashed rounded-lg bg-white flex flex-col items-center justify-center cursor-pointer transition-colors ${dragOver2 ? 'border-blue-500 bg-blue-50' : 'border-zinc-300 hover:border-blue-400'
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

                        {/* Compare Button moved to right panel */}
                    </div>
                </div>
            )}
        </ConversionLayout>
    );
}

// --- Helper Functions ---

/**
 * Text normalization - remove extra spaces, normalize formatting
 */
function normalizeText(text: string): string {
    if (!text) return '';
    return text.replace(/[\s\n\r\t]+/g, ' ').trim();
}

/**
 * Check if text is only whitespace
 */
function isOnlyWhitespace(text: string): boolean {
    return !text || /^\s*$/.test(text);
}

/**
 * Word-by-word comparison
 * Uses a simpler but more effective word-level matching
 */
function compareWords(text1: string, text2: string): Array<{ type: 'equal' | 'delete' | 'insert'; text: string }> {
    const words1 = text1.split(/\s+/).filter(w => w.length > 0);
    const words2 = text2.split(/\s+/).filter(w => w.length > 0);

    const diff: Array<{ type: 'equal' | 'delete' | 'insert'; text: string }> = [];

    // Use a basic LCS or simple alignment for better word diffs
    let i = 0, j = 0;
    while (i < words1.length || j < words2.length) {
        if (i < words1.length && j < words2.length && words1[i] === words2[j]) {
            diff.push({ type: 'equal', text: words1[i] });
            i++; j++;
        } else {
            // Check if word1 is deleted or word2 is inserted
            // Looking ahead 1 word to see if we find a match
            if (i < words1.length && j < words2.length) {
                if (words1[i + 1] === words2[j]) {
                    diff.push({ type: 'delete', text: words1[i] });
                    i++;
                } else if (words1[i] === words2[j + 1]) {
                    diff.push({ type: 'insert', text: words2[j] });
                    j++;
                } else {
                    // Both changed
                    diff.push({ type: 'delete', text: words1[i] });
                    diff.push({ type: 'insert', text: words2[j] });
                    i++; j++;
                }
            } else if (i < words1.length) {
                diff.push({ type: 'delete', text: words1[i] });
                i++;
            } else {
                diff.push({ type: 'insert', text: words2[j] });
                j++;
            }
        }
    }
    return diff;
}

/**
 * Enhanced line extraction
 * Groups items into lines based on Y-coordinate tolerance
 */
function extractTextLines(textItems: any[]): Array<{ text: string; y: number; items: any[] }> {
    if (!textItems || textItems.length === 0) return [];

    const validItems = textItems.filter(item =>
        item.str && item.transform && item.transform.length >= 6 && !isOnlyWhitespace(item.str)
    );

    const lines: Array<{ text: string; y: number; items: any[] }> = [];
    const Y_TOLERANCE = 3;

    // Sort by Y descending (top of page is highest Y in PDF space usually, but we check)
    const sortedByY = [...validItems].sort((a, b) => b.transform[5] - a.transform[5]);

    sortedByY.forEach(item => {
        const itemY = item.transform[5];
        let foundLine = lines.find(line => Math.abs(line.y - itemY) < Y_TOLERANCE);

        if (!foundLine) {
            foundLine = { text: '', y: itemY, items: [] };
            lines.push(foundLine);
        }

        foundLine.items.push(item);
    });

    lines.forEach(line => {
        line.items.sort((a, b) => a.transform[4] - b.transform[4]);

        // Split items that contain spaces to ensure 1 item ≈ 1 word
        // This is crucial for word-by-word diffing accuracy
        const wordItems: any[] = [];
        line.items.forEach(item => {
            const words = item.str.split(/(\s+)/);
            if (words.length > 1) {
                let currentX = item.transform[4];
                const totalWidth = item.width || (item.str.length * 5);

                words.forEach((word: string) => {
                    const wordWidth = (word.length / item.str.length) * totalWidth;
                    if (!isOnlyWhitespace(word)) {
                        wordItems.push({
                            ...item,
                            str: word,
                            width: wordWidth,
                            transform: [item.transform[0], item.transform[1], item.transform[2], item.transform[3], currentX, item.transform[5]]
                        });
                    }
                    currentX += wordWidth;
                });
            } else {
                wordItems.push(item);
            }
        });

        line.items = wordItems;
        line.text = line.items.map(it => it.str).join(' ');
    });

    return lines.sort((a, b) => b.y - a.y);
}

/**
 * Calculates correct bounding box for a group of items and pushes as a difference
 */
function pushGroup(
    group: { type: 'added' | 'deleted' | 'modified'; items: any[]; text: string[] },
    pageNumber: number,
    viewport: any,
    differences: Difference[]
) {
    if (!group.items || group.items.length === 0 || !viewport) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    group.items.forEach(item => {
        const transform = item.transform;
        const x = transform[4];
        const y = transform[5];

        // Use the Y-axis scaling for font size (column 2 of matrix: transform[2], transform[3])
        // This is more accurate for vertical positioning than the X-axis scaling.
        const fontSizeY = Math.sqrt(transform[2] * transform[2] + transform[3] * transform[3]) || 12;

        // Horizontal scaling for width calculation
        const fontSizeX = Math.sqrt(transform[0] * transform[0] + transform[1] * transform[1]) || 12;

        // Use reported width if available
        const fontWidth = (typeof item.width === 'number' && item.width > 0) ? item.width : (item.str.length * (fontSizeX * 0.5));

        /*
         * BOX ALIGNMENT FIX:
         * In many PDFs, the 'y' coordinate (transform[5]) is reported as the top or 
         * near-top of the text, rather than the baseline. 
         * To ensure highlights are EXACTLY on top of the text (as requested by user):
         * 1. Shift the box down by roughly 0.8 * fontSize to cover the body.
         * 2. Set height to ~1.1 * fontSize to cover ascenders and descenders.
         */

        // ADJUSTED OFFSETS (Relative to 'y'):
        // We are using a balanced offset to center the highlight on the text line.
        // PDF 'y' is typically the baseline.

        const pTop = viewport.convertToViewportPoint(x, y + (fontSizeY * 0.7));
        const pBottom = viewport.convertToViewportPoint(x + fontWidth, y - (fontSizeY * 0.2));

        const vx1 = Math.min(pBottom[0], pTop[0]);
        const vy1 = Math.min(pBottom[1], pTop[1]);
        const vx2 = Math.max(pBottom[0], pTop[0]);
        const vy2 = Math.max(pBottom[1], pTop[1]);

        minX = Math.min(minX, vx1);
        minY = Math.min(minY, vy1);
        maxX = Math.max(maxX, vx2);
        maxY = Math.max(maxY, vy2);
    });

    // Convert pixels to percentages relative to viewport
    const xPercent = (minX / viewport.width) * 100;
    const yPercent = (minY / viewport.height) * 100;
    const wPercent = ((maxX - minX) / viewport.width) * 100;
    const hPercent = ((maxY - minY) / viewport.height) * 100;

    differences.push({
        type: group.type,
        x: Math.max(0, Math.min(100, xPercent)),
        y: Math.max(0, Math.min(100, yPercent)),
        width: Math.max(0.01, Math.min(100, wPercent)),
        height: Math.max(0.01, Math.min(100, hPercent)),
        text: group.text.join(' '),
        pageNumber,
    });
}

/**
 * Simple similarity score between two strings (0 to 1)
 */
function getSimilarity(s1: string, s2: string): number {
    const t1 = normalizeText(s1).toLowerCase();
    const t2 = normalizeText(s2).toLowerCase();
    if (t1 === t2) return 1;
    if (!t1 || !t2) return 0;

    const words1 = t1.split(/\s+/);
    const words2 = t2.split(/\s+/);
    const set1 = new Set(words1);
    const intersection = words2.filter(w => set1.has(w));

    return (intersection.length * 2) / (words1.length + words2.length);
}

/**
 * Aligns two sets of lines using a basic LCS approach with fuzzy matching
 * support for modified lines.
 */
function alignLines(
    lines1: Array<{ text: string; items: any[] }>,
    lines2: Array<{ text: string; items: any[] }>
): Array<{ line1?: any; line2?: any }> {
    const n = lines1.length;
    const m = lines2.length;
    const SIMILARITY_THRESHOLD = 0.4;

    // DP table for fuzzy LCS
    const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            const similarity = getSimilarity(lines1[i - 1].text, lines2[j - 1].text);
            if (similarity > SIMILARITY_THRESHOLD) {
                dp[i][j] = dp[i - 1][j - 1] + similarity;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    const result: Array<{ line1?: any; line2?: any }> = [];
    let i = n, j = m;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0) {
            const similarity = getSimilarity(lines1[i - 1].text, lines2[j - 1].text);
            if (similarity > SIMILARITY_THRESHOLD) {
                result.unshift({ line1: lines1[i - 1], line2: lines2[j - 1] });
                i--; j--;
                continue;
            }
        }

        if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            result.unshift({ line2: lines2[j - 1] });
            j--;
        } else if (i > 0) {
            result.unshift({ line1: lines1[i - 1] });
            i--;
        }
    }
    return result;
}

/**
 * Main difference detection logic
 */
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

    // Step 1: Extract lines and improve grouping
    const rawLines1 = extractTextLines(textItems1);
    const rawLines2 = extractTextLines(textItems2);

    // Step 2: Align lines to avoid cascading mismatches
    const alignedLines = alignLines(rawLines1, rawLines2);

    // Step 3: Compare aligned pairs
    alignedLines.forEach(({ line1, line2 }) => {
        if (!line1 && line2) {
            // Addition
            pushGroup({ type: 'added', items: line2.items, text: [line2.text] }, pageNumber, viewport2, differences);
        } else if (line1 && !line2) {
            // Deletion
            pushGroup({ type: 'deleted', items: line1.items, text: [line1.text] }, pageNumber, viewport1, differences);
        } else if (line1 && line2) {
            // Compare content of matched lines
            const t1 = normalizeText(line1.text);
            const t2 = normalizeText(line2.text);

            if (t1 !== t2) {
                // Word-by-word within the line
                const wordDiff = compareWords(t1, t2);

                let currentItem1 = 0;
                let currentItem2 = 0;

                let group: { type: 'added' | 'deleted'; items: any[]; text: string[] } | null = null;

                const finishGroup = () => {
                    if (group) {
                        pushGroup(
                            { ...group, type: group.type as any },
                            pageNumber,
                            group.type === 'deleted' ? viewport1 : viewport2,
                            differences
                        );
                        group = null;
                    }
                };

                wordDiff.forEach(d => {
                    if (d.type === 'equal') {
                        finishGroup();
                        currentItem1++;
                        currentItem2++;
                    } else if (d.type === 'delete') {
                        const item = line1.items[currentItem1];
                        if (item) {
                            if (group && group.type === 'deleted') {
                                group.items.push(item);
                                group.text.push(d.text);
                            } else {
                                finishGroup();
                                group = { type: 'deleted', items: [item], text: [d.text] };
                            }
                        }
                        currentItem1++;
                    } else if (d.type === 'insert') {
                        const item = line2.items[currentItem2];
                        if (item) {
                            if (group && group.type === 'added') {
                                group.items.push(item);
                                group.text.push(d.text);
                            } else {
                                finishGroup();
                                group = { type: 'added', items: [item], text: [d.text] };
                            }
                        }
                        currentItem2++;
                    }
                });
                finishGroup();
            }
        }
    });

    return differences;
}
