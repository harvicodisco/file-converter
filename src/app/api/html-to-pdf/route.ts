import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { url } = body;

        if (!url) {
            return NextResponse.json({ error: "No URL provided" }, { status: 400 });
        }

        // Simulate processing time
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Mock response - returning a dummy PDF
        // In reality, this would use Puppeteer to print the page to PDF
        const mockPdfContent = `
            %PDF-1.4
            1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
            2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj
            3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources <<>> /Contents 4 0 R>> endobj
            4 0 obj <</Length 21>> stream
            BT /F1 24 Tf 100 700 Td (PDF of ${url}) Tj ET
            endstream endobj
            xref
            0 5
            0000000000 65535 f 
            0000000010 00000 n 
            0000000060 00000 n 
            0000000117 00000 n 
            0000000224 00000 n 
            trailer <</Size 5 /Root 1 0 R>>
            startxref
            300
            %%EOF
        `;

        // This is a minimal valid PDF structure as a string. 
        // We need to encode it properly.
        const buffer = Buffer.from(mockPdfContent);
        const base64 = buffer.toString("base64");
        const downloadUrl = `data:application/pdf;base64,${base64}`;

        const urlObj = new URL(url);
        const hostname = urlObj.hostname.replace(/www\./, "");

        return NextResponse.json({
            fileName: `${hostname}.pdf`,
            downloadUrl: downloadUrl,
        });
    } catch (error) {
        console.error("Conversion error:", error);
        return NextResponse.json({ error: "Failed to convert HTML to PDF" }, { status: 500 });
    }
}
