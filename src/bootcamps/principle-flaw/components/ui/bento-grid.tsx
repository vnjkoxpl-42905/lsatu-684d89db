"use client";

import { cn } from "../../lib/utils";
import {
    CheckCircle,
    TrendingUp,
    Video,
    Globe,
    Target,
    Zap,
    BookOpen,
    Search
} from "lucide-react";
import React from 'react';

export interface BentoItem {
    title: string;
    description: string;
    icon: React.ReactNode;
    status?: string;
    tags?: string[];
    meta?: string;
    cta?: string;
    colSpan?: number;
    hasPersistentHover?: boolean;
    className?: string;
}

interface BentoGridProps {
    items: BentoItem[];
}

function BentoGrid({ items }: BentoGridProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 max-w-7xl mx-auto">
            {items.map((item, index) => (
                <div
                    key={index}
                    className={cn(
                        "group relative p-6 rounded-2xl overflow-hidden transition-all duration-500",
                        "border border-white/5 bg-zinc-900/40",
                        "hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:border-white/10",
                        "hover:-translate-y-1 transform-gpu",
                        item.colSpan || "col-span-1",
                        item.colSpan === 2 ? "md:col-span-2" : "",
                        item.className,
                        {
                            "shadow-[0_2px_12px_rgba(255,255,255,0.03)] -translate-y-0.5 border-white/10":
                                item.hasPersistentHover,
                        }
                    )}
                >
                    <div
                        className={`absolute inset-0 ${
                            item.hasPersistentHover
                                ? "opacity-100"
                                : "opacity-0 group-hover:opacity-100"
                        } transition-opacity duration-500 pointer-events-none`}
                    >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:8px_8px]" />
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent" />
                    </div>

                    <div className="relative flex flex-col h-full justify-between space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 group-hover:scale-110 transition-transform duration-500">
                                {item.icon}
                            </div>
                            {item.status && (
                                <span
                                    className={cn(
                                        "text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full",
                                        "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                                        "transition-colors duration-300 group-hover:bg-emerald-500/20"
                                    )}
                                >
                                    {item.status}
                                </span>
                            )}
                        </div>

                        <div className="space-y-2 mt-4">
                            <h3 className="font-serif italic text-xl text-zinc-100 tracking-tight">
                                {item.title}
                                {item.meta && (
                                    <span className="ml-3 text-[10px] uppercase tracking-widest text-zinc-500 font-sans font-bold">
                                        {item.meta}
                                    </span>
                                )}
                            </h3>
                            <p className="text-sm text-zinc-400 leading-relaxed font-light">
                                {item.description}
                            </p>
                        </div>

                        <div className="flex items-center justify-between mt-6">
                            <div className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                {item.tags?.map((tag, i) => (
                                    <span
                                        key={i}
                                        className="px-2 py-1 rounded-md bg-white/5 border border-white/5 transition-all duration-300 hover:border-white/10 hover:text-zinc-300"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                                {item.cta || "View Details →"}
                            </span>
                        </div>
                    </div>

                    <div
                        className={`absolute inset-0 -z-10 rounded-2xl p-px bg-gradient-to-br from-transparent via-white/10 to-transparent ${
                            item.hasPersistentHover
                                ? "opacity-100"
                                : "opacity-0 group-hover:opacity-100"
                        } transition-opacity duration-500`}
                    />
                </div>
            ))}
        </div>
    );
}

export { BentoGrid }
