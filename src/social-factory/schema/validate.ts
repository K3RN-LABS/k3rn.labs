import { StorySchema, type StoryPayload } from "./types";

export function validateStoryPayload(payload: unknown): { success: true; data: StoryPayload } | { success: false; error: string } {
    const result = StorySchema.safeParse(payload);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error.message };
}
