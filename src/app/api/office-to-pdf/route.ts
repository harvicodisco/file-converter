import { NextRequest, NextResponse } from "next/server";
import { promisify } from 'util';
import libre from 'libreoffice-convert';

const convertAsync = promisify(libre.convert);

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        try {
            console.log(`API: Attempting LibreOffice Office to PDF Conversion for ${file.name}...`);
            const pdfBuffer = await convertAsync(buffer, '.pdf', undefined);
            console.log("API: LibreOffice Office to PDF Conversion SUCCESS.");

            return new Response(pdfBuffer as any, {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="${file.name.replace(/\.(doc|docx|xls|xlsx|ppt|pptx)$/, ".pdf")}"`,
                },
            });
        } catch (libreError: any) {
            console.warn("API: LibreOffice Engine failed for Office to PDF. Falling back to Basic Engine...");
            return await runBasicOfficeToPdf(buffer, file.name);
        }

    } catch (error) {
        console.error("Conversion error:", error);
        return NextResponse.json({
            error: "Failed to convert file",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

async function runBasicOfficeToPdf(buffer: Buffer, fileName: string) {
    let extractedText = "";
    try {
        const WordExtractorModule = await import('word-extractor');
        const WordExtractor = WordExtractorModule.default || WordExtractorModule;
        const extractor = new WordExtractor();
        const doc = await extractor.extract(buffer);
        extractedText = doc.getBody();
    } catch (err) {
        extractedText = "Visual conversion fallback active. Partial text extraction only.";
    }

    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const page = pdfDoc.addPage([600, 800]);

    page.drawText(extractedText || "Document Content (Simplified Fallback)", {
        x: 50,
        y: 750,
        size: 11,
        font,
        color: rgb(0.1, 0.1, 0.1),
    });

    const pdfBytes = await pdfDoc.save();
    return new Response(pdfBytes as any, {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${fileName.replace(/\.(doc|docx|xls|xlsx|ppt|pptx)$/, ".pdf")}"`,
        },
    });
}
