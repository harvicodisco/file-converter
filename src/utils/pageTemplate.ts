// Template generator for conversion pages
export function createConversionPage(config: {
    title: string;
    description: string;
    icon: any;
    gradient: string;
    accept: string;
    supportedFormats: string;
    apiEndpoint: string;
    multiple?: boolean;
}) {
    return `"use client";

import { useState } from "react";
import { ${config.icon.name} } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";

export default function ConversionPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ fileName: string; downloadUrl: string } | null>(null);

  const handleConvert = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    const formData = new FormData();
    ${config.multiple ? 'files.forEach((file) => formData.append("files", file));' : 'formData.append("file", files[0]);'}

    try {
      const response = await fetch("${config.apiEndpoint}", {
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
      title="${config.title}"
      description="${config.description}"
    >
      <div className="space-y-6 max-w-3xl mx-auto">
        {!result ? (
          <>
            <FileUpload
              files={files}
              onFilesChange={setFiles}
              accept="${config.accept}"
              multiple={${config.multiple || false}}
              supportedFormats="${config.supportedFormats}"
            />

            {files.length > 0 && (
              <ProcessingButton
                onClick={handleConvert}
                isProcessing={isProcessing}
                icon={${config.icon.name}}
                text="Convert Now"
                processingText="Converting..."
                gradient="${config.gradient}"
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
}`;
}
