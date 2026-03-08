import { NextRequest, NextResponse } from "next/server"
import { constructWebhookEvent } from "@/lib/stripe"
import { getPackById } from "@/lib/credit-packs"
import { getPlanByPriceId } from "@/lib/subscription-plans"
import { creditTopUpMissions } from "@/lib/mission-budget"
import { supabaseAdmin } from "@/lib/supabase-admin"
import Stripe from "stripe"

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = constructWebhookEvent(body, signature)
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  // ── One-time top-up ────────────────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const checkoutSession = event.data.object as Stripe.Checkout.Session

    if (checkoutSession.payment_status !== "paid") {
      return NextResponse.json({ received: true })
    }

    // Top-up one-shot (mode: payment)
    if (checkoutSession.mode === "payment") {
      const { userId, packId } = checkoutSession.metadata ?? {}
      if (!userId || !packId) {
        console.error("[billing] top-up: missing metadata", checkoutSession.metadata)
        return NextResponse.json({ error: "Missing metadata" }, { status: 400 })
      }

      const pack = getPackById(packId)
      if (!pack) {
        console.error("[billing] top-up: unknown packId", packId)
        return NextResponse.json({ error: "Unknown pack" }, { status: 400 })
      }

      await creditTopUpMissions(userId, pack.credits)
      console.log(`[billing] +${pack.credits} top-up missions → user ${userId} (pack: ${packId})`)
    }

    // Subscription checkout — l'activation est gérée par customer.subscription.created
  }

  // ── Subscription created / activated ──────────────────────────────────────
  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription
    const userId = sub.metadata?.userId
    if (!userId) {
      console.error("[billing] subscription event: missing userId in metadata")
      return NextResponse.json({ received: true })
    }

    const priceId = sub.items.data[0]?.price?.id
    const plan = priceId ? getPlanByPriceId(priceId) : undefined

    if (!plan || plan.tier === "FREE") {
      console.warn("[billing] subscription event: unknown price or FREE tier", priceId)
      return NextResponse.json({ received: true })
    }

    const isActive = sub.status === "active" || sub.status === "trialing"

    await supabaseAdmin
      .from("User")
      .update({
        subscriptionTier: isActive ? plan.tier : "FREE",
        stripeSubscriptionId: sub.id,
        subscriptionStatus: sub.status,
        monthlyMissionAllowance: isActive ? plan.missionsPerMonth : 5,
        // Reset usage au changement de plan
        monthlyMissionsUsed: 0,
        allowanceResetAt: nextMonthReset(),
      })
      .eq("id", userId)

    console.log(`[billing] subscription ${sub.status} → user ${userId} (tier: ${plan.tier}, ${plan.missionsPerMonth} missions/mois)`)
  }

  // ── Subscription cancelled / expired ──────────────────────────────────────
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription
    const userId = sub.metadata?.userId
    if (!userId) return NextResponse.json({ received: true })

    await supabaseAdmin
      .from("User")
      .update({
        subscriptionTier: "FREE",
        stripeSubscriptionId: null,
        subscriptionStatus: "canceled",
        monthlyMissionAllowance: 5,
        monthlyMissionsUsed: 0,
      })
      .eq("id", userId)

    console.log(`[billing] subscription deleted → user ${userId} downgraded to FREE`)
  }

  // ── Payment failed ─────────────────────────────────────────────────────────
  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice & { subscription?: string | { id: string } }
    const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id
    if (!subId) return NextResponse.json({ received: true })

    await supabaseAdmin
      .from("User")
      .update({ subscriptionStatus: "past_due" })
      .eq("stripeSubscriptionId", subId)

    console.warn(`[billing] invoice payment failed for subscription ${subId}`)
  }

  return NextResponse.json({ received: true })
}

function nextMonthReset(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
