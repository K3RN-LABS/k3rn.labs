import React from 'react';
import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { validateStoryPayload } from '@/social-factory/schema/validate';
import { renderTemplate } from '@/social-factory/templates';
import { spacing } from '@/social-factory/brand/tokens';

// runtime removed to use default Node.js environment

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // 1. Validate payload
        const validation = validateStoryPayload(body);
        if (!validation.success) {
            return new Response(
                JSON.stringify({ error: 'VALIDATION_ERROR', details: validation.error }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const payload = validation.data;

        const element = renderTemplate(payload);
        if (!element) throw new Error("Failed to render template");

        // 2. Render Template to ImageResponse
        return new ImageResponse(
            element as React.ReactElement,
            {
                width: spacing.canvasWidth,
                height: spacing.canvasHeight,
                // Font loading removed for now to use default sans, 
                // will add local font loading if satori supports it easily in this env
            }
        );
    } catch (error: any) {
        console.error('Render error:', error);
        return new Response(
            JSON.stringify({ error: 'RENDER_ERROR', message: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
