"use client";

import { useState } from "react";
import { Sheet, Plus, FileText } from "lucide-react";
import ConversionLayout from "@/components/ConversionLayout";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";
import PreviewContent from "@/components/PreviewContent";

interface TableRow {
    cells: string[];
}

export default function PDFToExcel() {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<{ fileName: string; downloadUrl: string } | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<{ page: number; total: number } | null>(null);

    const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFiles([file]);
            setResult(null);
            setError(null);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleConvert = async () => {
        if (files.length === 0) return;

        setIsProcessing(true);
        setError(null);
        setProgress(null);

        try {
            // Load PDF.js
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

            const file = files[0];
            const arrayBuffer = await file.arrayBuffer();
            
            // Load PDF
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            const numPages = pdf.numPages;

            setProgress({ page: 0, total: numPages });

            const allTables: TableRow[][] = [];
            const allTextItems: Array<{text: string, x: number, y: number, width: number, height: number}>[] = [];

            // Extract text with positions from each page
            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                setProgress({ page: pageNum, total: numPages });

                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: 1.0 });
                
                // Get text content with positions
                const textContent = await page.getTextContent();
                
                const pageTextItems: Array<{text: string, x: number, y: number, width: number, height: number}> = [];
                
                for (const item of textContent.items as any[]) {
                    if (item.str && item.transform && item.transform.length >= 6) {
                        const x = item.transform[4];
                        const y = viewport.height - item.transform[5]; // Flip Y coordinate
                        const width = item.width || 0;
                        const height = item.height || 0;
                        
                        pageTextItems.push({
                            text: item.str,
                            x: x,
                            y: y,
                            width: width,
                            height: height,
                        });
                    }
                }
                
                allTextItems.push(pageTextItems);
            }

            // Extract tables from text items using improved algorithm
            const tables = extractTablesFromTextItems(allTextItems);
            
            // Send table data to server to create Excel
            const response = await fetch("/api/pdf-to-excel", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    tables: tables,
                    fileName: file.name,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setResult(data);
            } else {
                const errorData = await response.json().catch(() => ({ error: "Conversion failed" }));
                setError(errorData.error || errorData.details || "Conversion failed. Please try again.");
            }
        } catch (error: any) {
            console.error(error);
            setError(error.message || "An error occurred during conversion. Please try again.");
        } finally {
            setIsProcessing(false);
            setProgress(null);
        }
    };

    // CORRECTED: Proper table extraction with global columns and correct row ordering
    function extractTablesFromTextItems(textItemsPerPage: Array<Array<{text: string, x: number, y: number, width: number, height: number}>>): TableRow[][] {
        const allTables: TableRow[][] = [];
        
        for (const pageItems of textItemsPerPage) {
            if (pageItems.length === 0) continue;
            
            // ============================================
            // STEP 1: Dynamic Row Tolerance
            // ============================================
            const heights = pageItems.map(item => Math.abs(item.height)).filter(h => h > 0);
            const avgHeight = heights.length > 0 
                ? heights.reduce((sum, h) => sum + h, 0) / heights.length 
                : 10;
            const rowTolerance = avgHeight * 0.8;
            
            // Calculate average character width for column tolerance
            const widths = pageItems.map(item => Math.abs(item.width)).filter(w => w > 0);
            const avgCharWidth = widths.length > 0
                ? widths.reduce((sum, w) => sum + w, 0) / widths.length
                : 10;
            const columnTolerance = avgCharWidth * 2;
            
            // Sort all text by Y ascending (top to bottom)
            // After Y flip: Y=0 is at top, higher Y is lower on page
            const sortedByY = [...pageItems].sort((a, b) => a.y - b.y);
            
            // Group items into rows
            const rows: typeof pageItems[] = [];
            
            for (const item of sortedByY) {
                let foundRow = false;
                for (const row of rows) {
                    // Compute avgY correctly: average of all items in row
                    const rowAvgY = row.reduce((sum, r) => sum + r.y, 0) / row.length;
                    if (Math.abs(item.y - rowAvgY) < rowTolerance) {
                        row.push(item);
                        foundRow = true;
                        break;
                    }
                }
                if (!foundRow) {
                    rows.push([item]);
                }
            }
            
            // ============================================
            // STEP 2: Merge Header Rows (vertically stacked headers)
            // ============================================
            const headerMergeTolerance = avgHeight * 1.5;
            const mergedRows: typeof pageItems[] = [];
            
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                let merged = false;
                
                // Check if this row should be merged with previous
                if (mergedRows.length > 0) {
                    const lastRow = mergedRows[mergedRows.length - 1];
                    const rowAvgY = row.reduce((sum, r) => sum + r.y, 0) / row.length;
                    const lastRowAvgY = lastRow.reduce((sum, r) => sum + r.y, 0) / lastRow.length;
                    const yDiff = Math.abs(rowAvgY - lastRowAvgY);
                    
                    // Check if rows have similar X positions (same columns)
                    const rowXPositions = row.map(r => r.x).sort((a, b) => a - b);
                    const lastRowXPositions = lastRow.map(r => r.x).sort((a, b) => a - b);
                    const similarColumns = rowXPositions.length === lastRowXPositions.length &&
                        rowXPositions.every((x, idx) => Math.abs(x - lastRowXPositions[idx]) < columnTolerance);
                    
                    // Merge if vertically close and similar column structure
                    if (yDiff < headerMergeTolerance && similarColumns) {
                        lastRow.push(...row);
                        merged = true;
                    }
                }
                
                if (!merged) {
                    mergedRows.push([...row]);
                }
            }
            
            // ============================================
            // STEP 3: Sort Rows Top to Bottom (FIXED)
            // ============================================
            mergedRows.sort((a, b) => {
                // Compute avgY correctly for each row
                const aAvgY = a.reduce((sum, i) => sum + i.y, 0) / a.length;
                const bAvgY = b.reduce((sum, i) => sum + i.y, 0) / b.length;
                // After Y flip: lower Y = higher on page, so sort ascending
                return aAvgY - bAvgY; // ASCENDING = top to bottom
            });
            
            // ============================================
            // STEP 4: GLOBAL Column Detection (PyMuPDF-style)
            // ============================================
            // First, sort each row's items by X position (left to right)
            for (const row of mergedRows) {
                row.sort((a, b) => a.x - b.x);
            }
            
            // Collect ALL X positions from ALL rows - this is critical for detecting ALL columns
            const allXPositions: number[] = [];
            for (const row of mergedRows) {
                for (const item of row) {
                    // Add both start X and end X to catch all column boundaries
                    allXPositions.push(item.x);
                    allXPositions.push(item.x + item.width);
                }
            }
            
            if (allXPositions.length === 0) continue;
            
            // Sort and deduplicate X positions
            const sortedX = [...new Set(allXPositions)].sort((a, b) => a - b);
            
            // Use DBSCAN-like clustering with adaptive tolerance
            // This matches PyMuPDF's approach of detecting column boundaries
            const clusters: number[][] = [];
            const visited = new Set<number>();
            
            // Adaptive tolerance: use smaller tolerance to detect more distinct columns
            const adaptiveTolerance = Math.min(columnTolerance, avgCharWidth * 1.5);
            
            for (let i = 0; i < sortedX.length; i++) {
                if (visited.has(i)) continue;
                
                const x = sortedX[i];
                const cluster = [x];
                visited.add(i);
                
                // Find all nearby X positions
                for (let j = i + 1; j < sortedX.length; j++) {
                    if (visited.has(j)) continue;
                    if (Math.abs(sortedX[j] - x) < adaptiveTolerance) {
                        cluster.push(sortedX[j]);
                        visited.add(j);
                    }
                }
                
                clusters.push(cluster);
            }
            
            // Get column anchors: use median of each cluster
            const columnAnchors = clusters
                .map(cluster => {
                    const sorted = cluster.sort((a, b) => a - b);
                    return sorted[Math.floor(sorted.length / 2)]; // Median
                })
                .sort((a, b) => a - b);
            
            // Filter: Remove anchors that are too close (within same column)
            // But be more permissive to catch all distinct columns
            const filteredAnchors: number[] = [];
            const minGap = avgCharWidth * 1.0; // Very permissive to catch all columns
            
            for (const anchor of columnAnchors) {
                if (filteredAnchors.length === 0) {
                    filteredAnchors.push(anchor);
                } else {
                    const lastAnchor = filteredAnchors[filteredAnchors.length - 1];
                    const gap = anchor - lastAnchor;
                    
                    // Keep if gap is significant OR if it appears frequently (likely a real column)
                    const anchorFrequency = clusters.find(c => 
                        c.some(x => Math.abs(x - anchor) < adaptiveTolerance)
                    )?.length || 0;
                    
                    if (gap >= minGap || anchorFrequency > 2) {
                        filteredAnchors.push(anchor);
                    }
                }
            }
            
            if (filteredAnchors.length < 2) continue;
            
            // ============================================
            // STEP 5: Assign Items to Columns (Order-Based Assignment)
            // ============================================
            const tableRows: TableRow[] = [];
            
            for (const row of mergedRows) {
                // Initialize cells array (one per global column anchor)
                const cells: string[] = new Array(filteredAnchors.length).fill('');
                
                // Items are already sorted by X position (left to right) from STEP 4
                // Use a more precise assignment method: assign based on order and position
                const sortedRow = [...row].sort((a, b) => a.x - b.x);
                
                // PyMuPDF-style: Assign each item directly to column based on its X position
                // This is more accurate than grouping first
                for (const item of sortedRow) {
                    const itemText = item.text.trim();
                    if (!itemText) continue;
                    
                    // Find which column this item belongs to based on its X position
                    let assignedCol = -1;
                    let minDistance = Infinity;
                    
                    // Find the column anchor closest to this item's X position
                    for (let i = 0; i < filteredAnchors.length; i++) {
                        const distance = Math.abs(item.x - filteredAnchors[i]);
                        if (distance < minDistance) {
                            minDistance = distance;
                            assignedCol = i;
                        }
                    }
                    
                    // Assign to column if within reasonable distance
                    if (assignedCol >= 0 && minDistance < columnTolerance * 2) {
                        // Ensure cells array is large enough
                        while (cells.length <= assignedCol) {
                            cells.push('');
                        }
                        
                        // Append to cell (items in same column get concatenated)
                        if (cells[assignedCol]) {
                            cells[assignedCol] += ' ' + itemText;
                        } else {
                            cells[assignedCol] = itemText;
                        }
                    }
                }
                
                // Post-process: Ensure all columns are represented (fill gaps)
                // This handles cases where a row might skip some columns
                while (cells.length < filteredAnchors.length) {
                    cells.push('');
                }
                
                // Only add row if it has at least one non-empty cell
                if (cells.some(cell => cell.trim().length > 0)) {
                    tableRows.push({ cells: cells.map(c => c.trim()) });
                }
            }
            
            // Filter: Only keep rows with at least 2 columns
            const validRows = tableRows.filter(row => {
                const nonEmptyCells = row.cells.filter(c => c.trim().length > 0);
                return nonEmptyCells.length >= 2;
            });
            
            if (validRows.length >= 2) {
                allTables.push(validRows);
            }
        }
        
        return allTables;
    }
    
    // Legacy function kept for compatibility
    function extractTablesFromOCRWords(words: any[]): TableRow[][] {
        if (words.length === 0) return [];

        // Step 1: Group words into rows (more accurate row detection)
        const rowTolerance = 8;
        const rows: any[][] = [];
        const sortedWords = [...words].sort((a, b) => b.bbox.y0 - a.bbox.y0);

        for (const word of sortedWords) {
            let foundRow = false;
            for (const row of rows) {
                // Use average Y position of row for better matching
                const rowAvgY = row.reduce((sum, w) => sum + w.bbox.y0, 0) / row.length;
                if (Math.abs(word.bbox.y0 - rowAvgY) < rowTolerance) {
                    row.push(word);
                    foundRow = true;
                    break;
                }
            }
            if (!foundRow) {
                rows.push([word]);
            }
        }

        // Sort rows by Y position (top to bottom)
        rows.sort((a, b) => {
            const aY = a.reduce((sum, w) => sum + w.bbox.y0, 0) / a.length;
            const bY = b.reduce((sum, w) => sum + w.bbox.y0, 0) / b.length;
            return bY - aY;
        });

        // Step 2: Group words into cells within each row based on horizontal gaps
        const cellGapThreshold = 25;
        const rowsWithCells: any[][][] = [];

        for (const row of rows) {
            row.sort((a: any, b: any) => a.bbox.x0 - b.bbox.x0);
            const cells: any[][] = [];
            let currentCell: any[] = [];
            let lastEndX = -Infinity;

            for (const word of row) {
                const gap = word.bbox.x0 - lastEndX;
                if (gap > cellGapThreshold && currentCell.length > 0) {
                    cells.push(currentCell);
                    currentCell = [word];
                    lastEndX = word.bbox.x1;
                } else {
                    currentCell.push(word);
                    lastEndX = Math.max(lastEndX, word.bbox.x1);
                }
            }
            if (currentCell.length > 0) {
                cells.push(currentCell);
            }
            rowsWithCells.push(cells);
        }

        // Step 3: Detect columns by analyzing cell X positions across all rows
        const columnTolerance = 40;
        const allCellXPositions: number[] = [];
        
        for (const rowCells of rowsWithCells) {
            for (const cell of rowCells) {
                const cellX = cell[0].bbox.x0;
                allCellXPositions.push(cellX);
            }
        }

        if (allCellXPositions.length === 0) return [];

        // Cluster X positions to find column boundaries
        const sortedX = [...new Set(allCellXPositions)].sort((a, b) => a - b);
        const clusters: number[][] = [];
        const visited = new Set<number>();

        for (let i = 0; i < sortedX.length; i++) {
            if (visited.has(i)) continue;
            const x = sortedX[i];
            const cluster = [x];
            visited.add(i);

            for (let j = i + 1; j < sortedX.length; j++) {
                if (visited.has(j)) continue;
                if (Math.abs(sortedX[j] - x) < columnTolerance) {
                    cluster.push(sortedX[j]);
                    visited.add(j);
                }
            }
            clusters.push(cluster);
        }

        // Get column centers (medians)
        const columnCenters = clusters
            .map(cluster => {
                const sorted = cluster.sort((a, b) => a - b);
                return sorted[Math.floor(sorted.length / 2)];
            })
            .sort((a, b) => a - b);

        if (columnCenters.length < 2) return [];

        // Step 4: Map cells to columns using ORDER-BASED approach (most reliable)
        const tableRows: TableRow[] = [];
        const maxCols = Math.max(...rowsWithCells.map(row => row.length), columnCenters.length);

        for (const rowCells of rowsWithCells) {
            const cells: string[] = new Array(maxCols).fill('');

            // Map cells to columns by ORDER (left to right)
            // This is more reliable than position matching alone
            for (let i = 0; i < rowCells.length && i < maxCols; i++) {
                const cell = rowCells[i];
                const cellText = cell
                    .map((w: any) => w.text.trim())
                    .filter((t: string) => t)
                    .join(' ');

                if (cellText) {
                    // Use order-based assignment: cell at position i goes to column i
                    if (cells[i]) {
                        cells[i] += ' ' + cellText;
                    } else {
                        cells[i] = cellText;
                    }
                }
            }

            if (cells.some(cell => cell.trim().length > 0)) {
                tableRows.push({ cells: cells.map(c => c.trim()) });
            }
        }

        return tableRows.length >= 2 ? [tableRows] : [];
    }

    const handleReset = () => {
        if (result?.downloadUrl) {
            URL.revokeObjectURL(result.downloadUrl);
        }
        setFiles([]);
        setResult(null);
        setError(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
    };

    const SettingsPanel = (
        <div className="flex flex-col h-full">
            <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Data Extraction</span>
                    {files.length > 0 && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 uppercase tracking-tighter">Ready</span>}
                </div>
                <p className="text-xs font-bold text-zinc-500 leading-relaxed">
                    Convert tables and structured data from your PDF into high-quality Excel spreadsheets.
                </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm mb-6">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Capabilities</h3>
                <ul className="space-y-3">
                    <li className="flex items-start gap-3 text-xs font-bold text-zinc-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                        <span>Extract tables and structured data</span>
                    </li>
                    <li className="flex items-start gap-3 text-xs font-bold text-zinc-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                        <span>Detect multiple tables per page</span>
                    </li>
                    <li className="flex items-start gap-3 text-xs font-bold text-zinc-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                        <span>Process multi-page PDFs</span>
                    </li>
                </ul>
            </div>

            {error && (
                <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm mb-6">
                    <div className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                        <div className="flex-1">
                            <h3 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2">Error</h3>
                            <p className="text-xs font-bold text-red-700">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm mb-8">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">How it works?</h3>
                <ul className="space-y-3">
                    <li className="flex items-start gap-3 text-xs font-bold text-zinc-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                        <span>Upload your PDF file with tables or structured data</span>
                    </li>
                    <li className="flex items-start gap-3 text-xs font-bold text-zinc-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                        <span>Our system extracts text and detects table structures</span>
                    </li>
                    <li className="flex items-start gap-3 text-xs font-bold text-zinc-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                        <span>Download your Excel file with organized data</span>
                    </li>
                </ul>
            </div>

            <div className="mt-auto">
                <ProcessingButton
                    onClick={handleConvert}
                    isProcessing={isProcessing}
                    disabled={files.length === 0}
                    icon={Sheet}
                    text="Convert to Excel"
                    processingText={progress ? `Processing page ${progress.page}/${progress.total}...` : "Extracting Data..."}
                    bgColor="bg-emerald-600"
                    className="shadow-emerald-200"
                />
            </div>
        </div>
    );

    return (
        <ConversionLayout
            title="PDF to Excel"
            description="Extract tables and data from PDF to Excel format"
            settingsPanel={!result ? SettingsPanel : (
                <div className="h-full flex flex-col justify-center">
                    <DownloadResult
                        fileName={result.fileName}
                        downloadUrl={result.downloadUrl}
                        onReset={handleReset}
                        stats={[
                            { label: "Format", value: "XLSX" },
                            { label: "Original", value: files[0]?.name || "" }
                        ]}
                    />
                </div>
            )}
        >
            {result ? (
                <div className="w-full h-full max-w-4xl">
                    <PreviewContent url={result.downloadUrl} fileName={result.fileName} />
                </div>
            ) : files.length > 0 && previewUrl ? (
                <div className="w-full h-full max-w-5xl flex flex-col p-4">
                    <div className="mb-6 flex justify-between items-center">
                        <div>
                            <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                <FileText size={14} className="text-zinc-300" />
                                Document Preview
                            </h2>
                            <p className="text-xs text-zinc-500 font-bold">{files[0].name} ({(files[0].size / 1024 / 1024).toFixed(2)} MB)</p>
                        </div>
                        <label className="text-xs font-black text-emerald-600 hover:text-emerald-700 cursor-pointer flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl transition-all active:scale-95">
                            <Plus size={14} />
                            <span>Replace</span>
                            <input type="file" accept=".pdf" onChange={handleFilesChange} className="hidden" />
                        </label>
                    </div>

                    <div className="flex-1 min-h-[500px] bg-white rounded-3xl overflow-hidden border border-zinc-200 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] relative group">
                        <iframe
                            src={`${previewUrl}#toolbar=0`}
                            className="w-full h-full border-none"
                            title="Pre-conversion Preview"
                        />
                        <div className="absolute top-4 right-4 bg-zinc-900/80 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-full tracking-widest uppercase border border-white/10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                            Source Document
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center max-w-sm px-6">
                    <div className="w-24 h-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner group">
                        <Sheet className="text-emerald-400 group-hover:scale-110 transition-transform duration-500" size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 mb-3 tracking-tight">PDF to Excel</h3>
                    <p className="text-zinc-500 font-medium text-sm mb-8 leading-relaxed">
                        Extract tables from PDF to Excel spreadsheets in seconds with high accuracy.
                    </p>
                    <label className="inline-flex items-center gap-3 px-8 py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 cursor-pointer transition-all shadow-xl shadow-emerald-200 active:scale-95 group">
                        <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span>Select PDF File</span>
                        <input type="file" accept=".pdf" onChange={handleFilesChange} className="hidden" />
                    </label>
                </div>
            )}
        </ConversionLayout>
    );
}

