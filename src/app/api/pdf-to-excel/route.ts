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
    
    // Create worksheet for tables
    const worksheet = workbook.addWorksheet('PDF Tables');
    
    let currentRow = 1;
    
    for (let tableIdx = 0; tableIdx < tables.length; tableIdx++) {
        const table = tables[tableIdx];
        
        if (table.length === 0) continue;
        
        // Add separator between tables
        if (tableIdx > 0) {
            worksheet.addRow([]);
            worksheet.addRow([`--- Table ${tableIdx + 1} ---`]);
            worksheet.addRow([]);
            currentRow += 3;
        }
        
        // Find max columns in this table
        const maxCols = Math.max(...table.map(row => row.cells.length));
        
        // Create Excel rows
        for (const tableRow of table) {
            const excelRow: (string | number)[] = [];
            
            // Fill cells up to max columns
            for (let col = 0; col < maxCols; col++) {
                excelRow.push(tableRow.cells[col] || '');
            }
            
            worksheet.addRow(excelRow);
            currentRow++;
        }
    }
    
    // Set column widths
    worksheet.columns.forEach((column, index) => {
        column.width = 20;
    });
    
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
function detectTablesFromPositions(textItems: TextItem[][]): TableRow[][] {
    const allTables: TableRow[][] = [];
    
    for (const pageItems of textItems) {
        if (pageItems.length === 0) continue;
        
        // Step 1: Group items into rows first (more accurate row detection)
        const rowTolerance = 8; // Smaller tolerance for better row separation
        const rows: TextItem[][] = [];
        const sortedByY = [...pageItems].sort((a, b) => b.y - a.y);
        
        for (const item of sortedByY) {
            let foundRow = false;
            for (const row of rows) {
                // Check if item is on the same row (similar Y position)
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
        
        // Sort rows by Y position (top to bottom)
        rows.sort((a, b) => {
            const aY = a.reduce((sum, i) => sum + i.y, 0) / a.length;
            const bY = b.reduce((sum, i) => sum + i.y, 0) / b.length;
            return bY - aY;
        });
        
        // Step 2: Detect columns by analyzing cell positions in rows
        // Use a more sophisticated approach: find consistent column positions across rows
        const columnTolerance = 50; // Increased tolerance for column detection
        const cellGapThreshold = 20; // Gap between cells
        
        // First, group items into cells within each row
        const rowsWithCells: TextItem[][][] = [];
        
        for (const row of rows) {
            row.sort((a, b) => a.x - b.x);
            const cells: TextItem[][] = [];
            let currentCell: TextItem[] = [];
            let lastEndX = -Infinity;
            
            for (const item of row) {
                const gap = item.x - lastEndX;
                if (gap > cellGapThreshold && currentCell.length > 0) {
                    cells.push(currentCell);
                    currentCell = [item];
                    lastEndX = item.x + item.width;
                } else {
                    currentCell.push(item);
                    lastEndX = Math.max(lastEndX, item.x + item.width);
                }
            }
            if (currentCell.length > 0) {
                cells.push(currentCell);
            }
            rowsWithCells.push(cells);
        }
        
        // Now detect column positions by analyzing cell X positions across all rows
        const allCellXPositions: number[] = [];
        for (const rowCells of rowsWithCells) {
            for (const cell of rowCells) {
                const cellX = cell[0].x;
                allCellXPositions.push(cellX);
            }
        }
        
        if (allCellXPositions.length === 0) continue;
        
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
        
        // Get column centers (medians of clusters)
        const columnCenters = clusters
            .map(cluster => {
                const sorted = cluster.sort((a, b) => a - b);
                return sorted[Math.floor(sorted.length / 2)];
            })
            .sort((a, b) => a - b);
        
        if (columnCenters.length < 2) continue;
        
        // Step 3: Map cells to columns for each row
        const processedRows: TableRow[] = [];
        const numColumns = columnCenters.length;
        
        for (const rowCells of rowsWithCells) {
            const rowData: string[] = new Array(numColumns).fill('');
            
            // Map each cell to its column
            for (const cell of rowCells) {
                const cellText = cell
                    .map(i => i.text.trim())
                    .filter(t => t)
                    .join(' ');
                
                if (!cellText) continue;
                
                const cellX = cell[0].x;
                
                // Find closest column center
                let bestCol = 0;
                let minDistance = Infinity;
                
                for (let i = 0; i < columnCenters.length; i++) {
                    const distance = Math.abs(cellX - columnCenters[i]);
                    if (distance < minDistance) {
                        minDistance = distance;
                        bestCol = i;
                    }
                }
                
                // Assign to column (always assign to closest, even if slightly off)
                if (bestCol < rowData.length) {
                    if (rowData[bestCol]) {
                        // Multi-line content - use newline for better formatting
                        rowData[bestCol] += '\n' + cellText;
                    } else {
                        rowData[bestCol] = cellText;
                    }
                }
            }
            
            // Only add row if it has at least one non-empty cell
            if (rowData.some(cell => cell.trim().length > 0)) {
                processedRows.push({ cells: rowData.map(c => c.trim()) });
            }
        }
        
        // Step 4: Ensure consistent column count
        if (processedRows.length >= 2) {
            // Find max columns
            const maxCols = Math.max(...processedRows.map(row => row.cells.length), numColumns);
            
            // Normalize all rows to have same column count
            const normalizedRows: TableRow[] = processedRows.map(row => {
                const cells = [...row.cells];
                while (cells.length < maxCols) {
                    cells.push('');
                }
                return { cells: cells.slice(0, maxCols) };
            });
            
            // Filter rows with at least 2 columns
            const validRows = normalizedRows.filter(row => 
                row.cells.filter(c => c.trim().length > 0).length >= 2
            );
            
            if (validRows.length >= 2) {
                allTables.push(validRows);
            }
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
