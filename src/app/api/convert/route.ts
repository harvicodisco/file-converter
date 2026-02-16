import { NextRequest, NextResponse } from "next/server";
import { promisify } from 'util';
import libre from 'libreoffice-convert';

const convertAsync = promisify(libre.convert);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const targetFormat = formData.get("targetFormat") as string;

    if (!file || !targetFormat) {
      return NextResponse.json({ error: "Missing file or target format" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    try {
      console.log(`API: Generic Conversion - ${file.name} to ${targetFormat}...`);
      const outputExtension = targetFormat.startsWith('.') ? targetFormat : `.${targetFormat}`;
      const convertedBuffer = await convertAsync(buffer, outputExtension, undefined);
      console.log("API: Generic Conversion SUCCESS.");

      const mimeTypes: { [key: string]: string } = {
        '.pdf': 'application/pdf',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.txt': 'text/plain',
      };

      const contentType = mimeTypes[outputExtension] || 'application/octet-stream';

      return new Response(convertedBuffer as any, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${file.name.replace(/\.[^/.]+$/, outputExtension)}"`,
        },
      });
    } catch (libreError: any) {
      console.error("API: Generic Conversion Error:", libreError);
      return NextResponse.json({
        error: "LibreOffice conversion failed.",
        details: libreError.message
      }, { status: 500 });
    }

  } catch (error) {
    console.error("Global Conversion error:", error);
    return NextResponse.json({ error: "Failed to convert file" }, { status: 500 });
  }
}
