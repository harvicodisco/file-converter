import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb } from "pdf-lib";

interface RedactionArea {
    id: string;
    x: number; // percentage
    y: number; // percentage
    width: number; // percentage
    height: number; // percentage
    pageIndex: number;
}

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
              r: parseInt(result[1], 16) / 255,
              g: parseInt(result[2], 16) / 255,
              b: parseInt(result[3], 16) / 255,
          }
        : { r: 0, g: 0, b: 0 };
};

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const redactionsStr = formData.get("redactions") as string;
        const redactionColor = (formData.get("redactionColor") as string) || "#000000";

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const redactions: RedactionArea[] = redactionsStr ? JSON.parse(redactionsStr) : [];

        if (!redactions || redactions.length === 0) {
            return NextResponse.json({ error: "No redaction areas specified" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);

        const color = hexToRgb(redactionColor);

        // Group redactions by page
        const redactionsByPage: { [pageIndex: number]: RedactionArea[] } = {};
        redactions.forEach((redaction) => {
            if (!redactionsByPage[redaction.pageIndex]) {
                redactionsByPage[redaction.pageIndex] = [];
            }
            redactionsByPage[redaction.pageIndex].push(redaction);
        });

        // Apply redactions to each page
        const pageIndices = pdfDoc.getPageIndices();
        for (const pageIndex of pageIndices) {
            const page = pdfDoc.getPage(pageIndex);
            const { width, height } = page.getSize();

            const pageRedactions = redactionsByPage[pageIndex] || [];

            for (const redaction of pageRedactions) {
                // Convert percentage to actual coordinates
                const x = (redaction.x / 100) * width;
                const y = height - ((redaction.y + redaction.height) / 100) * height; // Flip Y coordinate (PDF uses bottom-left origin)
                const redactionWidth = (redaction.width / 100) * width;
                const redactionHeight = (redaction.height / 100) * height;

                // Draw black rectangle to cover the content
                page.drawRectangle({
                    x: Math.max(0, Math.min(x, width)),
                    y: Math.max(0, Math.min(y, height)),
                    width: Math.min(redactionWidth, width - x),
                    height: Math.min(redactionHeight, height - y),
                    color: rgb(color.r, color.g, color.b),
                    opacity: 1.0,
                });
            }
        }

        const pdfBytes = await pdfDoc.save({
            useObjectStreams: false,
            addDefaultPage: false,
        });

        return new NextResponse(Buffer.from(pdfBytes), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="redacted_${file.name}"`,
            },
        });
    } catch (error) {
        console.error("Redact PDF error:", error);
        return NextResponse.json({ 
            error: "Failed to redact PDF",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

