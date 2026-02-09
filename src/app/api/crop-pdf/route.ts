import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // Note: The actual cropping is done client-side in the page component
        // This route exists for consistency but the main logic is in the page
        // If needed, server-side cropping can be implemented here
        
        return NextResponse.json({
            message: "Crop PDF endpoint - processing done client-side",
        });
    } catch (error) {
        console.error("Crop error:", error);
        return NextResponse.json({ error: "Failed to crop PDF" }, { status: 500 });
    }
}

