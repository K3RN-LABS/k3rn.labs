import { prisma } from './src/lib/prisma';
import { POST } from './src/app/api/dossiers/[id]/ingest/route';
import { NextRequest } from 'next/server';

function createMockRequest(body: any) {
    return new NextRequest('http://localhost:3000/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

async function testIngestion() {
    const dossierId = "test-dossier-123-" + Date.now();

    // Create mock dossier
    const user = await prisma.user.create({
        data: { email: `test_${Date.now()}@example.com`, role: 'OWNER' }
    });

    await prisma.dossier.create({
        data: { id: dossierId, name: "Test Dossier", ownerId: user.id }
    });

    console.log("== Starting Ingestion Tests on Dossier:", dossierId, "==");

    // Case 4: Empty Message
    console.log("\\n--- Case 4: Empty Content ---");
    const req4 = createMockRequest({ messageId: "msg-empty", content: "", source: "USER" });
    const res4 = await POST(req4, { params: { id: dossierId } });
    if (res4.status === 400) {
        console.log("✅ Empty message rejected with 400 (Expected)");
    } else {
        console.error("❌ Empty message failed", await res4.json());
    }

    // Case 2: Multi-concepts
    const multiConceptText = `We basically have 6 main things to address:
1. The users don't have an easy way to login (PROBLEM)
2. We want to implement Magic Links (SOLUTION)
3. Our budget is only 5000 EUR (CONSTRAINT)
4. We aim to reach 10k MRR by end of year (TARGET)
5. Our vision is to be the best tool for this (VISION)
6. Also, a random note about colors being too bright (NOTE)`;

    console.log("\\n--- Case 2: Multi-Concepts (Max 5) ---");
    const req2 = createMockRequest({ messageId: "msg-multi-1", content: multiConceptText, source: "USER" });
    const res2 = await POST(req2, { params: { id: dossierId } });
    const data2 = await res2.json();
    console.log("Created Cards Count:", data2.created?.length);
    if (data2.created?.length <= 5 && data2.created?.length > 0) {
        console.log("✅ Extracted concepts strictly limited to MAX 5.");
    } else {
        console.error("❌ Failed length check:", data2);
    }

    // Case 1: Idempotency
    console.log("\\n--- Case 1: Idempotency (Same message twice) ---");
    const req1 = createMockRequest({ messageId: "msg-multi-1", content: multiConceptText, source: "USER" });
    const res1 = await POST(req1, { params: { id: dossierId } });
    const data1 = await res1.json();
    // It should be exactly the same response from DB log and NOT create new cards
    console.log("Created Cards Count (Idempotent):", data1.created?.length);
    if (data1.created?.length === data2.created?.length) {
        const cardsAfter = await prisma.card.count({ where: { dossierId, content: { path: ['sourceMessage'], equals: "msg-multi-1" } } });
        if (cardsAfter === data2.created?.length) {
            console.log("✅ Idempotency worked: No duplicate DB entries created.");
        } else {
            console.error("❌ Idempotency failed. DB has duplicates.");
        }
    }

    // Case 3: Deduplication (Fuzzy / Merge)
    console.log("\\n--- Case 3: Merge Similar Concept ---");
    // Let's assume one of the created cards was "Magic Link Implementation"
    // We send a similar short message
    const similarText = "We need Magic Links for authentication."; // It should fuzzy match if titles are generated similarly, but since we use Exact match on title currently, we need the LLM to output the exact same Title for merge.
    const req3 = createMockRequest({ messageId: "msg-similar-1", content: similarText, source: "USER" });
    const res3 = await POST(req3, { params: { id: dossierId } });
    const data3 = await res3.json();
    console.log("Merged:", data3.merged?.length, "Created:", data3.created?.length);
    if (data3.merged?.length > 0) {
        console.log("✅ Merge successful.");
    } else {
        // It might not merge contextually if LLM gives different title since we use exact match in code.
        console.log("⚠️ Merge not triggered (LLM yielded different title). We use EXACT title match currently.");
    }

    console.log("\\n== Tests Completed ==");
}

testIngestion()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
