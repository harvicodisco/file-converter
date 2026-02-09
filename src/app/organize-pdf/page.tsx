"use client";

import { useState, useRef } from "react";
import {
    Settings,
    Trash2,
    RotateCw,
    GripVertical,
    Plus,
    FileText,
    Check
} from "lucide-react";
import ConversionLayout from "@/components/ConversionLayout";
import ProcessingButton from "@/components/ProcessingButton";
import DownloadResult from "@/components/DownloadResult";
import PreviewContent from "@/components/PreviewContent";
import { AnimatePresence, motion } from "framer-motion";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToFirstScrollableAncestor } from '@dnd-kit/modifiers';
// import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, degrees } from 'pdf-lib';

// Separate interface for the pdfjsLib type if needed, or use any for now
// pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface PageData {
    id: string;
    originalIndex: number;
    rotation: number;
    thumbnailUrl: string;
}

export default function OrganizePDF() {
    const [file, setFile] = useState<File | null>(null);
    const [pages, setPages] = useState<PageData[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoadingPages, setIsLoadingPages] = useState(false);
    const [result, setResult] = useState<{ fileName: string; downloadUrl: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.type === "application/pdf") {
            setFile(selectedFile);
            loadPDFPages(selectedFile);
        }
    };

    const loadPDFPages = async (pdfFile: File) => {
        setIsLoadingPages(true);
        setPages([]);
        try {
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

            const arrayBuffer = await pdfFile.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;

            const loadedPages: PageData[] = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 0.5 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');

                if (context) {
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    await page.render({
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        canvasContext: context as any,
                        viewport: viewport,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        canvas: canvas as any
                    }).promise;

                    loadedPages.push({
                        id: `page-${i}-${Date.now()}`,
                        originalIndex: i - 1,
                        rotation: 0,
                        thumbnailUrl: canvas.toDataURL()
                    });
                }
            }

            setPages(loadedPages);
        } catch (error) {
            console.error("Error loading PDF pages:", error);
            alert("Failed to load PDF pages");
        } finally {
            setIsLoadingPages(false);
        }
    };

    const rotatePage = (id: string) => {
        setPages(prev => prev.map(p =>
            p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p
        ));
    };

    const deletePage = (id: string) => {
        setPages(prev => prev.filter(p => p.id !== id));
    };

    const handleOrganize = async () => {
        if (!file || pages.length === 0) return;

        setIsProcessing(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const sourceDoc = await PDFDocument.load(arrayBuffer);
            const newDoc = await PDFDocument.create();

            for (const pageInfo of pages) {
                const [copiedPage] = await newDoc.copyPages(sourceDoc, [pageInfo.originalIndex]);

                // Set rotation
                // pdf-lib degrees are clockwise, the same as our state
                if (pageInfo.rotation !== 0) {
                    const currentRotation = copiedPage.getRotation().angle;
                    copiedPage.setRotation(degrees((currentRotation + pageInfo.rotation) % 360));
                }

                newDoc.addPage(copiedPage);
            }

            const pdfBytes = await newDoc.save();
            const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);

            setResult({
                fileName: `organized_${file.name}`,
                downloadUrl: url,
            });
        } catch (error) {
            console.error("Organization error:", error);
            alert("An error occurred during organization");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setPages([]);
        setResult(null);
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setPages((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);

                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const SettingsPanel = (
        <div className="flex flex-col h-full">
            <div className="bg-purple-50/50 rounded-2xl p-4 border border-purple-100 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Total Pages</span>
                    <span className="text-sm font-black text-purple-600 bg-white px-2 py-1 rounded-lg shadow-sm">{pages.length}</span>
                </div>
                {pages.length > 0 ? (
                    <div className="flex items-center gap-2 text-purple-600 text-xs font-bold bg-white p-2 rounded-xl border border-purple-100 shadow-sm">
                        <Check size={14} className="text-purple-500" />
                        Structure identified
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold bg-white p-2 rounded-xl border border-zinc-100 italic">
                        No pages loaded
                    </div>
                )}
            </div>

            <div className="space-y-4 mb-6 px-1">
                <p className="text-xs font-bold text-zinc-500 leading-relaxed">
                    Drag pages to reorder them. Use the controls on each page thumbnail to rotate or remove them.
                </p>
            </div>

            <div className="mt-auto">
                <ProcessingButton
                    onClick={handleOrganize}
                    isProcessing={isProcessing}
                    disabled={pages.length === 0}
                    icon={Settings}
                    text="Organize & Save"
                    processingText="Generating PDF..."
                    bgColor="bg-purple-600"
                    className="shadow-purple-200"
                />
            </div>
        </div>
    );

    return (
        <ConversionLayout
            title="Organize PDF"
            description="Rearrange, rotate, or delete pages in your PDF document"
            settingsPanel={!result ? SettingsPanel : (
                <div className="h-full flex flex-col justify-center">
                    <DownloadResult
                        fileName={result.fileName}
                        downloadUrl={result.downloadUrl}
                        onReset={handleReset}
                        stats={[
                            { label: "Pages", value: pages.length.toString() },
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
            ) : !file ? (
                <div className="text-center max-w-sm px-6">
                    <div className="w-24 h-24 bg-purple-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner group">
                        <FileText className="text-purple-400 group-hover:scale-110 transition-transform duration-500" size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 mb-3 tracking-tight">Organize PDF</h3>
                    <p className="text-zinc-500 font-medium text-sm mb-8 leading-relaxed">
                        View all pages in your PDF. Drag to reorder, rotate individual pages, or delete ones you don't need.
                    </p>
                    <label className="inline-flex items-center gap-3 px-8 py-4 bg-purple-600 text-white font-black rounded-2xl hover:bg-purple-700 cursor-pointer transition-all shadow-xl shadow-purple-200 active:scale-95 group">
                        <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span>Select PDF File</span>
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className="hidden"
                            ref={fileInputRef}
                        />
                    </label>
                </div>
            ) : isLoadingPages ? (
                <div className="flex flex-col items-center gap-6">
                    <div className="relative w-20 h-20">
                        <div className="absolute inset-0 border-4 border-purple-100 rounded-full" />
                        <div className="absolute inset-0 border-4 border-t-purple-600 rounded-full animate-spin" />
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-black text-zinc-900 mb-1">Loading Pages...</p>
                        <p className="text-zinc-400 font-bold text-sm">Extracting document structure</p>
                    </div>
                </div>
            ) : (
                <div className="w-full h-full p-6 flex flex-col">
                    <div className="mb-6 flex justify-between items-center max-w-6xl w-full mx-auto">
                        <div>
                            <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                <FileText size={14} className="text-zinc-300" />
                                Page Organizer
                            </h2>
                            <p className="text-xs text-zinc-500 font-bold">{pages.length} pages extracted from {file.name}</p>
                        </div>
                        <label className="text-xs font-black text-purple-600 hover:text-purple-700 cursor-pointer flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-xl transition-all active:scale-95">
                            <Plus size={14} />
                            <span>Replace File</span>
                            <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                        </label>
                    </div>

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                        modifiers={[restrictToFirstScrollableAncestor]}
                    >
                        <SortableContext
                            items={pages.map(p => p.id)}
                            strategy={rectSortingStrategy}
                        >
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {pages.map((page) => (
                                    <SortableItem
                                        key={page.id}
                                        page={page}
                                        pages={pages}
                                        rotatePage={rotatePage}
                                        deletePage={deletePage}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>
            )}
        </ConversionLayout>
    );
}

function SortableItem({ page, pages, rotatePage, deletePage }: {
    page: PageData;
    pages: PageData[];
    rotatePage: (id: string) => void;
    deletePage: (id: string) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: page.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="relative group touch-none"
        >
            <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative aspect-[1/1.414] bg-white rounded-2xl border-2 border-zinc-100 shadow-sm group-hover:border-purple-300 group-hover:shadow-lg transition-all overflow-hidden flex flex-col"
            >
                {/* Thumbnail Container */}
                <div
                    {...attributes}
                    {...listeners}
                    className="flex-1 relative overflow-hidden bg-zinc-50 p-2 cursor-grab active:cursor-grabbing"
                >
                    <div
                        className="w-full h-full bg-center bg-contain bg-no-repeat transition-transform duration-300 pointer-events-none"
                        style={{
                            backgroundImage: `url(${page.thumbnailUrl})`,
                            transform: `rotate(${page.rotation}deg)`
                        }}
                    />

                    {/* Page Number Badge */}
                    <div className="absolute top-2 left-2 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-[10px] font-black text-zinc-600 shadow-sm border border-zinc-100">
                        PAGE {pages.indexOf(page) + 1}
                    </div>

                    {/* Selection Overlay (if added) */}
                    <div className="absolute inset-0 bg-purple-600/0 group-hover:bg-purple-600/5 transition-colors duration-300" />
                </div>

                {/* Actions Footer */}
                <div className="h-12 bg-white border-t border-zinc-100 flex items-center justify-between px-3">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                rotatePage(page.id);
                            }}
                            className="p-1.5 text-zinc-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer z-10"
                            title="Rotate page"
                        >
                            <RotateCw size={16} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                deletePage(page.id);
                            }}
                            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer z-10"
                            title="Delete page"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                    <div className="text-zinc-300 pointer-events-none">
                        <GripVertical size={16} />
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
