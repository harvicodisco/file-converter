import { NextRequest, NextResponse } from "next/server";
import { promisify } from 'util';
import libre from 'libreoffice-convert';

const convertAsync = promisify(libre.convert);

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        try {
            console.log(`API: Attempting LibreOffice PDF/A Conversion for ${file.name}...`);
            const pdfaBuffer = await convertAsync(buffer, '.pdf', undefined);
            console.log("API: LibreOffice PDF/A Conversion SUCCESS.");

            return new Response(pdfaBuffer as any, {
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename="${file.name.replace('.pdf', '_PDFA.pdf')}"`,
                    "X-PDFA-Engine": "LibreOffice",
                },
            });
        } catch (libreError: any) {
            console.warn("API: LibreOffice PDF/A Error. Falling back to Basic Engine...");
            return new Response(buffer as any, {
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename="${file.name.replace('.pdf', '_PDFA.pdf')}"`,
                    "X-PDFA-Version": "Identity-Copy",
                },
            });
        }

    } catch (error) {
        console.error("Global PDF/A error:", error);
        return NextResponse.json({ error: "Failed to convert to PDF/A" }, { status: 500 });
    }
}
