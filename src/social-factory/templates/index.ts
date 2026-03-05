import React from "react";
import { QuoteTemplate } from "./quote";
import { AnnouncementTemplate } from "./announcement";
import { ChecklistTemplate } from "./checklist";
import { type StoryPayload } from "../schema/types";

export const Templates = {
    quote: QuoteTemplate,
    announcement: AnnouncementTemplate,
    checklist: ChecklistTemplate,
};

export function renderTemplate(payload: StoryPayload) {
    const Template = Templates[payload.templateId as keyof typeof Templates];
    if (!Template) return null;

    // @ts-ignore - Props are union type, mapping explicitly for Satori
    return React.createElement(Template, payload.props);
}
