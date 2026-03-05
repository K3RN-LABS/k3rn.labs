import { NextRequest, NextResponse } from "next/server";
import { generateConcepts } from "@/social-factory/ai/generateConcepts";

// runtime removed to use default Node.js environment


export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { prompt, tone, variants } = body;

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        const result = await generateConcepts(prompt, {
            tone,
            variants: variants ? parseInt(variants) : 5
        });

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("[api/stories/generate] Error:", error);
        return NextResponse.json({
            error: "CONCEPT_GENERATION_FAILED",
            message: error.message
        }, { status: 500 });
    }
}
