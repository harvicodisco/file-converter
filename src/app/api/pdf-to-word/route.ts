import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // Placeholder for PDF to Word conversion
        // In production, use libraries like pdf2docx or external APIs
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Mock response with base64 data URL
        const mockDocx = new Blob(["Mock DOCX content"], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
        const base64 = Buffer.from(await mockDocx.arrayBuffer()).toString("base64");
        const downloadUrl = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`;

        return NextResponse.json({
            fileName: file.name.replace(".pdf", ".docx"),
            downloadUrl: downloadUrl,
        });
    } catch (error) {
        console.error("Conversion error:", error);
        return NextResponse.json({ error: "Failed to convert file" }, { status: 500 });
    }
}
