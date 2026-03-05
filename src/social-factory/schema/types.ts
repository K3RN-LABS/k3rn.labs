import { z } from "zod";

export const StoryCanvasSchema = z.object({
    width: z.literal(1080),
    height: z.literal(1920),
});

export const SafeZonesSchema = z.object({
    top: z.literal(250),
    bottom: z.literal(250),
    left: z.literal(0),
    right: z.literal(0),
});

export const QuotePropsSchema = z.object({
    headline: z.string().max(60).optional(),
    quote: z.string().max(220),
    author: z.string().max(40),
    logoVariant: z.enum(["default", "white", "black"]).default("default"),
    backgroundStyle: z.enum(["solid", "gradient", "image"]).default("gradient"),
});

export const AnnouncementPropsSchema = z.object({
    title: z.string().max(60),
    subtitle: z.string().max(80).optional(),
    dateLine: z.string().max(40).optional(),
    cta: z.string().max(24).optional(),
    logoVariant: z.enum(["default", "white", "black"]).default("default"),
});

export const ChecklistPropsSchema = z.object({
    title: z.string().max(60),
    items: z.array(z.string().max(42)).min(3).max(6),
    cta: z.string().max(24).optional(),
});

export const StorySchema = z.object({
    version: z.literal("1.0"),
    platform: z.literal("instagram"),
    format: z.literal("story"),
    canvas: StoryCanvasSchema,
    safeZones: SafeZonesSchema,
    templateId: z.enum(["quote", "announcement", "checklist"]),
    props: z.union([QuotePropsSchema, AnnouncementPropsSchema, ChecklistPropsSchema]),
    brand: z.object({
        theme: z.string().default("default"),
    }).default({ theme: "default" }),
    export: z.object({
        type: z.enum(["png", "jpeg"]).default("png"),
        quality: z.number().min(1).max(100).default(92),
    }).default({ type: "png", quality: 92 }),
});

export type StoryPayload = z.infer<typeof StorySchema>;
export type QuoteProps = z.infer<typeof QuotePropsSchema>;
export type AnnouncementProps = z.infer<typeof AnnouncementPropsSchema>;
export type ChecklistProps = z.infer<typeof ChecklistPropsSchema>;
