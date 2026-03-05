import { generateStoryConcepts } from "./conceptEngine";
import { type StoryPayload } from "../schema/types";

/**
 * Main service function to generate story concepts from a user prompt.
 * This is the primary entry point for the AI module.
 */
export async function generateConcepts(
    prompt: string,
    options: {
        tone?: string;
        variants?: number;
    } = {}
): Promise<{ concepts: StoryPayload[] }> {
    const { tone = "futuristic", variants = 5 } = options;

    // Call the engine to get valid payloads
    const concepts = await generateStoryConcepts(prompt, tone, variants);

    return {
        concepts
    };
}
