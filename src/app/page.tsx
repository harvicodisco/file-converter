"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Merge, Scissors, Minimize2, ArrowRight } from "lucide-react";
import PageLayout from "@/components/PageLayout";

const tools = [
  {
    name: "Merge PDF",
    description: "Combine multiple PDF files into a single document",
    icon: Merge,
    href: "/merge-pdf",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    name: "Split PDF",
    description: "Extract specific pages or split PDF into multiple files",
    icon: Scissors,
    href: "/split-pdf",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    name: "Compress PDF",
    description: "Reduce PDF file size without losing quality",
    icon: Minimize2,
    href: "/compress-pdf",
    gradient: "from-green-500 to-emerald-500",
  },
];

export default function Home() {
  return (
    <PageLayout
      title="Universal Converter"
      description="Professional tools to manage your files with ease"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool, index) => {
          const Icon = tool.icon;

          return (
            <motion.div
              key={tool.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link href={tool.href} className="block group">
                <div className="relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>

                  <div className="relative bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-6 rounded-2xl hover:border-white/20 transition-all duration-300">
                    <div className={`w-14 h-14 bg-gradient-to-br ${tool.gradient} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="text-white" size={28} />
                    </div>

                    <h3 className="text-xl font-bold mb-2 text-white group-hover:text-purple-400 transition-colors">
                      {tool.name}
                    </h3>

                    <p className="text-zinc-400 text-sm mb-4">
                      {tool.description}
                    </p>

                    <div className="flex items-center text-purple-400 text-sm font-medium group-hover:gap-2 gap-1 transition-all">
                      Get Started
                      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Features Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-16 text-center"
      >
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl blur opacity-20"></div>

          <div className="relative bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-8 rounded-2xl">
            <h2 className="text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
              Why Choose Universal Converter?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div>
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mb-3">
                  <span className="text-2xl">🚀</span>
                </div>
                <h3 className="font-semibold mb-2">Fast Processing</h3>
                <p className="text-sm text-zinc-400">
                  Lightning-fast file operations with optimized algorithms
                </p>
              </div>

              <div>
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mb-3">
                  <span className="text-2xl">🔒</span>
                </div>
                <h3 className="font-semibold mb-2">Secure & Private</h3>
                <p className="text-sm text-zinc-400">
                  Your files are processed securely and never stored
                </p>
              </div>

              <div>
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center mb-3">
                  <span className="text-2xl">✨</span>
                </div>
                <h3 className="font-semibold mb-2">Easy to Use</h3>
                <p className="text-sm text-zinc-400">
                  Simple, intuitive interface for all your file needs
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </PageLayout>
  );
}
