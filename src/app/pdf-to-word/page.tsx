"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";

export default function PDFToWord() {
    const [files, setFiles] = useState<File[]>([]);
    const [isConverting, setIsConverting] = useState(false);
    const [result, setResult] = useState<{ fileName: string; downloadUrl: string } | null>(null);

    const handleConvert = async () => {
        if (files.length === 0) return;

        setIsConverting(true);
        const formData = new FormData();
        formData.append("file", files[0]);

        try {
            const response = await fetch("/api/pdf-to-word", {
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
            title="PDF to Word"
            description="Convert PDF files to editable Microsoft Word documents instantly"
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
                                icon={FileText}
                                text="Convert to Word"
                                processingText="Converting..."
                                bgColor="bg-indigo-600"
                            />
                        )}

                        <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-xl shadow-zinc-200/50">
                            <h3 className="text-lg font-black text-zinc-900 mb-4">How it works:</h3>
                            <ol className="space-y-4 font-bold text-zinc-500">
                                <li className="flex gap-4">
                                    <span className="text-indigo-600">1.</span>
                                    <span>Upload the PDF document you wish to edit.</span>
                                </li>
                                <li className="flex gap-4">
                                    <span className="text-indigo-600">2.</span>
                                    <span>UniversalConvert will analyze the structure and preserve formatting.</span>
                                </li>
                                <li className="flex gap-4">
                                    <span className="text-indigo-600">3.</span>
                                    <span>Download and open your new .docx file in Word.</span>
                                </li>
                            </ol>
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
