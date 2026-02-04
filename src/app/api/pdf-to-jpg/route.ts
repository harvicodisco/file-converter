import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));

        const mockContent = new Blob(["Mock JPG content"], { type: "image/jpeg" });
        const base64 = Buffer.from(await mockContent.arrayBuffer()).toString("base64");
        const downloadUrl = `data:image/jpeg;base64,${base64}`;

        return NextResponse.json({
            fileName: file.name.replace(".pdf", ".jpg"),
            downloadUrl: downloadUrl,
        });
    } catch (error) {
        console.error("Conversion error:", error);
        return NextResponse.json({ error: "Failed to convert to JPG" }, { status: 500 });
    }
}
