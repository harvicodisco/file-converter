"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";

export default function PDFToPDFA() {
    const [files, setFiles] = useState<File[]>([]);
    const [isConverting, setIsConverting] = useState(false);
    const [result, setResult] = useState<{ fileName: string; downloadUrl: string } | null>(null);

    const handleConvert = async () => {
        if (files.length === 0) return;

        setIsConverting(true);
        const formData = new FormData();
        formData.append("file", files[0]);

        try {
            const response = await fetch("/api/pdf-to-pdfa", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                setResult(data);
            } else {
                alert("Conversion failed");
            }
        } catch (error) {
            console.error(error);
            alert("An error occurred");
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
            title="PDF to PDF/A"
            description="Archive your documents with the PDF/A standard for long-term preservation"
        >
            <div className="space-y-8 max-w-3xl mx-auto">
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
                                icon={CheckCircle2}
                                text="Convert to PDF/A"
                                processingText="Archiving..."
                                bgColor="bg-slate-600"
                            />
                        )}

                        <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-xl shadow-zinc-100/50">
                            <h3 className="font-black text-lg mb-4">Why use PDF/A?</h3>
                            <ul className="space-y-3 font-bold text-zinc-500">
                                <li className="flex gap-4">
                                    <span className="text-slate-500">•</span>
                                    <span>Ensures documents can be opened and read in the future.</span>
                                </li>
                                <li className="flex gap-4">
                                    <span className="text-slate-500">•</span>
                                    <span>Standardizes fonts and color profiles within the file.</span>
                                </li>
                                <li className="flex gap-4">
                                    <span className="text-slate-500">•</span>
                                    <span>Removes dynamic content that may expire or change.</span>
                                </li>
                            </ul>
                        </div>
                    </>
                ) : (
                    <DownloadResult
                        fileName={result.fileName}
                        downloadUrl={result.downloadUrl}
                        onReset={handleReset}
                    />
                )}
            </div>
        </PageLayout>
    );
}
