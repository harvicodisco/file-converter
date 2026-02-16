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
            console.log(`API: Attempting LibreOffice PDF to Excel Conversion for ${file.name}...`);
            const excelBuffer = await convertAsync(buffer, '.xlsx', undefined);
            console.log("API: LibreOffice PDF to Excel Conversion SUCCESS.");

            return new Response(excelBuffer as any, {
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="${file.name.replace(".pdf", ".xlsx")}"`,
                },
            });
        } catch (libreError: any) {
            console.error("API: LibreOffice PDF to Excel Error:", libreError);
            return NextResponse.json({
                error: "LibreOffice conversion failed.",
                details: libreError.message || "Ensure LibreOffice is installed."
            }, { status: 500 });
        }

    } catch (error) {
        console.error("Global Conversion error:", error);
        return NextResponse.json({ error: "Failed to convert to Excel" }, { status: 500 });
    }
}
