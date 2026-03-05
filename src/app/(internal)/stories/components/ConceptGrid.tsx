"use client";

import React from "react";
import { StoryPreview } from "./StoryPreview";
import { type StoryPayload } from "@/social-factory/schema/types";
import { Button } from "@/components/ui/button";
import { Sparkles, Check } from "lucide-react";

interface ConceptGridProps {
    concepts: StoryPayload[];
    onSelect: (payload: StoryPayload) => void;
    isLoading?: boolean;
}

export const ConceptGrid = ({ concepts, onSelect, isLoading }: ConceptGridProps) => {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 animate-pulse">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex flex-col gap-4">
                        <div className="aspect-[9/16] bg-muted rounded-2xl w-full" />
                        <div className="h-10 bg-muted rounded-lg w-full" />
                    </div>
                ))}
            </div>
        );
    }

    if (concepts.length === 0) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-xl font-bold text-foreground">
                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                <h2>Generated Concepts</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {concepts.map((concept, index) => (
                    <div key={index} className="flex flex-col gap-4 group">
                        <div className="relative overflow-hidden rounded-2xl border border-border/50 transition-all hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10">
                            <StoryPreview payload={concept} showSafeZones={false} />

                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                <Button
                                    size="sm"
                                    onClick={() => onSelect(concept)}
                                    className="gap-2 shadow-xl"
                                >
                                    <Check className="w-4 h-4" />
                                    Select This
                                </Button>
                            </div>
                        </div>
                        <div className="text-center">
                            <span className="text-xs font-medium uppercase tracking-widest opacity-50">
                                {concept.templateId}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
