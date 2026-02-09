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
        const sourceDoc = await PDFDocument.load(arrayBuffer);

        // Create a new document and copy pages. 
        // This is a common way to "clean" a PDF and remove unused objects/metadata with pdf-lib.
        const pdfDoc = await PDFDocument.create();
        const pages = await pdfDoc.copyPages(sourceDoc, sourceDoc.getPageIndices());
        pages.forEach((page) => pdfDoc.addPage(page));

        // pdf-lib's save method with UseObjectStreams and other flags
        // useObjectStreams: Packs objects into streams, which is more efficient
        // updateFieldAppearances: false to avoid generating unnecessary appearance streams
        const pdfBytes = await pdfDoc.save({
            useObjectStreams: true,
            addDefaultPage: false,
            updateFieldAppearances: false,
        });

        // Return the binary blob directly
        return new NextResponse(Buffer.from(pdfBytes), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="compressed_${file.name}"`,
                "X-Original-Size": file.size.toString(),
            },
        });
    } catch (error) {
        console.error("Compression error:", error);
        return NextResponse.json({ error: "Failed to compress PDF" }, { status: 500 });
    }
}
