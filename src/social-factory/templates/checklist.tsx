import React from "react";
import { colors, spacing } from "../brand/tokens";
import { type ChecklistProps } from "../schema/types";

export const ChecklistTemplate = ({ title, items, cta }: ChecklistProps) => {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                width: spacing.canvasWidth,
                height: spacing.canvasHeight,
                backgroundColor: colors.background,
                color: colors.foreground,
                fontFamily: "var(--font-jakarta)",
                padding: spacing.padding,
                position: "relative",
            }}
        >
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    marginTop: spacing.safeTop,
                    marginBottom: spacing.safeBottom,
                    height: spacing.canvasHeight - spacing.safeTop - spacing.safeBottom,
                    width: "100%",
                }}
            >
                <div
                    style={{
                        fontSize: 84,
                        fontWeight: 800,
                        marginBottom: 80,
                        color: colors.primary,
                    }}
                >
                    {title}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                    {items.map((item, index) => (
                        <div
                            key={index}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 32,
                            }}
                        >
                            <div
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: "50%",
                                    border: `4px solid ${colors.primary}`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <div
                                    style={{
                                        width: 24,
                                        height: 24,
                                        backgroundColor: colors.primary,
                                        borderRadius: "50%",
                                    }}
                                />
                            </div>
                            <div style={{ fontSize: 44, fontWeight: 500 }}>{item}</div>
                        </div>
                    ))}
                </div>

                {cta && (
                    <div
                        style={{
                            marginTop: "auto",
                            fontSize: 40,
                            fontWeight: 600,
                            opacity: 0.7,
                            textAlign: "center",
                        }}
                    >
                        {cta}
                    </div>
                )}
            </div>
        </div>
    );
};
