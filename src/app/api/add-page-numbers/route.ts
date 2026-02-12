import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type Position = "header-left" | "header-center" | "header-right" | "footer-left" | "footer-center" | "footer-right";
type Margin = "small" | "recommended" | "big";
type TextFormat = "number-only" | "page-n" | "page-n-of-p" | "custom";
type FontFamily = "Arial" | "Times" | "Courier" | "Helvetica";

const getFont = (fontFamily: FontFamily): StandardFonts => {
    switch (fontFamily) {
        case "Arial":
        case "Helvetica":
            return StandardFonts.Helvetica;
        case "Times":
            return StandardFonts.TimesRoman;
        case "Courier":
            return StandardFonts.Courier;
        default:
            return StandardFonts.Helvetica;
    }
};

const getMarginValue = (margin: Margin): number => {
    switch (margin) {
        case "small":
            return 20;
        case "big":
            return 50;
        case "recommended":
        default:
            return 30;
    }
};

const getPositionCoords = (pos: Position, pageWidth: number, pageHeight: number, marginValue: number) => {
    const positions: Record<Position, { x: number; y: number; xAlign?: "left" | "center" | "right" }> = {
        "header-left": { x: marginValue, y: pageHeight - marginValue },
        "header-center": { x: pageWidth / 2, y: pageHeight - marginValue, xAlign: "center" },
        "header-right": { x: pageWidth - marginValue, y: pageHeight - marginValue, xAlign: "right" },
        "footer-left": { x: marginValue, y: marginValue },
        "footer-center": { x: pageWidth / 2, y: marginValue, xAlign: "center" },
        "footer-right": { x: pageWidth - marginValue, y: marginValue, xAlign: "right" },
    };
    return positions[pos];
};

const formatPageNumber = (pageNum: number, totalPages: number, textFormat: TextFormat, customText: string): string => {
    switch (textFormat) {
        case "number-only":
            return pageNum.toString();
        case "page-n":
            return `Page ${pageNum}`;
        case "page-n-of-p":
            return `Page ${pageNum} of ${totalPages}`;
        case "custom":
            return customText.replace(/{n}/g, pageNum.toString()).replace(/{p}/g, totalPages.toString());
        default:
            return pageNum.toString();
    }
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
              r: parseInt(result[1], 16) / 255,
              g: parseInt(result[2], 16) / 255,
              b: parseInt(result[3], 16) / 255,
          }
        : { r: 0, g: 0, b: 0 };
};

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const pageMode = formData.get("pageMode") as "single" | "facing";
        const firstPageIsCover = formData.get("firstPageIsCover") === "true";
        const position = formData.get("position") as Position;
        const margin = formData.get("margin") as Margin;
        const firstNumber = parseInt(formData.get("firstNumber") as string) || 1;
        const fromPage = parseInt(formData.get("fromPage") as string) || 1;
        const toPage = parseInt(formData.get("toPage") as string) || 1;
        const textFormat = formData.get("textFormat") as TextFormat;
        const customText = (formData.get("customText") as string) || "";
        const fontFamily = formData.get("fontFamily") as FontFamily;
        const fontSize = parseInt(formData.get("fontSize") as string) || 12;
        const isBold = formData.get("isBold") === "true";
        const isItalic = formData.get("isItalic") === "true";
        const isUnderline = formData.get("isUnderline") === "true";
        const textColor = (formData.get("textColor") as string) || "#000000";

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const totalPages = pdfDoc.getPageCount();

        // Get font
        const fontName = getFont(fontFamily);
        const font = await pdfDoc.embedFont(fontName);
        const boldFont = isBold ? await pdfDoc.embedFont(fontName === StandardFonts.Helvetica ? StandardFonts.HelveticaBold : fontName === StandardFonts.TimesRoman ? StandardFonts.TimesRomanBold : StandardFonts.CourierBold) : font;
        const italicFont = isItalic ? await pdfDoc.embedFont(fontName === StandardFonts.Helvetica ? StandardFonts.HelveticaOblique : fontName === StandardFonts.TimesRoman ? StandardFonts.TimesRomanItalic : StandardFonts.CourierOblique) : font;
        const finalFont = isBold && isItalic ? await pdfDoc.embedFont(fontName === StandardFonts.Helvetica ? StandardFonts.HelveticaBoldOblique : fontName === StandardFonts.TimesRoman ? StandardFonts.TimesRomanBoldItalic : StandardFonts.CourierBoldOblique) : (isBold ? boldFont : isItalic ? italicFont : font);

        const marginValue = getMarginValue(margin);
        const color = hexToRgb(textColor);

        let currentPageNumber = firstNumber;
        let startPage = Math.max(1, Math.min(fromPage, totalPages)) - 1; // Convert to 0-based index
        const endPage = Math.max(startPage, Math.min(toPage - 1, totalPages - 1)); // Convert to 0-based index

        // Skip first page if it's a cover page (starts numbering from 2nd page)
        if (firstPageIsCover && startPage === 0) {
            startPage = 1; // Start from page 2 (index 1)
        }

        for (let i = startPage; i <= endPage; i++) {
            const page = pdfDoc.getPage(i);
            const { width, height } = page.getSize();

            // Skip first page if it's a cover page
            if (i === 0 && firstPageIsCover) {
                continue;
            }

            // For facing pages, alternate left/right positions
            // In facing pages: even pages (2, 4, 6...) are RIGHT pages, odd pages (3, 5, 7...) are LEFT pages
            let actualPosition = position;
            if (pageMode === "facing") {
                const pageNumber = i + 1; // Convert 0-based index to 1-based page number
                const isRightPage = pageNumber % 2 === 0; // Even page numbers are right pages
                
                if (position.includes("-left")) {
                    // If selected position is left, use it on LEFT pages (odd), flip to right on RIGHT pages (even)
                    actualPosition = isRightPage ? (position.replace("-left", "-right") as Position) : position;
                } else if (position.includes("-right")) {
                    // If selected position is right, use it on RIGHT pages (even), flip to left on LEFT pages (odd)
                    actualPosition = isRightPage ? position : (position.replace("-right", "-left") as Position);
                }
                // Center positions remain unchanged
            }

            const coords = getPositionCoords(actualPosition, width, height, marginValue);
            const pageText = formatPageNumber(currentPageNumber, totalPages, textFormat, customText);

            // Calculate text width for alignment
            const textWidth = finalFont.widthOfTextAtSize(pageText, fontSize);
            let textX = coords.x;
            
            // Adjust x position based on alignment
            if (coords.xAlign === "center") {
                textX = coords.x - textWidth / 2;
            } else if (coords.xAlign === "right") {
                textX = coords.x - textWidth;
            }

            const textOptions: any = {
                x: textX,
                y: coords.y,
                size: fontSize,
                font: finalFont,
                color: rgb(color.r, color.g, color.b),
            };

            page.drawText(pageText, textOptions);

            // Draw underline if needed
            if (isUnderline) {
                const underlineY = coords.y - 2;
                page.drawLine({
                    start: { x: textX, y: underlineY },
                    end: { x: textX + textWidth, y: underlineY },
                    thickness: 1,
                    color: rgb(color.r, color.g, color.b),
                });
            }

            currentPageNumber++;
        }

        const pdfBytes = await pdfDoc.save({
            useObjectStreams: false,
            addDefaultPage: false,
        });

        return new NextResponse(Buffer.from(pdfBytes), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="numbered_${file.name}"`,
            },
        });
    } catch (error) {
        console.error("Add page numbers error:", error);
        return NextResponse.json({ error: "Failed to add page numbers" }, { status: 500 });
    }
}

