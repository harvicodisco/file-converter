"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FileText,
    Merge,
    Scissors,
    Minimize2,
    Sheet,
    Presentation,
    Image as ImageIcon,
    FileImage,
    FileSpreadsheet,
    ChevronDown,
    Home,
    Settings,
    Crop,
    Scan,
    Hash,
    Wrench,
    Eraser
} from "lucide-react";



export default function Navbar() {
    const pathname = usePathname();
    const [isToolsOpen, setIsToolsOpen] = useState(false);

    const toolCategories = [
        {
            title: "PDF Tools",
            tools: [
                { name: "Merge PDF", href: "/merge-pdf", icon: Merge },
                { name: "Split PDF", href: "/split-pdf", icon: Scissors },
                { name: "Organize PDF", href: "/organize-pdf", icon: Settings },
                { name: "Crop PDF", href: "/crop-pdf", icon: Crop },
                { name: "Compress PDF", href: "/compress-pdf", icon: Minimize2 },
                { name: "OCR PDF", href: "/ocr-pdf", icon: Scan },
                { name: "Add Page Numbers", href: "/add-page-numbers", icon: Hash },
                { name: "Repair PDF", href: "/repair-pdf", icon: Wrench },
                { name: "Redact PDF", href: "/redact-pdf", icon: Eraser },
            ]
        },
        {
            title: "Convert from PDF",
            tools: [
                { name: "PDF to Word", href: "/pdf-to-word", icon: FileText },
                { name: "PDF to Excel", href: "/pdf-to-excel", icon: Sheet },
                { name: "PDF to PowerPoint", href: "/pdf-to-ppt", icon: Presentation },
                { name: "PDF to JPG", href: "/pdf-to-jpg", icon: ImageIcon },
            ]
        },
        {
            title: "Convert to PDF",
            tools: [
                { name: "Image to PDF", href: "/image-to-pdf", icon: FileImage },
                { name: "Office to PDF", href: "/office-to-pdf", icon: FileSpreadsheet },
                { name: "HTML to PDF", href: "/html-to-pdf", icon: FileSpreadsheet },
            ]
        }
    ];

    const allTools = toolCategories.flatMap(cat => cat.tools);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-200">
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-indigo-200">
                            <FileText className="text-white" size={20} />
                        </div>
                        <span className="text-xl font-bold text-zinc-900 tracking-tight">
                            UniversalConvert
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-1">
                        <Link
                            href="/"
                            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${pathname === "/"
                                ? "bg-indigo-50 text-indigo-600"
                                : "text-zinc-600 hover:text-indigo-600 hover:bg-zinc-100"
                                }`}
                        >
                            <Home size={18} />
                            Home
                        </Link>

                        {/* Tools Dropdown */}
                        <div
                            className="relative"
                            onMouseEnter={() => setIsToolsOpen(true)}
                            onMouseLeave={() => setIsToolsOpen(false)}
                        >
                            <button
                                onClick={() => setIsToolsOpen(!isToolsOpen)}
                                className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 text-zinc-600 hover:text-indigo-600 hover:bg-zinc-100 cursor-pointer"
                            >
                                <FileText size={18} />
                                All Tools
                                <ChevronDown
                                    size={16}
                                    className={`transition-transform duration-300 ${isToolsOpen ? "rotate-180" : ""}`}
                                />
                            </button>

                            <AnimatePresence>
                                {isToolsOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute top-full right-0 mt-2 w-[600px] lg:w-[800px] bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden shadow-zinc-200/50 p-6 z-50"
                                    >
                                        <div className="grid grid-cols-3 gap-8">
                                            {toolCategories.map((category) => (
                                                <div key={category.title} className="flex flex-col gap-2">
                                                    <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 border-b border-zinc-100 pb-2">
                                                        {category.title}
                                                    </div>
                                                    {category.tools.map((tool) => {
                                                        const Icon = tool.icon;
                                                        return (
                                                            <Link
                                                                key={tool.href}
                                                                href={tool.href}
                                                                onClick={() => setIsToolsOpen(false)}
                                                                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${pathname === tool.href
                                                                    ? "bg-indigo-50 text-indigo-600"
                                                                    : "text-zinc-700 hover:bg-zinc-50 hover:text-indigo-600"
                                                                    }`}
                                                            >
                                                                <Icon size={18} className={pathname === tool.href ? "text-indigo-600" : "text-zinc-400"} />
                                                                <span className="text-sm font-medium">{tool.name}</span>
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsToolsOpen(!isToolsOpen)}
                        className="md:hidden p-2 rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors cursor-pointer"
                    >
                        <FileText size={20} />
                    </button>
                </div>

                {/* Mobile Menu */}
                <AnimatePresence>
                    {isToolsOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="md:hidden mt-4 pt-4 border-t border-zinc-100"
                        >
                            <div className="space-y-1">
                                <Link
                                    href="/"
                                    onClick={() => setIsToolsOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${pathname === "/"
                                        ? "bg-indigo-50 text-indigo-600"
                                        : "text-zinc-700 hover:bg-zinc-50"
                                        }`}
                                >
                                    <Home size={18} />
                                    <span className="text-sm font-medium">Home</span>
                                </Link>
                                {allTools.map((tool) => {
                                    const Icon = tool.icon;
                                    return (
                                        <Link
                                            key={tool.href}
                                            href={tool.href}
                                            onClick={() => setIsToolsOpen(false)}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${pathname === tool.href
                                                ? "bg-indigo-50 text-indigo-600"
                                                : "text-zinc-700 hover:bg-zinc-50"
                                                }`}
                                        >
                                            <Icon size={18} />
                                            <span className="text-sm font-medium">{tool.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </nav>
    );
}
