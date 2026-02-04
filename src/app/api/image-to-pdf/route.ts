import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const files = formData.getAll("files") as File[];
        const settings = formData.get("settings"); // Retrieve settings if needed

        if (!files || files.length === 0) {
            return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
        }

        // Simulate processing time
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Mock response
        // In a real app, this would process images into a PDF

        // Create a dummy PDF content based on image count
        const mockPdfContent = `PDF with ${files.length} images. Settings: ${settings}`;
        const buffer = Buffer.from(mockPdfContent);
        const base64 = buffer.toString("base64");
        const downloadUrl = `data:application/pdf;base64,${base64}`;

        return NextResponse.json({
            fileName: "converted_images.pdf",
            downloadUrl: downloadUrl,
        });
    } catch (error) {
        console.error("Conversion error:", error);
        return NextResponse.json({ error: "Failed to convert images to PDF" }, { status: 500 });
    }
}
