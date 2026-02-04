import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const files = formData.getAll("files") as File[];

        if (!files || files.length < 2) {
            return NextResponse.json({ error: "At least 2 files are required" }, { status: 400 });
        }

        const mergedPdf = await PDFDocument.create();

        for (const file of files) {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await PDFDocument.load(arrayBuffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        const pdfBytes = await mergedPdf.save();
        const base64 = Buffer.from(pdfBytes).toString("base64");
        const downloadUrl = `data:application/pdf;base64,${base64}`;

        return NextResponse.json({
            fileName: "merged_document.pdf",
            downloadUrl: downloadUrl,
        });
    } catch (error) {
        console.error("Merge error:", error);
        return NextResponse.json({ error: "Failed to merge PDFs" }, { status: 500 });
    }
}
