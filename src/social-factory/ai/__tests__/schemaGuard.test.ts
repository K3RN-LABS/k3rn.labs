import { describe, it, expect } from "vitest";
import { validateConcept, validateConcepts } from "../schemaGuard";

describe("schemaGuard", () => {
    describe("validateConcept", () => {
        it("should accept a valid quote concept", () => {
            const concept = {
                templateId: "quote",
                props: {
                    quote: "Stay hungry, stay foolish.",
                    author: "Steve Jobs"
                }
            };
            const result = validateConcept(concept);
            expect(result.success).toBe(true);
        });

        it("should accept a valid announcement concept", () => {
            const concept = {
                templateId: "announcement",
                props: {
                    title: "BIG NEWS",
                    cta: "LEARN MORE"
                }
            };
            const result = validateConcept(concept);
            expect(result.success).toBe(true);
        });

        it("should reject a concept with missing templateId", () => {
            const concept = {
                props: { quote: "test" }
            };
            const result = validateConcept(concept);
            expect(result.success).toBe(false);
        });

        it("should reject props that exceed character limits", () => {
            const concept = {
                templateId: "quote",
                props: {
                    quote: "a".repeat(221), // Limit is 220
                    author: "test"
                }
            };
            const result = validateConcept(concept);
            expect(result.success).toBe(false);
        });

        it("should reject props with invalid types", () => {
            const concept = {
                templateId: "checklist",
                props: {
                    title: "test",
                    items: "not an array"
                }
            };
            const result = validateConcept(concept);
            expect(result.success).toBe(false);
        });
    });

    describe("validateConcepts", () => {
        it("should filter out invalid concepts from an array", () => {
            const concepts = [
                { templateId: "quote", props: { quote: "Valid", author: "Me" } },
                { templateId: "invalid", props: {} }, // Invalid template
                { props: { quote: "No templateId" } } // Missing field
            ];
            const result = validateConcepts(concepts);
            expect(result.length).toBe(1);
            expect(result[0].templateId).toBe("quote");
        });
    });
});
