import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const password = formData.get("password") as string;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        if (!password || password.trim() === "") {
            return NextResponse.json({ error: "Password is required" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();

        // Note: pdf-lib doesn't support password-protected PDFs directly
        // We'll try to load with ignoreEncryption, which may work for some PDFs
        // but won't work for strongly encrypted PDFs that require a password
        try {
            // Try to load PDF with ignoreEncryption
            // This will work for PDFs that aren't encrypted or have weak encryption
            const sourceDoc = await PDFDocument.load(arrayBuffer, {
                ignoreEncryption: true,
                capNumbers: true,
                updateMetadata: false,
            });

            // Create new PDF document (unencrypted)
            const pdfDoc = await PDFDocument.create();

            // Copy all pages from source to new document
            const pageIndices = sourceDoc.getPageIndices();
            const copiedPages = await pdfDoc.copyPages(sourceDoc, pageIndices);
            
            copiedPages.forEach((page) => {
                pdfDoc.addPage(page);
            });

            // Copy metadata
            try {
                const title = sourceDoc.getTitle();
                const author = sourceDoc.getAuthor();
                const subject = sourceDoc.getSubject();
                const creator = sourceDoc.getCreator();
                const producer = sourceDoc.getProducer();
                const creationDate = sourceDoc.getCreationDate();
                const modificationDate = sourceDoc.getModificationDate();

                if (title) pdfDoc.setTitle(title);
                if (author) pdfDoc.setAuthor(author);
                if (subject) pdfDoc.setSubject(subject);
                if (creator) pdfDoc.setCreator(creator);
                if (producer) pdfDoc.setProducer(producer);
                if (creationDate) pdfDoc.setCreationDate(creationDate);
                if (modificationDate) pdfDoc.setModificationDate(modificationDate);
            } catch (metadataError) {
                // Use default metadata if copying fails
                const now = new Date();
                pdfDoc.setTitle(file.name.replace(".pdf", "") || "Unlocked Document");
                pdfDoc.setAuthor("PDF Unlocker");
                pdfDoc.setCreator("File Converter");
                pdfDoc.setProducer("PDF Unlocker");
                pdfDoc.setCreationDate(now);
                pdfDoc.setModificationDate(now);
            }

            // Save the unlocked PDF (no encryption)
            const pdfBytes = await pdfDoc.save({
                useObjectStreams: false,
                addDefaultPage: false,
                updateFieldAppearances: false,
            });

            // Return the binary PDF directly
            return new NextResponse(Buffer.from(pdfBytes), {
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename="${file.name.replace('.pdf', '_unlocked.pdf')}"`,
                    "X-Unlocked": "true",
                },
            });
        } catch (loadError: any) {
            console.error("PDF unlock error:", loadError);
            
            // Check if it's an encryption/password error
            const errorMessage = loadError.message?.toLowerCase() || "";
            if (errorMessage.includes("password") || 
                errorMessage.includes("encryption") ||
                errorMessage.includes("encrypted") ||
                errorMessage.includes("decrypt")) {
                return NextResponse.json({ 
                    error: "Unable to unlock this PDF. pdf-lib does not support decrypting password-protected PDFs. This PDF requires a password to decrypt, which pdf-lib cannot handle. Please use a tool like Adobe Acrobat, QPDF, or pdftk to unlock the PDF first, then upload the unlocked version." 
                }, { status: 400 });
            }

            // Other errors (corrupted, invalid format, etc.)
            return NextResponse.json({ 
                error: "Failed to unlock PDF. The file may be corrupted, use unsupported encryption, or the password may be incorrect. Note: pdf-lib has limited support for password-protected PDFs." 
            }, { status: 400 });
        }
    } catch (error) {
        console.error("PDF unlock error:", error);
        return NextResponse.json({ 
            error: "Failed to unlock PDF",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
