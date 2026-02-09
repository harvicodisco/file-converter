import { LucideIcon } from "lucide-react";

// Template generator for conversion pages
export function createConversionPage(config: {
  title: string;
  description: string;
  icon: LucideIcon;
  accept: string;
  supportedFormats: string;
  apiEndpoint: string;
  multiple?: boolean;
}) {
  return `"use client";

import { useState } from "react";
import { ${config.icon.name}, Plus, FileText } from "lucide-react";
import ConversionLayout from "@/components/ConversionLayout";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";
import PreviewContent from "@/components/PreviewContent";

export default function ConversionPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ fileName: string; downloadUrl: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files));
      setResult(null);
    }
  };

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

  const SettingsPanel = (
    <div className="flex flex-col h-full">
      <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Files</span>
          <span className="text-sm font-black text-zinc-800">{files.length}</span>
        </div>
      </div>

      <div className="mt-auto">
        <ProcessingButton
          onClick={handleConvert}
          isProcessing={isProcessing}
          disabled={files.length === 0}
          icon={${config.icon.name}}
          text="Convert Now"
          processingText="Converting..."
          bgColor="bg-zinc-900"
        />
      </div>
    </div>
  );

  return (
    <ConversionLayout
      title="${config.title}"
      description="${config.description}"
      settingsPanel={!result ? SettingsPanel : (
        <div className="h-full flex flex-col justify-center">
          <DownloadResult
            fileName={result.fileName}
            downloadUrl={result.downloadUrl}
            onReset={handleReset}
            stats={[
              { label: "Files", value: files.length.toString() },
              { label: "Format", value: "PDF" }
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
        <div className="w-full h-full max-w-2xl p-8">
            <div className="grid grid-cols-2 gap-4">
                {files.map((file, i) => (
                    <div key={i} className="p-4 bg-white rounded-2xl border border-zinc-100 shadow-sm flex items-center gap-3">
                        <FileText size={20} className="text-zinc-400" />
                        <span className="text-sm font-bold truncate">{file.name}</span>
                    </div>
                ))}
            </div>
        </div>
      ) : (
        <div className="text-center max-w-sm px-6">
          <div className="w-24 h-24 bg-zinc-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner group">
            <${config.icon.name} className="text-zinc-400 group-hover:scale-110 transition-transform duration-500" size={48} />
          </div>
          <h3 className="text-2xl font-black text-zinc-900 mb-3 tracking-tight">${config.title}</h3>
          <p className="text-zinc-500 font-medium text-sm mb-8 leading-relaxed">
            ${config.description}
          </p>
          <label className="inline-flex items-center gap-3 px-8 py-4 bg-zinc-900 text-white font-black rounded-2xl hover:bg-zinc-800 cursor-pointer transition-all shadow-xl shadow-zinc-200 active:scale-95 group">
            <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" />
            <span>Select Files</span>
            <input
              type="file"
              accept="${config.accept}"
              multiple={${config.multiple || false}}
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      )}
    </ConversionLayout>
  );
}
`;
}
