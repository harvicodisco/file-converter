import * as pdfjs from 'pdfjs-dist';
import path from 'path';
import sharp from 'sharp';
import { JSDOM } from 'jsdom';

export interface RasterPage {
  buffer: Buffer;
  width: number;
  height: number;
}

export async function rasterizePdfPages(buffer: Buffer): Promise<RasterPage[]> {
  console.log("rasterizePdfPages starting (SVG Mode)...");

  // Setup JSDOM to mock the browser environment
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  const { window } = dom;
  const { document } = window;

  // Set global variables that PDF.js expects
  (global as any).document = document;
  (global as any).window = window;
  (global as any).Node = window.Node;
  (global as any).Element = window.Element;
  (global as any).SVGElement = window.SVGElement;
  (global as any).Image = window.Image;
  (global as any).XMLSerializer = window.XMLSerializer;

  try {
    // Setup worker
    const workerPath = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/build/pdf.worker.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = workerPath;

    const data = new Uint8Array(buffer);
    const loadingTask = pdfjs.getDocument({
      data,
      verbosity: 0,
    });

    const doc = await loadingTask.promise;
    const pages: RasterPage[] = [];

    // Scale for rendering
    const scale = 2.0;

    for (let i = 1; i <= doc.numPages; i++) {
      console.log(`Processing page ${i}/${doc.numPages} using SVG engine...`);
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale });

      const operatorList = await page.getOperatorList();

      // Determine the SVGGraphics constructor
      // @ts-ignore
      const SVGGraphics = (pdfjs as any).SVGGraphics || (pdfjs as any).default?.SVGGraphics;

      if (!SVGGraphics) {
        throw new Error("SVGGraphics not found in pdfjs-dist. This version might not be compatible with SVG rendering in Node.");
      }

      const svgGraphics = new SVGGraphics(page.commonObjs, page.objs);
      svgGraphics.embedFonts = true;

      const svgElement = await svgGraphics.getSVG(operatorList, viewport);

      // Serialize to SVG String
      const serializer = new window.XMLSerializer();
      const svgString = serializer.serializeToString(svgElement);

      // Convert SVG to JPEG (Sharp handles SVG buffers and strings)
      const jpegBuffer = await sharp(Buffer.from(svgString))
        .resize({
          width: Math.round(viewport.width),
          height: Math.round(viewport.height)
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      pages.push({
        buffer: jpegBuffer,
        width: viewport.width / scale,
        height: viewport.height / scale
      });

      console.log(`Page ${i} converted successfully.`);
    }

    // Cleanup globals to prevent memory leaks in dev mode
    delete (global as any).document;
    delete (global as any).window;

    return pages;
  } catch (error: any) {
    console.error("SVG Rasterization Crash:", error);
    // Cleanup globals on error too
    delete (global as any).document;
    delete (global as any).window;
    throw new Error(`PDF Render Error (SVG): ${error.message}`);
  }
}
