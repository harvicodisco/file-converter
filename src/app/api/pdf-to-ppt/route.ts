import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));

        const mockContent = new Blob(["Mock PowerPoint content"], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
        const base64 = Buffer.from(await mockContent.arrayBuffer()).toString("base64");
        const downloadUrl = `data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,${base64}`;

        return NextResponse.json({
            fileName: file.name.replace(".pdf", ".pptx"),
            downloadUrl: downloadUrl,
        });
    } catch (error) {
        console.error("Conversion error:", error);
        return NextResponse.json({ error: "Failed to convert to PowerPoint" }, { status: 500 });
    }
}
