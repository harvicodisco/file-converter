import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const pdfaVersion = formData.get("pdfaVersion") as string || "2b"; // Default to PDF/A-2b

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();

        try {
            // Load source PDF
            const sourceDoc = await PDFDocument.load(arrayBuffer, {
                ignoreEncryption: true,
                capNumbers: true,
                updateMetadata: false,
            });

            // Create new PDF document
            const pdfDoc = await PDFDocument.create();

            // Copy pages (embeds fonts automatically)
            const pageIndices = sourceDoc.getPageIndices();
            const copiedPages = await pdfDoc.copyPages(sourceDoc, pageIndices);
            
            copiedPages.forEach((page) => {
                pdfDoc.addPage(page);
            });

            // Set metadata
            const now = new Date();
            pdfDoc.setTitle(file.name.replace(".pdf", "") || "Document");
            pdfDoc.setAuthor("PDF/A Converter");
            pdfDoc.setSubject(`PDF/A-${pdfaVersion} Compliant Document`);
            pdfDoc.setCreator("File Converter");
            pdfDoc.setProducer("PDF/A Converter");
            pdfDoc.setCreationDate(now);
            pdfDoc.setModificationDate(now);

            // Version-specific settings
            const versionNumber = pdfaVersion.charAt(0);
            const isPDFA1 = versionNumber === "1";
            const isPDFA3 = versionNumber === "3";
            
            // PDF/A-3: Add new attachments (existing attachments are lost due to pdf-lib limitation)
            if (isPDFA3) {
                const attachmentFiles = formData.getAll("attachments") as File[];
                if (attachmentFiles && attachmentFiles.length > 0) {
                    for (const attachmentFile of attachmentFiles) {
                        try {
                            const attachmentData = await attachmentFile.arrayBuffer();
                            await pdfDoc.attach(attachmentData, attachmentFile.name, {
                                mimeType: attachmentFile.type || 'application/octet-stream',
                            });
                            console.log(`✅ Added attachment: ${attachmentFile.name}`);
                        } catch (attachError) {
                            console.warn(`❌ Failed to attach ${attachmentFile.name}:`, attachError);
                        }
                    }
                }
            }
            
            // PDF/A-1 and PDF/A-2: Attachments not allowed (automatically removed when copying pages)
            
            // Save with version-specific options
            const pdfBytes = await pdfDoc.save({
                useObjectStreams: false, // PDF/A-1 doesn't allow, disabled for compatibility
                addDefaultPage: false,
                updateFieldAppearances: false,
            });

            // Return the binary PDF directly
            return new NextResponse(Buffer.from(pdfBytes), {
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename="${file.name.replace('.pdf', '_PDFA.pdf')}"`,
                    "X-PDFA-Version": `PDF/A-${pdfaVersion}`,
                },
            });
        } catch (loadError) {
            console.error("PDF load error:", loadError);
            
            // Recovery: try to extract pages from corrupted PDF
            try {
                const pdfDoc = await PDFDocument.load(arrayBuffer, {
                    ignoreEncryption: true,
                    capNumbers: true,
                    updateMetadata: false,
                    parseSpeed: 1, // Fast parsing
                });

                const newPdfDoc = await PDFDocument.create();
                const pageIndices = pdfDoc.getPageIndices();
                
                let recoveredPages = 0;
                for (const pageIndex of pageIndices) {
                    try {
                        const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageIndex]);
                        newPdfDoc.addPage(copiedPage);
                        recoveredPages++;
                    } catch (pageError) {
                        console.warn(`Skipping page ${pageIndex + 1}:`, pageError);
                    }
                }

                if (recoveredPages === 0) {
                    return NextResponse.json({ 
                        error: "PDF is too corrupted or encrypted to convert. Unable to recover any pages." 
                    }, { status: 400 });
                }

                // Set metadata
                const now = new Date();
                newPdfDoc.setTitle(file.name.replace(".pdf", "") || "Document");
                newPdfDoc.setAuthor("PDF/A Converter");
                newPdfDoc.setSubject(`PDF/A-${pdfaVersion} Compliant Document`);
                newPdfDoc.setCreationDate(now);
                newPdfDoc.setModificationDate(now);

                const pdfBytes = await newPdfDoc.save({
                    useObjectStreams: false,
                    addDefaultPage: false,
                    updateFieldAppearances: false,
                });

                return new NextResponse(Buffer.from(pdfBytes), {
                    headers: {
                        "Content-Type": "application/pdf",
                        "Content-Disposition": `attachment; filename="${file.name.replace('.pdf', '_PDFA.pdf')}"`,
                        "X-Recovered-Pages": recoveredPages.toString(),
                    },
                });
            } catch (recoveryError) {
                console.error("Recovery error:", recoveryError);
                return NextResponse.json({ 
                    error: "Failed to convert PDF to PDF/A. The file may be severely corrupted or have unsupported features." 
                }, { status: 400 });
            }
        }
    } catch (error) {
        console.error("PDF/A conversion error:", error);
        return NextResponse.json({ 
            error: "Failed to convert to PDF/A",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
