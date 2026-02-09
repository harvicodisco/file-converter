import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();

        try {
            // Attempt to load the PDF - this will fail if corrupted
            const pdfDoc = await PDFDocument.load(arrayBuffer, {
                ignoreEncryption: true, // Try to ignore encryption issues
                capNumbers: true, // Cap numbers to prevent overflow
                updateMetadata: false, // Don't update metadata during load
            });

            // If PDF loads successfully, rebuild it to fix structure issues
            const newPdfDoc = await PDFDocument.create();

            // Copy all pages to new document (this rebuilds the structure)
            const pageIndices = pdfDoc.getPageIndices();
            const copiedPages = await newPdfDoc.copyPages(pdfDoc, pageIndices);
            
            copiedPages.forEach((page) => {
                newPdfDoc.addPage(page);
            });

            // Copy form fields if any
            try {
                const form = pdfDoc.getForm();
                const newForm = newPdfDoc.getForm();
            } catch (e) {
                // Ignore form errors
            }

            // Save the repaired PDF
            const pdfBytes = await newPdfDoc.save({
                useObjectStreams: false, // Disable object streams for better compatibility
                addDefaultPage: false,
                updateFieldAppearances: false,
            });

            return new NextResponse(Buffer.from(pdfBytes), {
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename="repaired_${file.name}"`,
                },
            });
        } catch (loadError) {
            // If PDF is too corrupted to load, try to extract what we can
            console.error("PDF load error:", loadError);
            
            // Attempt recovery by creating a new PDF and trying to extract pages one by one
            const newPdfDoc = await PDFDocument.create();
            let recoveredPages = 0;

            try {
                // Try loading with more lenient options
                const pdfDoc = await PDFDocument.load(arrayBuffer, {
                    ignoreEncryption: true,
                    capNumbers: true,
                    updateMetadata: false,
                    parseSpeed: 1, // Fast parsing, skip some validation
                });

                const pageIndices = pdfDoc.getPageIndices();
                
                for (const pageIndex of pageIndices) {
                    try {
                        const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageIndex]);
                        newPdfDoc.addPage(copiedPage);
                        recoveredPages++;
                    } catch (pageError) {
                        // Skip corrupted pages
                        console.warn(`Skipping corrupted page ${pageIndex + 1}:`, pageError);
                    }
                }

                if (recoveredPages === 0) {
                    return NextResponse.json({ 
                        error: "PDF is too corrupted to repair. Unable to recover any pages." 
                    }, { status: 400 });
                }

                const pdfBytes = await newPdfDoc.save({
                    useObjectStreams: false,
                    addDefaultPage: false,
                });

                return new NextResponse(Buffer.from(pdfBytes), {
                    headers: {
                        "Content-Type": "application/pdf",
                        "Content-Disposition": `attachment; filename="repaired_${file.name}"`,
                        "X-Recovered-Pages": recoveredPages.toString(),
                    },
                });
            } catch (recoveryError) {
                console.error("Recovery error:", recoveryError);
                return NextResponse.json({ 
                    error: "PDF is severely corrupted and cannot be repaired. The file structure is too damaged." 
                }, { status: 400 });
            }
        }
    } catch (error) {
        console.error("Repair PDF error:", error);
        return NextResponse.json({ 
            error: "Failed to repair PDF",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

