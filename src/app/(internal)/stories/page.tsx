"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { StoryPreview } from "./components/StoryPreview";
import { type StoryPayload, type QuoteProps, type AnnouncementProps, type ChecklistProps } from "@/social-factory/schema/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Download, Layout, Type, Palette, Sparkles, Wand2, Loader2 } from "lucide-react";
import { ConceptGrid } from "./components/ConceptGrid";

const DEFAULT_PAYLOAD: StoryPayload = {
    version: "1.0",
    platform: "instagram",
    format: "story",
    templateId: "quote",
    canvas: { width: 1080, height: 1920 },
    safeZones: { top: 250, bottom: 250, left: 0, right: 0 },
    brand: { theme: "default" },
    export: { type: "png", quality: 92 },
    props: {
        headline: "K3RN.LABS INSIGHTS",
        quote: "Deterministic environments are the cradle of exponential innovation.",
        author: "Kael Prototype",
        logoVariant: "default",
        backgroundStyle: "gradient",
    },
};

export default function StoriesBuilderPage() {
    const [payload, setPayload] = useState<StoryPayload>(DEFAULT_PAYLOAD);
    const [isExporting, setIsExporting] = useState(false);

    // AI Generation State
    const [prompt, setPrompt] = useState("");
    const [generatedConcepts, setGeneratedConcepts] = useState<StoryPayload[]>([]);
    const [isLoadingConcepts, setIsLoadingConcepts] = useState(false);
    const [showConcepts, setShowConcepts] = useState(false);

    const handleGenerateConcepts = async () => {
        if (!prompt.trim()) return;

        setIsLoadingConcepts(true);
        setShowConcepts(true);
        try {
            const response = await fetch("/api/stories/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt, variants: 5 }),
            });

            if (!response.ok) throw new Error("Generation failed");

            const data = await response.json();
            setGeneratedConcepts(data.concepts || []);

            if (data.concepts?.length > 0) {
                console.log(`Successfully generated ${data.concepts.length} visual concepts.`);
            }
        } catch (error) {
            console.error("Generation error:", error);
            setShowConcepts(false);
        } finally {
            setIsLoadingConcepts(false);
        }
    };

    const updateProps = (newProps: Partial<any>) => {
        setPayload((prev) => ({
            ...prev,
            // @ts-ignore
            props: { ...prev.props, ...newProps },
        }));
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const response = await fetch("/api/stories/render", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error("Export failed");

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `story-${payload.templateId}-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export error:", error);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-[#050505] text-white overflow-hidden">
            {/* Header */}
            <header className="flex items-center justify-between px-8 py-4 border-b border-white/10 bg-black/40 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                        <div className="w-4 h-4 bg-black rounded-sm" />
                    </div>
                    <h1 className="text-xl font-jakarta font-bold tracking-tight">Social Story Factory</h1>
                </div>
                <Button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="bg-white text-black hover:bg-white/90 font-bold px-6"
                >
                    {isExporting ? "Exporting..." : "Export Story"}
                    <Download className="ml-2 w-4 h-4" />
                </Button>
            </header>

            {/* Main Content */}
            <main className="flex flex-1 overflow-hidden">
                {/* Sidebar / Editor */}
                <aside className="w-[450px] border-r border-white/10 p-8 overflow-y-auto bg-black/20">
                    <div className="space-y-8">
                        {/* AI Section */}
                        <section className="p-5 rounded-2xl bg-primary/5 border border-primary/10 space-y-4">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-primary" />
                                <Label className="text-xs uppercase tracking-widest text-primary font-bold">AI Concept Generator</Label>
                            </div>

                            <div className="space-y-3">
                                <Textarea
                                    placeholder="Describe your story idea... (e.g. 'Announce our new AI feature with a bold tone')"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    className="bg-black/40 border-white/10 focus:border-primary/30 min-h-[80px] text-sm"
                                />
                                <Button
                                    onClick={handleGenerateConcepts}
                                    disabled={isLoadingConcepts || !prompt.trim()}
                                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                                >
                                    {isLoadingConcepts ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Wand2 className="w-4 h-4 mr-2" />
                                    )}
                                    Generate Visual Concepts
                                </Button>
                            </div>
                        </section>

                        <div className="h-px bg-white/10" />

                        <section>
                            <Label className="text-xs uppercase tracking-widest text-white/50 mb-4 block">Select Template</Label>
                            <div className="grid grid-cols-3 gap-3">
                                {["quote", "announcement", "checklist"].map((id) => (
                                    <button
                                        key={id}
                                        onClick={() => {
                                            let nextProps = {};
                                            if (id === "quote") {
                                                nextProps = {
                                                    headline: "K3RN.LABS INSIGHTS",
                                                    quote: "Deterministic environments are the cradle of exponential innovation.",
                                                    author: "Kael Prototype",
                                                };
                                            } else if (id === "announcement") {
                                                nextProps = {
                                                    title: "NEW FEATURE",
                                                    subtitle: "Social Story Factory is now live for all users.",
                                                    dateLine: "MARCH 2026 • K3RN HQ",
                                                    cta: "LEARN MORE",
                                                };
                                            } else if (id === "checklist") {
                                                nextProps = {
                                                    title: "TODO LIST",
                                                    items: ["Plan V1", "Build Core", "Export PNG"],
                                                    cta: "CHECK IT OUT",
                                                };
                                            }
                                            setPayload(prev => ({
                                                ...prev,
                                                templateId: id as any,
                                                props: nextProps as any
                                            }));
                                        }}
                                        className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${payload.templateId === id
                                            ? "border-white bg-white/10 text-white"
                                            : "border-white/10 hover:border-white/20 text-white/40"
                                            }`}
                                    >
                                        <Layout className="w-5 h-5" />
                                        <span className="text-[10px] font-bold uppercase">{id}</span>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="space-y-4">
                            <Label className="text-xs uppercase tracking-widest text-white/50 mb-4 block">Edit Properties</Label>

                            {payload.templateId === "quote" && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm">Headline</Label>
                                        <Input
                                            value={(payload.props as QuoteProps).headline}
                                            onChange={(e) => updateProps({ headline: e.target.value })}
                                            className="bg-white/5 border-white/10 focus:border-white/30"
                                            maxLength={60}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm">Quote</Label>
                                        <Textarea
                                            value={(payload.props as QuoteProps).quote}
                                            onChange={(e) => updateProps({ quote: e.target.value })}
                                            className="bg-white/5 border-white/10 focus:border-white/30 min-h-[120px]"
                                            maxLength={220}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm">Author</Label>
                                        <Input
                                            value={(payload.props as QuoteProps).author}
                                            onChange={(e) => updateProps({ author: e.target.value })}
                                            className="bg-white/5 border-white/10 focus:border-white/30"
                                            maxLength={40}
                                        />
                                    </div>
                                </div>
                            )}

                            {payload.templateId === "announcement" && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm">Title</Label>
                                        <Input
                                            value={(payload.props as AnnouncementProps).title}
                                            onChange={(e) => updateProps({ title: e.target.value })}
                                            className="bg-white/5 border-white/10 focus:border-white/30"
                                            maxLength={60}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm">Subtitle</Label>
                                        <Input
                                            value={(payload.props as AnnouncementProps).subtitle}
                                            onChange={(e) => updateProps({ subtitle: e.target.value })}
                                            className="bg-white/5 border-white/10 focus:border-white/30"
                                            maxLength={80}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm">Date/Location Line</Label>
                                        <Input
                                            value={(payload.props as AnnouncementProps).dateLine}
                                            onChange={(e) => updateProps({ dateLine: e.target.value })}
                                            className="bg-white/5 border-white/10 focus:border-white/30"
                                            maxLength={40}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm">CTA Text</Label>
                                        <Input
                                            value={(payload.props as AnnouncementProps).cta}
                                            onChange={(e) => updateProps({ cta: e.target.value })}
                                            className="bg-white/5 border-white/10 focus:border-white/30"
                                            maxLength={24}
                                        />
                                    </div>
                                </div>
                            )}

                            {payload.templateId === "checklist" && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm">List Title</Label>
                                        <Input
                                            value={(payload.props as ChecklistProps).title}
                                            onChange={(e) => updateProps({ title: e.target.value })}
                                            className="bg-white/5 border-white/10 focus:border-white/30"
                                            maxLength={60}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm">List Items (3 to 6)</Label>
                                        {(payload.props as ChecklistProps).items.map((item, i) => (
                                            <Input
                                                key={i}
                                                value={item}
                                                onChange={(e) => {
                                                    const newItems = [...(payload.props as ChecklistProps).items];
                                                    newItems[i] = e.target.value;
                                                    updateProps({ items: newItems });
                                                }}
                                                className="bg-white/5 border-white/10 focus:border-white/30 mb-2"
                                                maxLength={42}
                                            />
                                        ))}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm">CTA Text</Label>
                                        <Input
                                            value={(payload.props as ChecklistProps).cta}
                                            onChange={(e) => updateProps({ cta: e.target.value })}
                                            className="bg-white/5 border-white/10 focus:border-white/30"
                                            maxLength={24}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 space-y-4">
                                <Label className="text-xs uppercase tracking-widest text-white/50 block">Export Settings</Label>
                                <div className="flex gap-4">
                                    <Button variant="outline" className="flex-1 bg-white/5 border-white/10">PNG</Button>
                                    <Button variant="ghost" className="flex-1 opacity-50">JPEG</Button>
                                </div>
                            </div>
                        </section>
                    </div>
                </aside>

                {/* Preview Area */}
                <section className="flex-1 p-12 flex items-center justify-center bg-[#0a0a0a] relative overflow-y-auto">
                    <div className="absolute top-8 left-8 flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full z-10">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] uppercase font-bold tracking-widest text-white/70">Live Satori Preview</span>
                    </div>

                    {showConcepts ? (
                        <div className="w-full max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex justify-between items-center mb-8">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowConcepts(false)}
                                    className="text-white/50 hover:text-white"
                                >
                                    ← Back to manual editor
                                </Button>
                            </div>
                            <ConceptGrid
                                concepts={generatedConcepts}
                                isLoading={isLoadingConcepts}
                                onSelect={(concept) => {
                                    setPayload(concept);
                                    setShowConcepts(false);
                                }}
                            />
                        </div>
                    ) : (
                        <div className="animate-in fade-in zoom-in-95 duration-300">
                            <StoryPreview payload={payload} />
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
