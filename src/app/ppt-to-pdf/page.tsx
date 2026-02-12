"use client";

import { useState } from "react";
import { Presentation, Plus, FileText, FileSpreadsheet } from "lucide-react";
import ConversionLayout from "@/components/ConversionLayout";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";
import PreviewContent from "@/components/PreviewContent";
import JSZip from "jszip";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export default function PPTToPDF() {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<{ fileName: string; downloadUrl: string } | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);

    const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFiles([file]);
            setResult(null);
            setPreviewUrl(null);
            setProgress(0);
        }
    };

    const handleConvert = async () => {
        if (files.length === 0) return;

        setIsProcessing(true);
        setProgress(0);

        try {
            const file = files[0];
            const arrayBuffer = await file.arrayBuffer();
            const zip = await JSZip.loadAsync(arrayBuffer);

            // 1. Get Slide Size from presentation.xml
            const presentationXml = await zip.file("ppt/presentation.xml")?.async("string");
            let width = 720; // Default PPT pt width
            let height = 405; // Default PPT pt height (16:9 approx)

            // EMU conversion constant: 1 inch = 914400 EMU, 72 pt = 1 inch -> 1 pt = 12700 EMU
            const EMU_TO_PT = 1 / 12700;

            if (presentationXml) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(presentationXml, "text/xml");
                const sldSz = doc.getElementsByTagName("p:sldSz")[0];
                if (sldSz) {
                    const cx = parseInt(sldSz.getAttribute("cx") || "0");
                    const cy = parseInt(sldSz.getAttribute("cy") || "0");
                    if (cx > 0) width = cx * EMU_TO_PT;
                    if (cy > 0) height = cy * EMU_TO_PT;
                }
            }

            const pdfDoc = await PDFDocument.create();
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

            // 2. Find slides
            const slideFiles = Object.keys(zip.files).filter(path =>
                path.startsWith("ppt/slides/slide") && path.endsWith(".xml")
            );

            // Sort slides naturally
            slideFiles.sort((a, b) => {
                const numA = parseInt(a.match(/slide(\d+)\.xml/)![1]);
                const numB = parseInt(b.match(/slide(\d+)\.xml/)![1]);
                return numA - numB;
            });

            if (slideFiles.length === 0) throw new Error("No slides found");

            // 3. Process each slide
            for (let i = 0; i < slideFiles.length; i++) {
                const slidePath = slideFiles[i];
                const slideContent = await zip.file(slidePath)?.async("string");
                if (!slideContent) continue;

                // Load relationships for images
                const relsPath = slidePath.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels";
                const relsContent = await zip.file(relsPath)?.async("string");
                const relsMap: Record<string, string> = {}; // rId -> target

                if (relsContent) {
                    const parser = new DOMParser();
                    const relsDoc = parser.parseFromString(relsContent, "text/xml");
                    const relationships = relsDoc.getElementsByTagName("Relationship");
                    for (let r = 0; r < relationships.length; r++) {
                        const id = relationships[r].getAttribute("Id");
                        const target = relationships[r].getAttribute("Target");
                        if (id && target) {
                            relsMap[id] = target;
                        }
                    }
                }

                // Create Page
                const page = pdfDoc.addPage([width, height]);
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(slideContent, "text/xml");

                // Process Shapes (<p:sp>) and Pictures (<p:pic>)
                // We'll iterate through the shape tree
                const spTree = xmlDoc.getElementsByTagName("p:spTree")[0];
                if (!spTree) continue;

                // Helper to get position from <a:xfrm>
                const getPosition = (element: Element) => {
                    const xfrm = element.getElementsByTagName("a:xfrm")[0];
                    if (!xfrm) return null;
                    const off = xfrm.getElementsByTagName("a:off")[0];
                    const ext = xfrm.getElementsByTagName("a:ext")[0];
                    if (!off || !ext) return null;

                    const x = parseInt(off.getAttribute("x") || "0") * EMU_TO_PT;
                    const y = parseInt(off.getAttribute("y") || "0") * EMU_TO_PT;
                    const w = parseInt(ext.getAttribute("cx") || "0") * EMU_TO_PT;
                    const h = parseInt(ext.getAttribute("cy") || "0") * EMU_TO_PT;
                    return { x, y, w, h };
                };

                // Elements can be nested, but usually in spTree direct children group shapes
                // Flattening is complex, let's just look for all sp and pic in the doc for MVP
                const shapes = Array.from(xmlDoc.getElementsByTagName("p:sp"));
                const pics = Array.from(xmlDoc.getElementsByTagName("p:pic"));

                // Combine and sort by order in XML (rendering order) - simplistic approach
                // Actually they are usually in z-index order in the xml

                // Draw Pictures
                for (const pic of pics) {
                    const pos = getPosition(pic);
                    if (!pos) continue;

                    const blip = pic.getElementsByTagName("a:blip")[0];
                    const embedId = blip?.getAttribute("r:embed");

                    if (embedId && relsMap[embedId]) {
                        // Resolve path
                        // Target is usually like "../media/image1.png" relative to ppt/slides/
                        // construct zip path: ppt/media/image1.png
                        let targetPath = relsMap[embedId];
                        if (targetPath.startsWith("../")) {
                            targetPath = targetPath.replace("../", "ppt/");
                        } else if (!targetPath.startsWith("ppt/")) {
                            targetPath = "ppt/slides/" + targetPath; // Shouldn't happen often for media
                        }

                        // Just in case it's cleaner in relative pathing
                        // ppt/slides/_rels/slide1.xml.rels -> Target="../media/image.png" -> ppt/media/image.png

                        const imgData = await zip.file(targetPath)?.async("uint8array");
                        if (imgData) {
                            try {
                                const isPng = targetPath.toLowerCase().endsWith(".png");
                                const isJpg = targetPath.toLowerCase().match(/\.(jpg|jpeg)$/);
                                let pdfImage;

                                if (isPng) pdfImage = await pdfDoc.embedPng(imgData);
                                else if (isJpg) pdfImage = await pdfDoc.embedJpg(imgData);

                                if (pdfImage) {
                                    // PDF coordinates are from bottom-left
                                    // PPT coordinates are from top-left
                                    // y in PDF = pageHeight - y_ppt - height_ppt
                                    page.drawImage(pdfImage, {
                                        x: pos.x,
                                        y: height - pos.y - pos.h,
                                        width: pos.w,
                                        height: pos.h,
                                    });
                                }
                            } catch (e) {
                                console.warn("Failed to embed image", targetPath, e);
                            }
                        }
                    }
                }

                // Draw Text Shapes
                // We iterate shapes looking for text body
                for (const sp of shapes) {
                    const pos = getPosition(sp);
                    if (!pos) continue;

                    const txBody = sp.getElementsByTagName("p:txBody")[0];
                    if (!txBody) continue;

                    const paragraphs = txBody.getElementsByTagName("a:p");

                    // Simple text rendering
                    // We need to accumulate text and approximate drawing
                    let currentY = height - pos.y - 12; // Start slightly below top of box
                    const startX = pos.x + 5; // Padding

                    for (let p = 0; p < paragraphs.length; p++) {
                        const runs = paragraphs[p].getElementsByTagName("a:r");
                        let lineText = "";

                        // Collect text for the paragraph (simplification: ignoring run styling changes within line)
                        for (let r = 0; r < runs.length; r++) {
                            const t = runs[r].getElementsByTagName("a:t")[0]?.textContent || "";
                            lineText += t;
                        }

                        if (lineText.trim()) {
                            // Basic wrapping
                            const fontSize = 11;
                            const maxWidth = pos.w - 10;
                            const words = lineText.split(""); // Char by char for better wrapping check? No words.
                            // Actually splitting by words is safer
                            const wordList = lineText.split(" ");
                            let currentLine = "";

                            for (const word of wordList) {
                                const testLine = currentLine ? currentLine + " " + word : word;
                                const width = font.widthOfTextAtSize(testLine, fontSize);
                                if (width < maxWidth) {
                                    currentLine = testLine;
                                } else {
                                    page.drawText(currentLine, {
                                        x: startX,
                                        y: currentY,
                                        size: fontSize,
                                        font,
                                        color: rgb(0, 0, 0),
                                        maxWidth: pos.w - 10
                                    });
                                    currentY -= (fontSize + 4);
                                    currentLine = word;
                                }
                            }
                            if (currentLine) {
                                page.drawText(currentLine, {
                                    x: startX,
                                    y: currentY,
                                    size: fontSize,
                                    font,
                                    color: rgb(0, 0, 0),
                                    maxWidth: pos.w - 10
                                });
                                currentY -= (fontSize + 4);
                            }
                        } else {
                            // Empty paragraph (newline)
                            currentY -= 14;
                        }
                    }
                }

                setProgress(Math.round(((i + 1) / slideFiles.length) * 100));
            }

            const pdfBytes = await pdfDoc.save();
            const pdfBlob = new Blob([pdfBytes as any], { type: "application/pdf" });
            const downloadUrl = URL.createObjectURL(pdfBlob);

            setResult({
                fileName: file.name.replace(/\.(pptx|ppt)$/i, ".pdf"),
                downloadUrl
            });

        } catch (error) {
            console.error("Conversion error:", error);
            alert("An error occurred during conversion. Please make sure the file is a valid .pptx");
        } finally {
            setIsProcessing(false);
            setProgress(0);
        }
    };

    const handleReset = () => {
        setFiles([]);
        setResult(null);
        setProgress(0);
    };

    const SettingsPanel = (
        <div className="flex flex-col h-full">
            <div className="bg-orange-50/50 rounded-2xl p-4 border border-orange-100 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Document Flow</span>
                    {files.length > 0 && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 uppercase tracking-tighter">Ready</span>}
                </div>
                <p className="text-xs font-bold text-zinc-500 leading-relaxed">
                    Convert your PowerPoint presentations into PDF documents for easy sharing and printing.
                </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm mb-8">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Features</h3>
                <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-xs font-bold text-zinc-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                        <span>Preserve text layout</span>
                    </li>
                    <li className="flex items-center gap-3 text-xs font-bold text-zinc-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                        <span>Embed images from slides</span>
                    </li>
                    <li className="flex items-center gap-3 text-xs font-bold text-zinc-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                        <span>Exact page dimensions</span>
                    </li>
                </ul>
            </div>

            <div className="mt-auto">
                <ProcessingButton
                    onClick={handleConvert}
                    isProcessing={isProcessing}
                    disabled={files.length === 0}
                    icon={FileSpreadsheet}
                    text="Convert to PDF"
                    processingText={`Generating PDF... ${progress > 0 ? `${progress}%` : ''}`}
                    bgColor="bg-orange-600"
                    className="shadow-orange-200"
                />
            </div>
        </div>
    );

    return (
        <ConversionLayout
            title="PowerPoint to PDF"
            description="Convert PowerPoint slides to PDF"
            settingsPanel={!result ? SettingsPanel : (
                <div className="h-full flex flex-col justify-center">
                    <DownloadResult
                        fileName={result.fileName}
                        downloadUrl={result.downloadUrl}
                        onReset={handleReset}
                        stats={[
                            { label: "Format", value: "PDF" },
                            { label: "Original", value: files[0]?.name || "" }
                        ]}
                    />
                </div>
            )}
        >
            {result ? (
                <div className="w-full h-full max-w-4xl">
                    <PreviewContent url={result.downloadUrl} fileName={result.fileName} />
                </div>
            ) : files.length > 0 ? (
                <div className="w-full h-full max-w-5xl flex flex-col p-4">
                    <div className="mb-6 flex justify-between items-center">
                        <div>
                            <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                <FileText size={14} className="text-zinc-300" />
                                Document Preview
                            </h2>
                            <p className="text-xs text-zinc-500 font-bold">{files[0].name} ({(files[0].size / 1024 / 1024).toFixed(2)} MB)</p>
                        </div>
                        <label className="text-xs font-black text-orange-600 hover:text-orange-700 cursor-pointer flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-xl transition-all active:scale-95">
                            <Plus size={14} />
                            <span>Replace</span>
                            <input type="file" accept=".pptx" onChange={handleFilesChange} className="hidden" />
                        </label>
                    </div>

                    <div className="flex-1 min-h-[500px] bg-white rounded-3xl overflow-hidden border border-zinc-200 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] relative group bg-zinc-50 flex items-center justify-center">
                        <div className="text-center">
                            <Presentation size={48} className="text-orange-300 mb-4 mx-auto" />
                            <p className="text-zinc-400 text-sm font-medium">Preview not available for PPTX</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center max-w-sm px-6">
                    <div className="w-24 h-24 bg-orange-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner group">
                        <Presentation className="text-orange-400 group-hover:scale-110 transition-transform duration-500" size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 mb-3 tracking-tight">PowerPoint to PDF</h3>
                    <p className="text-zinc-500 font-medium text-sm mb-8 leading-relaxed">
                        Convert your PowerPoint presentations into PDF documents quickly.
                    </p>
                    <label className="inline-flex items-center gap-3 px-8 py-4 bg-orange-600 text-white font-black rounded-2xl hover:bg-orange-700 cursor-pointer transition-all shadow-xl shadow-orange-200 active:scale-95 group">
                        <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span>Select PPTX File</span>
                        <input type="file" accept=".pptx" onChange={handleFilesChange} className="hidden" />
                    </label>
                </div>
            )}
        </ConversionLayout>
    );
}
