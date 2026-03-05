import React from "react";
import { colors, spacing } from "../brand/tokens";
import { type AnnouncementProps } from "../schema/types";

export const AnnouncementTemplate = ({ title, subtitle, dateLine, cta }: AnnouncementProps) => {
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
                backgroundImage: "linear-gradient(to bottom right, #090909, #232323)",
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
                    justifyContent: "center",
                    width: "100%",
                }}
            >
                <div
                    style={{
                        fontSize: 120,
                        fontWeight: 800,
                        lineHeight: 1,
                        marginBottom: 40,
                        color: colors.primary,
                    }}
                >
                    {title}
                </div>

                {subtitle && (
                    <div
                        style={{
                            fontSize: 56,
                            opacity: 0.8,
                            marginBottom: 80,
                            lineHeight: 1.4,
                        }}
                    >
                        {subtitle}
                    </div>
                )}

                {dateLine && (
                    <div
                        style={{
                            fontSize: 40,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.2em",
                            marginBottom: 40,
                        }}
                    >
                        {dateLine}
                    </div>
                )}

                {cta && (
                    <div
                        style={{
                            marginTop: 40,
                            padding: "24px 48px",
                            backgroundColor: colors.primary,
                            color: colors.primaryForeground,
                            fontSize: 36,
                            fontWeight: 700,
                            borderRadius: 12,
                            alignSelf: "flex-start",
                        }}
                    >
                        {cta}
                    </div>
                )}
            </div>

            <div
                style={{
                    position: "absolute",
                    top: 100,
                    left: spacing.padding,
                }}
            >
                <div style={{ fontSize: 32, fontWeight: 700 }}>k3rn</div>
            </div>
        </div>
    );
};
