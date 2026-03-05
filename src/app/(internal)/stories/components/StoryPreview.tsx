"use client";

import React from "react";
import { spacing, colors } from "@/social-factory/brand/tokens";
import { type StoryPayload } from "@/social-factory/schema/types";
import { renderTemplate } from "@/social-factory/templates";

interface StoryPreviewProps {
    payload: StoryPayload;
    showSafeZones?: boolean;
}

export const StoryPreview = ({ payload, showSafeZones = true }: StoryPreviewProps) => {
    const scale = 0.4; // Scale for preview in UI

    return (
        <div
            style={{
                width: spacing.canvasWidth * scale,
                height: spacing.canvasHeight * scale,
                position: "relative",
                overflow: "hidden",
                boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
                borderRadius: "1rem",
                backgroundColor: "#000",
            }}
        >
            <div
                style={{
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                    width: spacing.canvasWidth,
                    height: spacing.canvasHeight,
                }}
            >
                {renderTemplate(payload)}
            </div>

            {showSafeZones && (
                <>
                    {/* Top Safe Zone */}
                    <div
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            height: spacing.safeTop * scale,
                            backgroundColor: "rgba(255, 0, 0, 0.1)",
                            borderBottom: "1px dashed rgba(255, 0, 0, 0.3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "rgba(255, 0, 0, 0.5)",
                            fontSize: "12px",
                            pointerEvents: "none",
                        }}
                    >
                        BLOCKED (TOP)
                    </div>

                    {/* Bottom Safe Zone */}
                    <div
                        style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: spacing.safeBottom * scale,
                            backgroundColor: "rgba(255, 0, 0, 0.1)",
                            borderTop: "1px dashed rgba(255, 0, 0, 0.3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "rgba(255, 0, 0, 0.5)",
                            fontSize: "12px",
                            pointerEvents: "none",
                        }}
                    >
                        BLOCKED (BOTTOM)
                    </div>
                </>
            )}
        </div>
    );
};
