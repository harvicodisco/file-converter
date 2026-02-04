import { NextRequest, NextResponse } from "next/server";

// Placeholder API routes for remaining conversions
const createPlaceholderRoute = (outputType: string, mimeType: string, extension: string) => {
    return async function POST(req: NextRequest) {
        try {
            const formData = await req.formData();
            const file = formData.get("file") as File;

            if (!file) {
                return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
            }

            // Simulate processing
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Mock response
            const mockContent = new Blob([`Mock ${outputType} content`], { type: mimeType });
            const base64 = Buffer.from(await mockContent.arrayBuffer()).toString("base64");
            const downloadUrl = `data:${mimeType};base64,${base64}`;

            return NextResponse.json({
                fileName: file.name.replace(/\.[^/.]+$/, extension),
                downloadUrl: downloadUrl,
            });
        } catch (error) {
            console.error("Conversion error:", error);
            return NextResponse.json({ error: `Failed to convert to ${outputType}` }, { status: 500 });
        }
    };
};

// Export individual route handlers
export const pdfToExcel = createPlaceholderRoute("Excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx");
export const pdfToPPT = createPlaceholderRoute("PowerPoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", ".pptx");
export const pdfToJPG = createPlaceholderRoute("JPG", "image/jpeg", ".jpg");
export const officeToPDF = createPlaceholderRoute("PDF", "application/pdf", ".pdf");
