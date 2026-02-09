import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import sharp from "sharp";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const compressionLevel = formData.get("compressionLevel") as string || "medium";

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const isMicroFile = file.size < 100 * 1024; // Under 100KB
        console.log(`API: Compressing ${file.name}, level=${compressionLevel}, isMicro=${isMicroFile}`);

        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);

        // Quality settings
        const quality = compressionLevel === "low" ? 80 : (compressionLevel === "high" ? 40 : 60);

        const { context } = pdfDoc;
        const indirectObjects = context.enumerateIndirectObjects();
        let imagesOptimized = 0;

        for (const [ref, object] of indirectObjects) {
            if (!(object instanceof PDFRawStream)) continue;

            const { dict } = object;
            const subtype = dict.get(PDFName.of('Subtype'));

            if (subtype === PDFName.of('Image')) {
                try {
                    const originalBytes = object.contents;

                    // Downsample to max width 800px or even 500px for micro-files
                    const maxWidth = isMicroFile ? 500 : 1000;

                    const compressedBytes = await sharp(originalBytes)
                        .resize({ width: maxWidth, withoutEnlargement: true })
                        .jpeg({ quality, mozjpeg: true, chromaSubsampling: '4:2:0' })
                        .toBuffer();

                    if (compressedBytes.length < originalBytes.length) {
                        dict.set(PDFName.of('Length'), context.obj(compressedBytes.length));
                        dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));

                        const newStream = context.stream(compressedBytes, dict as any);
                        context.assign(ref, newStream);
                        imagesOptimized++;
                    }
                } catch (imgErr) {
                    // Ignore images sharp can't process
                }
            }
        }

        // Clean Rebuild strategy
        const finalizedDoc = await PDFDocument.create();
        const pages = await finalizedDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
        pages.forEach((page) => finalizedDoc.addPage(page));

        // Strip Metadata
        finalizedDoc.setTitle('');
        finalizedDoc.setAuthor('');
        finalizedDoc.setSubject('');
        finalizedDoc.setKeywords([]);
        finalizedDoc.setProducer('');
        finalizedDoc.setCreator('');

        const pdfBytes = await finalizedDoc.save({
            useObjectStreams: true,
            addDefaultPage: false,
            updateFieldAppearances: false,
        });

        console.log(`API: Optimized ${imagesOptimized} images. Final Rebuild: ${file.size} -> ${pdfBytes.length}`);

        return new NextResponse(Buffer.from(pdfBytes), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="compressed_${file.name}"`,
                "X-Original-Size": file.size.toString(),
            },
        });
    } catch (error: any) {
        console.error("Compression error:", error);
        return NextResponse.json({ error: `Failed to compress PDF: ${error.message}` }, { status: 500 });
    }
}
