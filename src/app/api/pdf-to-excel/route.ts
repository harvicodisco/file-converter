import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

// Polyfill DOMMatrix for Node.js environment (required by pdfjs-dist)
if (typeof globalThis.DOMMatrix === 'undefined') {
    // Simple DOMMatrix polyfill
    (globalThis as any).DOMMatrix = class DOMMatrix {
        constructor(init?: string | number[]) {
            // Minimal implementation
        }
        static fromMatrix() {
            return new DOMMatrix();
        }
    };
}

interface TableRow {
    cells: string[];
}

interface TextItem {
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

// Simple table detection from text - looks for patterns that suggest tables
function detectTablesFromText(text: string): TableRow[] {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length === 0) return [];
    
    const tables: TableRow[] = [];
    let currentTable: TableRow[] = [];
    let previousColumnCount = 0;
    
    for (const line of lines) {
        // Try to detect columns by common separators
        // Split by multiple spaces, tabs, or common delimiters
        const cells = line
            .split(/\s{2,}|\t|\|/)
            .map(cell => cell.trim())
            .filter(cell => cell.length > 0);
        
        // If this line has similar column count to previous, it might be part of a table
        if (cells.length > 1) {
            if (previousColumnCount === 0 || Math.abs(cells.length - previousColumnCount) <= 2) {
                currentTable.push({ cells });
                previousColumnCount = cells.length;
            } else {
                // Column count changed significantly, start a new table
                if (currentTable.length > 0) {
                    tables.push(...currentTable);
                }
                currentTable = [{ cells }];
                previousColumnCount = cells.length;
            }
        } else {
            // Single column or empty - end current table if it has enough rows
            if (currentTable.length >= 2) {
                tables.push(...currentTable);
            }
            currentTable = [];
            previousColumnCount = 0;
        }
    }
    
    // Add remaining table
    if (currentTable.length >= 2) {
        tables.push(...currentTable);
    }
    
    return tables;
}

// Improved table detection - groups consecutive lines with similar structure
function detectTablesImproved(text: string): TableRow[][] {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length === 0) return [];
    
    const tables: TableRow[][] = [];
    let currentTable: TableRow[] = [];
    let expectedColumns = 0;
    const minTableRows = 2;
    
    for (const line of lines) {
        // Split by multiple spaces (2+), tabs, pipes, or commas (if surrounded by spaces)
        const cells = line
            .split(/\s{2,}|\t|\|(?=\s)|\s*,\s*(?=\S)/)
            .map(cell => cell.trim().replace(/^[|,]\s*|\s*[|,]$/g, ''))
            .filter(cell => cell.length > 0);
        
        if (cells.length >= 2) {
            // Check if this line fits the current table pattern
            if (expectedColumns === 0 || Math.abs(cells.length - expectedColumns) <= 1) {
                currentTable.push({ cells });
                expectedColumns = expectedColumns === 0 ? cells.length : expectedColumns;
            } else {
                // Column count changed - save current table and start new one
                if (currentTable.length >= minTableRows) {
                    tables.push(currentTable);
                }
                currentTable = [{ cells }];
                expectedColumns = cells.length;
            }
        } else {
            // Single column or empty line - end current table
            if (currentTable.length >= minTableRows) {
                tables.push(currentTable);
            }
            currentTable = [];
            expectedColumns = 0;
        }
    }
    
    // Add final table
    if (currentTable.length >= minTableRows) {
        tables.push(currentTable);
    }
    
    return tables;
}

// Convert tables to Excel format
// Creates separate sheets per page (similar to pdfcraft-main approach)
function createExcelFromTables(tables: TableRow[][], extractedText: string): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();
    
    if (tables.length === 0) {
        // If no tables detected, create a sheet with all text
        const worksheet = workbook.addWorksheet('Extracted Text');
        worksheet.addRow(['No structured tables detected. Text content below:']);
        worksheet.addRow([]);
        
        // Split text into rows
        const textLines = extractedText.split('\n').filter(line => line.trim().length > 0);
        textLines.forEach(line => {
            worksheet.addRow([line.trim()]);
        });
        
        return workbook;
    }
    
    // Create separate worksheet for each page (table)
    for (let pageIdx = 0; pageIdx < tables.length; pageIdx++) {
        const table = tables[pageIdx];
        
        if (table.length === 0) continue;
        
        // Create sheet name (Excel sheet names are limited to 31 characters)
        const sheetName = `Page ${pageIdx + 1}`.substring(0, 31);
        const worksheet = workbook.addWorksheet(sheetName);
        
        // Find max columns in this table
        const maxCols = Math.max(...table.map(row => row.cells.length), 1);
        
        // Create Excel rows
        for (const tableRow of table) {
            const excelRow: (string | number)[] = [];
            
            // Fill cells up to max columns
            for (let col = 0; col < maxCols; col++) {
                excelRow.push(tableRow.cells[col] || '');
            }
            
            worksheet.addRow(excelRow);
        }
        
        // Set column widths (auto-size based on content, with min/max limits)
        worksheet.columns.forEach((column, index) => {
            if (!column) return;
            
            let maxLength = 10; // Minimum width
            
            // Iterate through cells in this column
            for (let rowNum = 1; rowNum <= worksheet.rowCount; rowNum++) {
                const cell = worksheet.getCell(rowNum, index + 1);
                if (cell && cell.value) {
                    const cellValue = cell.value.toString();
                    // Account for multi-line cells
                    const lines = cellValue.split('\n');
                    const maxLineLength = Math.max(...lines.map(line => line.length));
                    maxLength = Math.max(maxLength, maxLineLength);
                }
            }
            
            // Set width with reasonable limits (min 10, max 50)
            column.width = Math.min(Math.max(maxLength + 2, 10), 50);
        });
        
        // Style header row if it exists (first row)
        if (table.length > 0) {
            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };
        }
    }
    
    return workbook;
}

// Extract text with positions from PDF using pdfjs-dist legacy build
async function parsePDF(buffer: Buffer): Promise<{ text: string; textItems: TextItem[][] }> {
    try {
        // Use pdfjs-dist legacy build for Node.js environments
        // @ts-ignore - pdfjs-dist legacy build types
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        
        // For Node.js server environment, use local worker file from node_modules
        const path = await import('path');
        const workerPath = path.default.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs');
        (pdfjsLib as any).GlobalWorkerOptions.workerSrc = `file://${workerPath}`;
        
        // Convert Buffer to Uint8Array as required by pdfjs-dist
        const uint8Array = new Uint8Array(buffer);
        
        // Load PDF document
        // @ts-ignore - Type definitions don't match runtime behavior
        const loadingTask = (pdfjsLib as any).getDocument({
            data: uint8Array,
            useSystemFonts: true,
            verbosity: 0,
        });

        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;
        
        let allText = '';
        const allTextItems: TextItem[][] = [];
        
        // Extract text with positions from all pages
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            // @ts-ignore - pdfjs-dist types have issues
            const page = await pdf.getPage(pageNum);
            // @ts-ignore - pdfjs-dist types have issues
            const viewport = page.getViewport({ scale: 1.0 });
            // @ts-ignore - pdfjs-dist types have issues
            const textContent = await page.getTextContent({ disableCombineTextItems: true });
            
            const pageTextItems: TextItem[] = [];
            let pageText = '';
            
            // Extract text items with positions
            for (const item of textContent.items as any[]) {
                if (item.str && item.transform && item.transform.length >= 6) {
                    // Transform matrix: [a, b, c, d, e, f]
                    // e = x translation, f = y translation
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
                    
                    pageText += item.str + ' ';
                }
            }
            
            allTextItems.push(pageTextItems);
            allText += pageText.trim() + '\n';
        }
        
        return { text: allText.trim(), textItems: allTextItems };
    } catch (error: any) {
        console.error("PDF parsing error:", error);
        throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
}

// Improved table detection with better column/row alignment
// Based on pdfcraft-main's approach with dynamic tolerance calculation
function detectTablesFromPositions(textItems: TextItem[][]): TableRow[][] {
    const allTables: TableRow[][] = [];
    
    for (const pageItems of textItems) {
        if (pageItems.length === 0) continue;
        
        // ============================================
        // STEP 1: Dynamic Row Tolerance Calculation
        // ============================================
        const heights = pageItems.map(item => Math.abs(item.height)).filter(h => h > 0);
        const avgHeight = heights.length > 0 
            ? heights.reduce((sum, h) => sum + h, 0) / heights.length 
            : 10;
        const rowTolerance = avgHeight * 0.8; // Dynamic tolerance based on text height
        
        // Calculate average character width for column tolerance
        const widths = pageItems.map(item => Math.abs(item.width)).filter(w => w > 0);
        const avgCharWidth = widths.length > 0
            ? widths.reduce((sum, w) => sum + w, 0) / widths.length
            : 10;
        const columnTolerance = avgCharWidth * 2; // Dynamic tolerance based on character width
        
        // Sort all text by Y ascending (top to bottom)
        // After Y flip: Y=0 is at top, higher Y is lower on page
        const sortedByY = [...pageItems].sort((a, b) => a.y - b.y);
        
        // Group items into rows
        const rows: TextItem[][] = [];
        
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
        const mergedRows: TextItem[][] = [];
        
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
        // STEP 3: Sort Rows Top to Bottom
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
            const sortedRow = [...row].sort((a, b) => a.x - b.x);
            
            // PyMuPDF-style: Assign each item directly to column based on its X position
            // This is more accurate than grouping first
            for (const item of sortedRow) {
                const itemText = item.text.trim();
                if (!itemText) continue;
                
                // Find which column this item belongs to based on its X position
                let assignedCol = 0;
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
                if (minDistance < columnTolerance * 2) {
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

// Note: OCR approach with canvas removed due to Next.js/Turbopack compatibility issues
// Using enhanced text extraction with improved position-based table detection instead

export async function POST(req: NextRequest) {
    try {
        // Check if request contains table data (from client-side OCR) or file
        const contentType = req.headers.get("content-type");
        
        if (contentType?.includes("application/json")) {
            // Client-side OCR processing - receive table data
            const body = await req.json();
            const { tables, fileName } = body;

            if (!tables || !Array.isArray(tables) || tables.length === 0) {
                return NextResponse.json({ 
                    error: "No table data received" 
                }, { status: 400 });
            }

            // Create Excel from received table data
            const workbook = createExcelFromTables(tables, '');
            
            // Generate Excel buffer
            const excelBuffer = await workbook.xlsx.writeBuffer();
            
            // Convert to base64 for JSON response
            const base64 = Buffer.from(excelBuffer as ArrayBuffer).toString("base64");
            const downloadUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;

            return NextResponse.json({
                fileName: (fileName || "converted").replace(".pdf", ".xlsx"),
                downloadUrl: downloadUrl,
            });
        } else {
            // Server-side processing (fallback)
            const formData = await req.formData();
            const file = formData.get("file") as File;

            if (!file) {
                return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
            }

            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            try {
                // Extract text and positions from PDF
                const pdfData = await parsePDF(buffer);
                const extractedText = pdfData.text;
                
                if (!extractedText || extractedText.trim().length === 0) {
                    return NextResponse.json({ 
                        error: "PDF contains no extractable text. It may be a scanned image PDF." 
                    }, { status: 400 });
                }
                
                // Use position-based table detection (most accurate)
                let tables = detectTablesFromPositions(pdfData.textItems);
                
                // Fallback to text-based detection if position-based didn't find tables
                if (tables.length === 0) {
                    tables = detectTablesImproved(extractedText);
                }

                // Create Excel workbook
                const workbook = createExcelFromTables(tables, extractedText);
                
                // Generate Excel buffer
                const excelBuffer = await workbook.xlsx.writeBuffer();
                
                // Convert to base64 for JSON response
                const base64 = Buffer.from(excelBuffer as ArrayBuffer).toString("base64");
                const downloadUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;

                return NextResponse.json({
                    fileName: file.name.replace(".pdf", ".xlsx"),
                    downloadUrl: downloadUrl,
                });
            } catch (pdfError: any) {
                console.error("PDF processing error:", pdfError);
                
                // Return proper error response
                return NextResponse.json({ 
                    error: "Failed to process PDF. The file may be corrupted, encrypted, or contain only images.",
                    details: pdfError.message || "Unknown error occurred"
                }, { status: 400 });
            }
        }
    } catch (error: any) {
        console.error("Conversion error:", error);
        return NextResponse.json({ 
            error: "Failed to convert PDF to Excel",
            details: error.message 
        }, { status: 500 });
    }
}

