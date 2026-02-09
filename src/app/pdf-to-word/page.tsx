"use client";

import { useState } from "react";
import { FileText, Plus } from "lucide-react";
import ConversionLayout from "@/components/ConversionLayout";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";
import PreviewContent from "@/components/PreviewContent";

export default function PDFToWord() {
    const [files, setFiles] = useState<File[]>([]);
    const [isConverting, setIsConverting] = useState(false);
    const [result, setResult] = useState<{ fileName: string; downloadUrl: string } | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFiles([file]);
            setResult(null);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleConvert = async () => {
        if (files.length === 0) return;

        setIsConverting(true);
        try {
            const file = files[0];
            const arrayBuffer = await file.arrayBuffer();

            const pdfjsLib = await import("pdfjs-dist");
            const { Document, Packer, Paragraph, TextRun, ImageRun, SectionType, TextWrappingType, RelativeHorizontalPosition, RelativeVerticalPosition } = await import("docx");

            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;

            const sections: any[] = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);

                // 1. High-Res Design Mask ( capturing Vectors, Images, Backgrounds)
                const viewport = page.getViewport({ scale: 2.0 });
                const pageWidth = viewport.width / 2;
                const pageHeight = viewport.height / 2;

                const bgCanvas = document.createElement("canvas");
                bgCanvas.width = viewport.width;
                bgCanvas.height = viewport.height;
                const bgCtx = bgCanvas.getContext("2d");

                if (bgCtx) {
                    // Mute text characters to get a clean visual-only design mask
                    bgCtx.fillText = () => { };
                    bgCtx.strokeText = () => { };

                    await page.render({
                        canvasContext: bgCtx,
                        viewport: viewport
                    }).promise;
                }

                const bgBlob = await new Promise<Blob | null>(res => bgCanvas.toBlob(res, "image/png", 0.98));
                const bgBuffer = await bgBlob!.arrayBuffer();

                // 2. Extract Text Data and Group into Lines for Stability
                const textData = await page.getTextContent();
                const rawItems = textData.items as any[];

                // Group by Y-coordinate (top to bottom) with tolerance
                const linesMap = new Map<number, any[]>();
                rawItems.forEach(item => {
                    const y = Math.round(item.transform[5]);
                    // Find a line within 3px tolerance
                    let lineKey = Array.from(linesMap.keys()).find(k => Math.abs(k - y) < 4);
                    if (lineKey === undefined) {
                        lineKey = y;
                        linesMap.set(lineKey, []);
                    }
                    linesMap.get(lineKey)!.push({
                        text: item.str,
                        x: item.transform[4],
                        y: y,
                        fontName: item.fontName?.toLowerCase() || "",
                        fontSize: Math.abs(item.transform[0]),
                        width: item.width
                    });
                });

                const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);
                const pageElements: any[] = [];

                // ADD BACKGROUND FIRST (Design Mirror)
                pageElements.push(new Paragraph({
                    children: [
                        new ImageRun({
                            data: new Uint8Array(bgBuffer),
                            transformation: {
                                width: pageWidth,
                                height: pageHeight,
                            },
                            floating: {
                                horizontalPosition: { offset: 0 },
                                verticalPosition: { offset: 0 },
                                wrap: { type: TextWrappingType.NONE },
                                behindText: true,
                            },
                            type: "png"
                        })
                    ]
                }));

                // ADD LINE-GROUPED TEXT (Editable Mirror)
                sortedY.forEach(yKey => {
                    const lineItems = linesMap.get(yKey)!.sort((a, b) => a.x - b.x);
                    if (lineItems.length === 0) return;

                    const firstItem = lineItems[0];
                    const avgFontSize = lineItems.reduce((acc, el) => acc + el.fontSize, 0) / lineItems.length;

                    // PDF Y is bottom-up. Word Y is top-down.
                    const wordY = pageHeight - firstItem.y - avgFontSize;

                    pageElements.push(new Paragraph({
                        children: lineItems.map(item => {
                            const isBold = item.fontName.includes("bold") || item.fontName.includes("black");
                            const isItalic = item.fontName.includes("italic") || item.fontName.includes("oblique");

                            return new TextRun({
                                text: item.text,
                                bold: isBold,
                                italics: isItalic,
                                size: item.fontSize * 2,
                                color: "000000"
                            });
                        }),
                        floating: {
                            horizontalPosition: {
                                relative: RelativeHorizontalPosition.PAGE,
                                offset: Math.round(firstItem.x * 20),
                            },
                            verticalPosition: {
                                relative: RelativeVerticalPosition.PAGE,
                                offset: Math.round(wordY * 20),
                            },
                            wrap: { type: TextWrappingType.NONE },
                            allowOverlap: true,
                        }
                    }));
                });

                sections.push({
                    properties: {
                        page: {
                            size: { width: pageWidth * 20, height: pageHeight * 20 },
                            margin: { top: 0, right: 0, bottom: 0, left: 0 }
                        },
                        type: SectionType.NEXT_PAGE,
                    },
                    children: pageElements,
                });
            }

            const doc = new Document({ sections });
            const docxBlob = await Packer.toBlob(doc);
            const downloadUrl = URL.createObjectURL(docxBlob);
            const fileName = file.name.replace(".pdf", ".docx");

            setResult({ fileName, downloadUrl });
        } catch (error: any) {
            console.error("Mirror Failure:", error);
            alert(`Mirror conversion failed: ${error.message}`);
        } finally {
            setIsConverting(false);
        }
    };

    const handleReset = () => {
        setFiles([]);
        setResult(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
    };

    const SettingsPanel = (
        <div className="flex flex-col h-full font-black uppercase tracking-tight">
            <div className="bg-emerald-600 rounded-2xl p-4 text-white mb-6 shadow-xl shadow-emerald-100 italic">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] opacity-70">Mirror Engine 2.0</span>
                    {files.length > 0 && <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded animate-pulse">FIXED</span>}
                </div>
                <p className="text-base leading-none">
                    "Dito" (Identical) Mode<br />Design: 100% Mirror<br />Text: Solid / Editable
                </p>
            </div>

            <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-100 mb-8 lowercase tracking-tight">
                <h3 className="text-[10px] text-zinc-400 mb-3 uppercase font-black">Fix Log</h3>
                <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-xs text-zinc-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Fixed Line Alignment Shift</span>
                    </li>
                    <li className="flex items-center gap-3 text-xs text-zinc-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Stabilized Design Overlay</span>
                    </li>
                    <li className="flex items-center gap-3 text-xs text-zinc-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>High-Density Design Mask</span>
                    </li>
                </ul>
            </div>

            <div className="mt-auto">
                <ProcessingButton
                    onClick={handleConvert}
                    isProcessing={isConverting}
                    disabled={files.length === 0}
                    icon={FileText}
                    text="Fix & Convert Dito"
                    processingText="Fixing Mirror..."
                    bgColor="bg-emerald-600"
                    className="w-full shadow-emerald-200"
                />
            </div>
        </div>
    );

    return (
        <ConversionLayout
            title="Dito Mirror Fix"
            description="Precision 1:1 Mirror Reconstruction (Version 2.0)"
            settingsPanel={!result ? SettingsPanel : (
                <div className="h-full flex flex-col justify-center">
                    <DownloadResult
                        fileName={result.fileName}
                        downloadUrl={result.downloadUrl}
                        onReset={handleReset}
                        stats={[
                            { label: "Design", value: "Fixed 1:1" },
                            { label: "Sync", value: "Dito" }
                        ]}
                    />
                </div>
            )}
        >
            {result ? (
                <div className="w-full h-full max-w-4xl">
                    <PreviewContent url={result.downloadUrl} fileName={result.fileName} />
                </div>
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8">
                    {files.length > 0 && previewUrl ? (
                        <div className="w-full h-full max-w-5xl flex flex-col">
                            <div className="mb-6 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-1">Dito Preview</h2>
                                    <p className="text-xs text-zinc-900 font-black">{files[0].name}</p>
                                </div>
                                <label className="text-xs font-black text-emerald-600 hover:text-emerald-700 cursor-pointer flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                                    <Plus size={14} />
                                    <span>Change Catalog</span>
                                    <input type="file" accept=".pdf" onChange={handleFilesChange} className="hidden" />
                                </label>
                            </div>
                            <div className="flex-1 bg-white rounded-3xl overflow-hidden border border-zinc-200 shadow-2xl relative">
                                <iframe src={`${previewUrl}#toolbar=0`} className="w-full h-full border-none" />
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="w-24 h-24 bg-emerald-50 rounded-3xl mb-8 flex items-center justify-center mx-auto shadow-inner shadow-emerald-100/50">
                                <FileText className="text-emerald-500" size={48} />
                            </div>
                            <h3 className="text-2xl font-black text-zinc-900 mb-2">"Dito" Mirror 2.0</h3>
                            <p className="text-zinc-500 text-sm mb-8 font-medium italic">Fixed pixel-perfect parity for your furniture catalogs.</p>
                            <label className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 cursor-pointer transition-all shadow-xl shadow-emerald-200 active:scale-95 leading-none">
                                <Plus size={24} />
                                <span>Upload Catalog</span>
                                <input type="file" accept=".pdf" onChange={handleFilesChange} className="hidden" />
                            </label>
                        </div>
                    )}
                </div>
            )}
        </ConversionLayout>
    );
}
