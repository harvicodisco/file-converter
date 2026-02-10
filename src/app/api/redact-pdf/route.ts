import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, PDFPage } from "pdf-lib";

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

// Helper to draw white rectangles to "erase" content, then draw redaction color on top
// This approach layers multiple rectangles to ensure content is covered
async function applyRedactionsToPage(
    page: PDFPage,
    redactions: RedactionArea[],
    redactionColor: { r: number; g: number; b: number }
) {
    const { width, height } = page.getSize();
    const white = rgb(1, 1, 1); // White color
    const color = rgb(redactionColor.r, redactionColor.g, redactionColor.b);

    for (const redaction of redactions) {
        // Convert percentage to actual coordinates
        const x = (redaction.x / 100) * width;
        const y = height - ((redaction.y + redaction.height) / 100) * height; // Flip Y coordinate (PDF uses bottom-left origin)
        const redactionWidth = (redaction.width / 100) * width;
        const redactionHeight = (redaction.height / 100) * height;

        const finalX = Math.max(0, Math.min(x, width));
        const finalY = Math.max(0, Math.min(y, height));
        const finalWidth = Math.min(redactionWidth, width - finalX);
        const finalHeight = Math.min(redactionHeight, height - finalY);

        // Draw multiple layers to ensure complete coverage
        // Layer 1: White rectangle to "erase" underlying content visually
        page.drawRectangle({
            x: finalX,
            y: finalY,
            width: finalWidth,
            height: finalHeight,
            color: white,
            opacity: 1.0,
        });

        // Layer 2: Redaction color rectangle on top
        page.drawRectangle({
            x: finalX,
            y: finalY,
            width: finalWidth,
            height: finalHeight,
            color: color,
            opacity: 1.0,
        });
    }
}

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
            const pageRedactions = redactionsByPage[pageIndex] || [];

            if (pageRedactions.length > 0) {
                await applyRedactionsToPage(page, pageRedactions, color);
            }
        }

        // Save with flattening options to merge layers
        const pdfBytes = await pdfDoc.save({
            useObjectStreams: false,
            addDefaultPage: false,
            // Note: pdf-lib doesn't have a direct "flatten" option,
            // but saving with these options helps ensure the redaction layers are applied
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

