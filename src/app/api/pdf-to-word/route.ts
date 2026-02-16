import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import * as libre from "libreoffice-convert";
import path from "path";
import { writeFile, unlink } from "fs/promises";

/**
 * --- HARDENED SHIM LOADER 4.0 (PERFECT MIRROR) ---
 * Provides browser-globals for pdf.js-dist (v4) in Node.js environment.
 */
const setupGlobals = () => {
  if ((globalThis as any)._isConversionHarden4Applied) return;

  const {
    createCanvas,
    Image,
    Canvas,
    CanvasRenderingContext2D,
    DOMMatrix,
    ImageData,
  } = require("canvas");
  const win = globalThis as any;

  const defineGlobal = (prop: string, value: any) => {
    try {
      Object.defineProperty(win, prop, {
        value,
        configurable: false,
        writable: true,
        enumerable: true,
      });
    } catch (e) {
      try {
        win[prop] = value;
      } catch (e2) {}
    }
  };

  const locationShim = {
    protocol: "http:",
    href: "http://localhost/",
    origin: "http://localhost/",
    hostname: "localhost",
    port: "3001",
    pathname: "/",
    search: "",
    hash: "",
  };

  const navigatorShim = {
    userAgent: "Node.js",
    languages: ["en-US", "en"],
    platform: "win32",
  };

  defineGlobal("window", win);
  defineGlobal("self", win);
  defineGlobal("location", locationShim);
  defineGlobal("navigator", navigatorShim);

  const doc = {
    createElement: (type: string) => {
      if (type === "canvas") return createCanvas(1, 1);
      if (type === "img") return new Image();
      return {};
    },
    createElementNS: (_ns: string, type: string) => {
      if (type === "canvas") return createCanvas(1, 1);
      if (type === "img") return new Image();
      return {};
    },
    documentElement: { style: {} },
    body: { append: () => {} },
    readyState: "complete",
    baseURI: "http://localhost/",
    location: locationShim,
  };

  defineGlobal("document", doc);
  defineGlobal("Canvas", Canvas);
  defineGlobal("Image", Image);
  defineGlobal("HTMLCanvasElement", Canvas);
  defineGlobal("HTMLImageElement", Image);

  // Native Canvas classes for binary C++ layer compatibility
  defineGlobal("DOMMatrix", DOMMatrix);
  defineGlobal("ImageData", ImageData);

  // Path2D Polyfill
  const {
    Path2D: Path2DPolyfill,
    applyPath2DToCanvasRenderingContext,
  } = require("path2d");
  applyPath2DToCanvasRenderingContext(CanvasRenderingContext2D);
  defineGlobal("Path2D", Path2DPolyfill);

  defineGlobal("requestAnimationFrame", (cb: any) => setTimeout(cb, 0));
  defineGlobal("cancelAnimationFrame", (id: any) => clearTimeout(id));

  // Add missing event listener polyfill for Tesseract
  if (!win.addEventListener) {
    defineGlobal("addEventListener", () => {});
  }
  if (!win.removeEventListener) {
    defineGlobal("removeEventListener", () => {});
  }

  if (Image.prototype) {
    Object.defineProperty(Image.prototype, "nodeName", {
      get: () => "IMG",
      configurable: true,
    });
  }
  if (Canvas.prototype) {
    Object.defineProperty(Canvas.prototype, "nodeName", {
      get: () => "CANVAS",
      configurable: true,
    });
  }

  // Aggressive drawImage rescue for "Image or Canvas expected" errors
  const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (
    img: any,
    ...args: any[]
  ) {
    if (!img) return;
    const isNative = img instanceof Canvas || img instanceof Image;
    if (!isNative && img.width && img.height) {
      try {
        const tempCanvas = createCanvas(img.width, img.height);
        const tempCtx = tempCanvas.getContext("2d");
        if (img.data) {
          const imgData = tempCtx.createImageData(img.width, img.height);
          imgData.data.set(img.data);
          tempCtx.putImageData(imgData, 0, 0);
          return originalDrawImage.apply(this, [tempCanvas, ...args] as any);
        } else if (typeof img.toBuffer === "function") {
          const newImg = new Image();
          newImg.src = img.toBuffer();
          return originalDrawImage.apply(this, [newImg, ...args] as any);
        }
      } catch (e) {}
    }
    return originalDrawImage.apply(this, [img, ...args] as any);
  };

  (globalThis as any)._isConversionHarden4Applied = true;
};

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  Header,
  SectionType,
  TextWrappingType,
  RelativeHorizontalPosition,
  RelativeVerticalPosition,
} from "docx";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    console.log(`API: Processing Enhanced PDF.js Conversion for ${file.name}`);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    try {
      // Enhanced PDF.js method for proper Word document generation
      console.log("Using enhanced PDF.js for proper Word document generation");

      setupGlobals();
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useWorkerFetch: false,
        isEvalSupported: false,
        disableFontFace: true,
        disableWorker: true,
      });

      const pdf = await loadingTask.promise;
      const sections: any[] = [];

      // Process each page with enhanced document structure
      for (let i = 1; i <= pdf.numPages; i++) {
        console.log(
          `Processing page ${i} of ${pdf.numPages} with enhanced structure`,
        );
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 2.0 });

        const pageWidth = viewport.width / 2.0;
        const pageHeight = viewport.height / 2.0;
        const pageElements: any[] = [];

        // Check if page has meaningful text content
        const items = textContent.items as any[];
        const hasTextContent = items.some(
          (item) => item.str && item.str.trim().length > 0,
        );

        if (hasTextContent) {
          console.log(`Page ${i}: Creating proper document structure`);

          // Enhanced text grouping for better paragraphs
          const paragraphs: any[] = [];
          let currentParagraph: any[] = [];
          let lastY = -1;
          let lineHeight = 0;

          // Sort items by Y position (top to bottom) then X position (left to right)
          const sortedItems = items
            .filter((item) => item.str && item.str.trim())
            .sort((a, b) => {
              const yDiff = (b.transform[5] - a.transform[5]) * 2.0;
              if (Math.abs(yDiff) < 10) {
                return (a.transform[4] - b.transform[4]) * 2.0; // Same line, sort by X
              }
              return yDiff; // Different lines, sort by Y
            });

          // Group items into paragraphs
          sortedItems.forEach((item) => {
            const y = Math.round(item.transform[5] * 2.0);
            const fontSize = Math.abs(item.transform[3]) * 2.0;

            // Calculate line height from first item
            if (lineHeight === 0) {
              lineHeight = fontSize * 1.2;
            }

            // Check if this is a new paragraph (significant Y gap)
            if (lastY !== -1 && Math.abs(y - lastY) > lineHeight * 1.5) {
              if (currentParagraph.length > 0) {
                paragraphs.push([...currentParagraph]);
                currentParagraph = [];
              }
            }

            currentParagraph.push({
              text: item.str,
              x: item.transform[4] * 2.0,
              y: y,
              fontSize: fontSize,
              fontName: item.fontName || "",
              width: item.width * 2.0,
            });

            lastY = y;
          });

          // Add the last paragraph
          if (currentParagraph.length > 0) {
            paragraphs.push(currentParagraph);
          }

          // Create proper Word paragraphs
          paragraphs.forEach((paragraphItems: any[]) => {
            // Sort paragraph items by X position for proper reading order
            paragraphItems.sort((a: any, b: any) => a.x - b.x);

            // Calculate paragraph properties
            const avgFontSize =
              paragraphItems.reduce(
                (sum: number, item: any) => sum + item.fontSize,
                0,
              ) / paragraphItems.length;
            const isBold = paragraphItems.some(
              (item: any) =>
                item.fontName.toLowerCase().includes("bold") ||
                item.fontName.toLowerCase().includes("black"),
            );
            const isItalic = paragraphItems.some(
              (item: any) =>
                item.fontName.toLowerCase().includes("italic") ||
                item.fontName.toLowerCase().includes("oblique"),
            );

            // Combine text with proper spacing
            const paragraphText = paragraphItems
              .map((item: any, index: number) => {
                const text = item.text;
                // Add space between items if they're far apart (likely separate words)
                if (index < paragraphItems.length - 1) {
                  const nextItem = paragraphItems[index + 1];
                  const gap = nextItem.x - (item.x + item.width);
                  if (gap > 5) {
                    return text + " ";
                  }
                }
                return text;
              })
              .join("");

            // Create properly formatted paragraph
            pageElements.push(
              new Paragraph({
                spacing: {
                  before: Math.round(avgFontSize * 0.5),
                  after: Math.round(avgFontSize * 0.5),
                  line: Math.round(avgFontSize * 1.2),
                  lineRule: "auto" as any,
                },
                indent: {
                  left: 0,
                  right: 0,
                },
                alignment: "left" as any,
                children: [
                  new TextRun({
                    text: paragraphText,
                    bold: isBold,
                    italics: isItalic,
                    size: Math.round(avgFontSize * 2),
                    color: "000000",
                    font: "Calibri" as any, // Professional font
                  }),
                ],
              }),
            );
          });

          // Add page images if detected
          try {
            const operatorList = await page.getOperatorList();
            const { createCanvas } = require("canvas");
            const canvas = createCanvas(viewport.width, viewport.height);
            const ctx = canvas.getContext("2d");

            // Check for images in the operator list
            let hasImages = false;
            for (let j = 0; j < operatorList.fnArray.length; j++) {
              const fnId = operatorList.fnArray[j];
              if (fnId >= 70 && fnId <= 73) {
                // Image paint operations
                hasImages = true;
                break;
              }
            }

            if (hasImages) {
              console.log(`Page ${i}: Adding images to document`);

              // Render page to extract images
              await page.render({
                canvasContext: ctx as any,
                viewport: viewport,
                canvas: canvas as any,
              } as any).promise;

              const imageBuffer = canvas.toBuffer("image/png");

              // Add image as inline content
              pageElements.push(
                new Paragraph({
                  spacing: { before: 200, after: 200 },
                  alignment: "center" as any,
                  children: [
                    new ImageRun({
                      data: imageBuffer,
                      transformation: {
                        width: Math.min(Math.round(pageWidth * 0.8), 600),
                        height: Math.min(Math.round(pageHeight * 0.6), 400),
                      },
                      type: "png",
                    }),
                  ],
                }),
              );
            }
          } catch (imageError) {
            console.log(
              `Page ${i}: No images found or image extraction failed`,
            );
          }
        } else {
          // For image-only pages, render the entire page
          console.log(`Page ${i}: Processing image-only page`);

          try {
            const { createCanvas } = require("canvas");
            const canvas = createCanvas(viewport.width, viewport.height);
            const ctx = canvas.getContext("2d");

            await page.render({
              canvasContext: ctx as any,
              viewport: viewport,
              canvas: canvas as any,
            } as any).promise;

            const imageBuffer = canvas.toBuffer("image/png");

            pageElements.push(
              new Paragraph({
                spacing: { before: 100, after: 100 },
                alignment: "center" as any,
                children: [
                  new ImageRun({
                    data: imageBuffer,
                    transformation: {
                      width: Math.min(Math.round(pageWidth * 0.9), 700),
                      height: Math.min(Math.round(pageHeight * 0.8), 500),
                    },
                    type: "png",
                  }),
                ],
              }),
            );
          } catch (imageError) {
            console.error(`Image rendering failed for page ${i}:`, imageError);
            pageElements.push(
              new Paragraph({
                text: "[This page contains images or graphics that could not be rendered]",
                spacing: { before: 200, after: 200 },
                alignment: "center" as any,
              }),
            );
          }
        }

        sections.push({
          properties: {
            page: {
              size: {
                width: Math.round(pageWidth * 20),
                height: Math.round(pageHeight * 20),
              },
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch margins
            },
            type: SectionType.NEXT_PAGE,
          },
          children:
            pageElements.length > 0
              ? pageElements
              : [new Paragraph({ text: "[No content found on this page]" })],
        });
      }

      const doc = new Document({ sections });

      const docxBuffer = await Packer.toBuffer(doc);

      return new Response(docxBuffer as any, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${file.name.replace(".pdf", ".docx")}"`,
        },
      });
    } catch (error: any) {
      console.error("PDF.js conversion failed:", error);
      return NextResponse.json(
        { error: `Conversion failed: ${error.message}` },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error("API: Global Error:", error);
    return NextResponse.json(
      { error: `System crash: ${error.message}` },
      { status: 500 },
    );
  }
}
