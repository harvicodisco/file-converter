import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // Simulate processing time
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Mock response
        const buffer = Buffer.from(await file.arrayBuffer());
        const base64 = buffer.toString("base64");
        const downloadUrl = `data:application/pdf;base64,${base64}`;

        return NextResponse.json({
            fileName: file.name.replace(".pdf", "_PDFA.pdf"),
            downloadUrl: downloadUrl,
        });
    } catch (error) {
        console.error("Conversion error:", error);
        return NextResponse.json({ error: "Failed to convert to PDF/A" }, { status: 500 });
    }
}
