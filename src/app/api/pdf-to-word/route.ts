import { NextRequest, NextResponse } from "next/server";
import { Document, Packer, Paragraph, ImageRun, SectionType } from "docx";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas, Canvas, Image, CanvasRenderingContext2D } from "canvas";
import path from "path";

// Shim globals for PDF.js to satisfy instanceof checks in Node.js
if (typeof global !== "undefined") {
    (global as any).Canvas = Canvas;
    (global as any).Image = Image;
    (global as any).CanvasRenderingContext2D = CanvasRenderingContext2D;
    // ImageData is also often needed
    if (!(global as any).ImageData) {
        (global as any).ImageData = function (width: number, height: number) {
            return { width, height, data: new Uint8ClampedArray(width * height * 4) };
        };
    }
}

// Define the NodeCanvasFactory as recommended for PDF.js in Node environment
class NodeCanvasFactory {
    create(width: number, height: number) {
        const canvas = createCanvas(width, height);
        const context = canvas.getContext("2d");
        return {
            canvas,
            context,
        };
    }

    reset(canvasAndContext: any, width: number, height: number) {
        canvasAndContext.canvas.width = width;
        canvasAndContext.canvas.height = height;
    }

    destroy(canvasAndContext: any) {
        canvasAndContext.canvas.width = 0;
        canvasAndContext.canvas.height = 0;
        canvasAndContext.canvas = null;
        canvasAndContext.context = null;
    }
}

// Configure PDF.js worker using absolute path with file:// protocol for Windows
const workerPath = path.resolve(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs").replace(/\\/g, "/");
pdfjs.GlobalWorkerOptions.workerSrc = `file://${workerPath}`;

export async function POST(req: NextRequest) {
    try {
        let formData;
        try {
            formData = await req.formData();
        } catch (e: any) {
            console.error("FormData Error:", e);
            return NextResponse.json({ error: `Form data parse error: ${e.message}. The file might be too large for the current server configuration.` }, { status: 400 });
        }

        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        console.log(`API: Converting PDF to Word - ${file.name}`);

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        console.log(`API: PDF buffer size: ${buffer.length} bytes`);

        // Load PDF document
        const loadingTask = pdfjs.getDocument({
            data: new Uint8Array(buffer),
            verbosity: 0,
            standardFontDataUrl: `file://${path.resolve(process.cwd(), "node_modules/pdfjs-dist/standard_fonts").replace(/\\/g, "/")}/`,
            disableWorker: true,
        } as any);

        console.log("API: Loading PDF document...");
        const pdfDocument = await loadingTask.promise;
        const pageCount = pdfDocument.numPages;

        console.log(`API: PDF loaded successfully. ${pageCount} pages.`);

        // Convert all pages to images
        const pageImages: Buffer[] = [];
        const scale = 2.0;

        // Shared factory instance
        const canvasFactory = new NodeCanvasFactory();

        for (let i = 1; i <= pageCount; i++) {
            console.log(`API: Rendering page ${i}/${pageCount}...`);
            const page = await pdfDocument.getPage(i);
            const viewport = page.getViewport({ scale });

            // Create canvas through factory
            const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);
            const { canvas, context } = canvasAndContext;

            // Fill background with white (prevents blank/transparent pages)
            context.fillStyle = "white";
            context.fillRect(0, 0, viewport.width, viewport.height);

            // Render PDF page to canvas
            const renderContext = {
                canvasContext: context as any,
                viewport: viewport,
                canvasFactory: canvasFactory,
                canvas: canvas as any,
            };

            await page.render(renderContext).promise;

            // Convert canvas to PNG buffer
            const imageBuffer = canvas.toBuffer('image/png');
            pageImages.push(imageBuffer);

            console.log(`API: Converted page ${i}/${pageCount} - Image size: ${imageBuffer.length} bytes`);
        }

        // Create DOCX document with images
        const sections = pageImages.map((pageBuffer, index) => {
            const widthPoints = 595; const heightPoints = 842;
            const widthTwips = widthPoints * 20;
            const heightTwips = heightPoints * 20;

            return {
                properties: {
                    type: SectionType.NEXT_PAGE,
                    page: {
                        size: { width: widthTwips, height: heightTwips },
                        margin: { top: 0, right: 0, bottom: 0, left: 0 },
                    },
                },
                children: [
                    new Paragraph({
                        children: [
                            new ImageRun({
                                data: pageBuffer,
                                transformation: { width: widthPoints, height: heightPoints },
                                type: "png",
                            }),
                        ],
                        spacing: { before: 0, after: 0 },
                    }),
                ],
            };
        });

        const doc = new Document({ sections: sections });
        const docxBuffer = await Packer.toBuffer(doc);

        console.log(`API: Conversion successful - ${pageCount} pages. Returning DOCX file.`);

        return new Response(docxBuffer as any, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "Content-Disposition": `attachment; filename="${file.name.replace(".pdf", ".docx")}"`,
            },
        });
    } catch (error: any) {
        console.error("API: Conversion error:", error);
        return NextResponse.json({
            error: `Failed to convert file: ${error.message || "Unknown error"}`
        }, { status: 500 });
    }
}
