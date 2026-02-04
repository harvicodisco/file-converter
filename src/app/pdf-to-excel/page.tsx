"use client";

import { useState } from "react";
import { Sheet } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";

export default function PDFToExcel() {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<{ fileName: string; downloadUrl: string } | null>(null);

    const handleConvert = async () => {
        if (files.length === 0) return;

        setIsProcessing(true);
        const formData = new FormData();
        formData.append("file", files[0]);

        try {
            const response = await fetch("/api/pdf-to-excel", {
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
            setIsProcessing(false);
        }
    };

    const handleReset = () => {
        setFiles([]);
        setResult(null);
    };

    return (
        <PageLayout
            title="PDF to Excel"
            description="Extract tables and data from PDF to Excel format"
        >
            <div className="space-y-6 max-w-3xl mx-auto">
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
                                isProcessing={isProcessing}
                                icon={Sheet}
                                text="Convert to Excel"
                                processingText="Converting..."
                                gradient="from-green-600 to-green-400"
                            />
                        )}
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
