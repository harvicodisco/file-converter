import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const splitMode = formData.get("splitMode") as "pages" | "range";

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pageCount = pdfDoc.getPageCount();

        let pagesToExtract: number[] = [];

        if (splitMode === "pages") {
            const pageNumbersStr = formData.get("pageNumbers") as string;
            // Parse strings like "1, 3, 5-7"
            const parts = pageNumbersStr.split(",").map(p => p.trim());
            for (const part of parts) {
                if (part.includes("-")) {
                    const [start, end] = part.split("-").map(Number);
                    for (let i = start; i <= end; i++) {
                        if (i >= 1 && i <= pageCount) pagesToExtract.push(i - 1);
                    }
                } else {
                    const num = Number(part);
                    if (num >= 1 && num <= pageCount) pagesToExtract.push(num - 1);
                }
            }
        } else {
            const from = Number(formData.get("pageFrom"));
            const to = Number(formData.get("pageTo"));
            for (let i = from; i <= to; i++) {
                if (i >= 1 && i <= pageCount) pagesToExtract.push(i - 1);
            }
        }

        // Filter duplicates and sort
        pagesToExtract = [...new Set(pagesToExtract)].sort((a, b) => a - b);

        if (pagesToExtract.length === 0) {
            return NextResponse.json({ error: "No valid pages selected" }, { status: 400 });
        }

        // Create a new PDF for the extracted pages
        const newPdfDoc = await PDFDocument.create();
        const copiedPages = await newPdfDoc.copyPages(pdfDoc, pagesToExtract);
        copiedPages.forEach((page) => newPdfDoc.addPage(page));

        const pdfBytes = await newPdfDoc.save();

        // In a real app, you'd save this to S3/Disk. 
        // For this demo, we'll return a Base64 data URL to keep it simple and functional.
        const base64 = Buffer.from(pdfBytes).toString("base64");
        const downloadUrl = `data:application/pdf;base64,${base64}`;

        return NextResponse.json({
            files: [
                {
                    fileName: `split_${file.name}`,
                    downloadUrl: downloadUrl,
                }
            ]
        });
    } catch (error) {
        console.error("Split error:", error);
        return NextResponse.json({ error: "Failed to split PDF" }, { status: 500 });
    }
}
