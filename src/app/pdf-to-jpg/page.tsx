"use client";

import { useState } from "react";
import { Image as ImageIcon, FileText, Download, RefreshCcw } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";
import TrustBadges from "@/components/TrustBadges";
import JSZip from "jszip";

export default function PDFToJPG() {
    const [files, setFiles] = useState<File[]>([]);
    const [isConverting, setIsConverting] = useState(false);
    const [result, setResult] = useState<{ fileName: string; downloadUrl: string; stats?: { label: string; value: string }[] } | null>(null);

    const handleConvert = async () => {
        if (files.length === 0) return;

        setIsConverting(true);
        try {
            const file = files[0];
            const arrayBuffer = await file.arrayBuffer();

            // Dynamic import for pdfjs-dist to avoid SSR issues
            const pdfjsLib = await import('pdfjs-dist');

            // Set worker using unpkg CDN for simplicity in Next.js
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;

            const zip = new JSZip();
            const totalPages = pdf.numPages;

            for (let i = 1; i <= totalPages; i++) {
                const page = await pdf.getPage(i);

                // Use a scale of 2 for better image quality
                const viewport = page.getViewport({ scale: 2.0 });

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                if (!context) continue;

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    canvasContext: context as any,
                    viewport: viewport,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    canvas: canvas as any
                }).promise;

                const blob = await new Promise<Blob | null>((resolve) => {
                    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9);
                });

                if (blob) {
                    zip.file(`page-${i}.jpg`, blob);
                }
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const downloadUrl = URL.createObjectURL(zipBlob);

            setResult({
                fileName: `${file.name.replace('.pdf', '')}_images.zip`,
                downloadUrl: downloadUrl,
                stats: [
                    { label: "Total Pages", value: totalPages.toString() },
                    { label: "Format", value: "JPG" },
                    { label: "Output", value: "ZIP Archive" }
                ]
            });
        } catch (error) {
            console.error("Conversion error:", error);
            alert("An error occurred during conversion. Please make sure the PDF is not password protected.");
        } finally {
            setIsConverting(false);
        }
    };

    const handleReset = () => {
        setFiles([]);
        setResult(null);
    };

    return (
        <PageLayout
            title="PDF to JPG"
            description="Turn pages from your PDF into high-quality JPG images"
        >
            <div className="space-y-8 max-w-4xl mx-auto">
                {!result ? (
                    <>
                        <FileUpload
                            files={files}
                            onFilesChange={setFiles}
                            accept=".pdf"
                            multiple={false}
                            supportedFormats="PDF files"
                        />

                        {files.length > 0 && (
                            <ProcessingButton
                                onClick={handleConvert}
                                isProcessing={isConverting}
                                icon={ImageIcon}
                                text="Convert to JPG"
                                processingText="Extracting Images..."
                                bgColor="bg-indigo-600"
                            />
                        )}

                        <TrustBadges
                            steps={[
                                { icon: FileText, title: "Upload PDF" },
                                { icon: RefreshCcw, title: "Convert to JPG" },
                                { icon: Download, title: "Download Images" },
                            ]}
                        />
                    </>
                ) : (
                    <DownloadResult
                        fileName={result.fileName}
                        downloadUrl={result.downloadUrl}
                        onReset={handleReset}
                        stats={result.stats}
                    />
                )}
            </div>
        </PageLayout>
    );
}
