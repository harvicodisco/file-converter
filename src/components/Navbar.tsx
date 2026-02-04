"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { FileText, Merge, Scissors, Minimize2 } from "lucide-react";

export const metadata = {
    title: "Universal Converter | Professional File Tools",
    description: "Comprehensive file tools to manage, convert, and optimize your documents with ease.",
};

const navItems = [
    { name: "Home", href: "/", icon: FileText },
    { name: "Merge PDF", href: "/merge-pdf", icon: Merge },
    { name: "Split PDF", href: "/split-pdf", icon: Scissors },
    { name: "Compress PDF", href: "/compress-pdf", icon: Minimize2 },
];

export default function Navbar() {
    const pathname = usePathname();

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-900/80 backdrop-blur-xl border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-2 group">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <FileText className="text-white" size={24} />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                            Universal Converter
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className="relative px-4 py-2 rounded-lg transition-colors duration-200 group"
                                >
                                    <div className="flex items-center space-x-2">
                                        <Icon
                                            size={18}
                                            className={`transition-colors ${isActive
                                                ? "text-purple-400"
                                                : "text-zinc-400 group-hover:text-white"
                                                }`}
                                        />
                                        <span
                                            className={`font-medium transition-colors ${isActive
                                                ? "text-white"
                                                : "text-zinc-400 group-hover:text-white"
                                                }`}
                                        >
                                            {item.name}
                                        </span>
                                    </div>

                                    {isActive && (
                                        <motion.div
                                            layoutId="navbar-indicator"
                                            className="absolute inset-0 bg-white/5 rounded-lg border border-white/10"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Mobile Navigation */}
                    <div className="md:hidden flex items-center space-x-2">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className="relative p-2 rounded-lg transition-colors duration-200"
                                >
                                    <Icon
                                        size={20}
                                        className={`transition-colors ${isActive
                                            ? "text-purple-400"
                                            : "text-zinc-400 hover:text-white"
                                            }`}
                                    />
                                    {isActive && (
                                        <motion.div
                                            layoutId="navbar-indicator-mobile"
                                            className="absolute inset-0 bg-white/5 rounded-lg border border-white/10"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </nav>
    );
}
