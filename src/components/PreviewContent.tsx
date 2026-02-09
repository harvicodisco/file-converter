"use client";

import { FileText, Image as ImageIcon, FileQuestion } from "lucide-react";

interface PreviewContentProps {
    url: string;
    fileName: string;
    fileType?: string;
}

export default function PreviewContent({ url, fileName, fileType }: PreviewContentProps) {
    // Determine file type from extension if not provided
    const extension = fileName.split('.').pop()?.toLowerCase();
    const type = fileType || (
        ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '') ? 'image' :
            extension === 'pdf' ? 'pdf' : 'other'
    );

    if (type === 'pdf') {
        return (
            <div className="w-full h-full min-h-[500px] bg-zinc-100 rounded-2xl overflow-hidden border border-zinc-200 shadow-inner">
                <iframe
                    src={`${url}#toolbar=0`}
                    className="w-full h-full border-none"
                    title="PDF Preview"
                />
            </div>
        );
    }

    if (type === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
        return (
            <div className="w-full h-full flex items-center justify-center p-4 bg-zinc-50 rounded-2xl border border-zinc-200 shadow-inner min-h-[400px]">
                <img
                    src={url}
                    alt={fileName}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                />
            </div>
        );
    }

    // Default for word, excel, ppt where we can't show a live preview easily without specific libs
    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-12 bg-zinc-50 rounded-2xl border border-zinc-200 shadow-inner min-h-[400px]">
            <div className="w-24 h-24 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6 text-indigo-400">
                {extension === 'docx' || extension === 'doc' ? <FileText size={48} /> :
                    ['xlsx', 'xls', 'csv'].includes(extension || '') ? <FileText size={48} className="text-emerald-500" /> :
                        ['pptx', 'ppt'].includes(extension || '') ? <FileText size={48} className="text-orange-500" /> :
                            <FileQuestion size={48} />}
            </div>
            <h3 className="text-xl font-black text-zinc-900 mb-2">Ready for Download</h3>
            <p className="text-zinc-500 font-bold text-center max-w-xs uppercase text-[10px] tracking-widest">
                Preview not available for {extension?.toUpperCase()} files
            </p>
        </div>
    );
}
