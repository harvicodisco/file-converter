import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let extractedText = "";
        const fileExt = file.name.split('.').pop()?.toLowerCase();

        let extractor;
        try {
            const WordExtractorModule = await import('word-extractor');
            // Support both ESM and CJS import styles
            const WordExtractor = WordExtractorModule.default || WordExtractorModule;
            extractor = new WordExtractor();
        } catch (importErr) {
            console.error("Library load error:", importErr);
            throw new Error(`Failed to load conversion engine: ${importErr instanceof Error ? importErr.message : 'Unknown'}`);
        }

        try {
            const doc = await extractor.extract(buffer);
            extractedText = doc.getBody();
            if (!extractedText || extractedText.trim().length === 0) {
                extractedText = "This document appears to be empty or its text could not be extracted.";
            }
        } catch (extractErr) {
            console.error("Extraction error:", extractErr);
            extractedText = `Visual conversion for .${fileExt} files is partially supported.\n\nSince this is an older .doc or other Office format, we can't extract plain text as easily.\n\nFor professional results with all charts, images, and formatting preserved, please ensure you use .docx format or use our recommended professional conversion tools.`;
        }

        const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

        const wrapText = (text: string, maxWidth: number, font: any, fontSize: number) => {
            const words = text.split(' ');
            const lines = [];
            let currentLine = '';

            for (const word of words) {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                const width = font.widthOfTextAtSize(testLine, fontSize);
                if (width <= maxWidth) {
                    currentLine = testLine;
                } else {
                    lines.push(currentLine);
                    currentLine = word;
                }
            }
            if (currentLine) lines.push(currentLine);
            return lines;
        };

        const paragraphs = extractedText.split('\n');
        let page = pdfDoc.addPage([600, 800]);
        let y = 740;
        const margin = 50;
        const maxWidth = 500;

        // Clean text - PDF-lib StandardFonts only support WinAnsi encoding
        // Ox0009 is a tab, we replace it with 4 spaces.
        // We also remove other common non-supported characters.
        const sanitizeText = (text: string) => {
            return text
                .replace(/\t/g, '    ') // Replace tabs with spaces
                .replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, "") // Remove control characters
                .replace(/[^\x00-\x7F]/g, "?"); // Fallback for other non-ASCII characters
        };

        // Draw header
        page.drawText('Universal Converter - Office to PDF', {
            x: margin,
            y: 770,
            size: 10,
            font,
            color: rgb(0.6, 0.6, 0.6),
        });

        for (const para of paragraphs) {
            const sanitizedPara = sanitizeText(para.trim());
            if (!sanitizedPara) continue;

            const wrappedLines = wrapText(sanitizedPara, maxWidth, font, 11);

            for (const line of wrappedLines) {
                if (y < 50) {
                    page = pdfDoc.addPage([600, 800]);
                    y = 750;
                }

                try {
                    page.drawText(line, {
                        x: margin,
                        y: y,
                        size: 11,
                        font,
                        color: rgb(0.1, 0.1, 0.1),
                    });
                } catch (e) {
                    console.error("Failed to draw line:", line, e);
                    // Skip lines that still cause encoding issues to prevent crash
                }
                y -= 16;
            }

            // Extra space between paragraphs
            y -= 8;
        }

        const pdfBytes = await pdfDoc.save();
        const base64 = Buffer.from(pdfBytes).toString("base64");
        const downloadUrl = `data:application/pdf;base64,${base64}`;

        return NextResponse.json({
            fileName: file.name.replace(/\.(doc|docx|xls|xlsx|ppt|pptx)$/, ".pdf"),
            downloadUrl: downloadUrl,
        });
    } catch (error) {
        console.error("Conversion error:", error);
        return NextResponse.json({
            error: "Failed to convert to PDF",
            message: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}
