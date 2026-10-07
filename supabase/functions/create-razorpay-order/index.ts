import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const { order_id } = await req.json().catch(() => ({}));
    if (!order_id) return json({ error: "order_id is required" }, 400);

    // RLS-scoped read: only the owner can see the order
    const { data: order, error: orderErr } = await supabaseUser
      .from("orders")
      .select("id, order_number, total, status, payment_status, customer_id, razorpay_order_id")
      .eq("id", order_id)
      .single();

    if (orderErr || !order) return json({ error: "Order not found" }, 404);
    if (order.customer_id !== userData.user.id) return json({ error: "Forbidden" }, 403);
    if (order.payment_status === "paid") return json({ error: "Order already paid" }, 400);
    if (order.status === "cancelled" || order.status === "rejected") {
      return json({ error: "Order is no longer active" }, 400);
    }

    const amountPaise = Math.round(Number(order.total) * 100);
    if (!Number.isFinite(amountPaise) || amountPaise < 100) {
      return json({ error: "Order total is not valid for online payment" }, 400);
    }

    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

    // Reuse an existing Razorpay order for retries if the amount still matches
    if (order.razorpay_order_id) {
      const existingRes = await fetch(`https://api.razorpay.com/v1/orders/${order.razorpay_order_id}`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (existingRes.ok) {
        const existing = await existingRes.json();
        if (existing.amount === amountPaise && existing.status !== "paid") {
          return json({
            razorpay_order_id: existing.id,
            amount: existing.amount,
            currency: existing.currency,
            key_id: RAZORPAY_KEY_ID,
          });
        }
      }
    }

    const rpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: String(order.order_number || order.id).slice(0, 40),
        notes: { supabase_order_id: order.id },
      }),
    });

    if (!rpRes.ok) {
      console.error("Razorpay order creation failed:", await rpRes.text());
      return json({ error: "Could not start payment. Please try again." }, 502);
    }

    const rpOrder = await rpRes.json();

    // Written with the service role: customers cannot set this column themselves
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: saveErr } = await supabaseAdmin
      .from("orders")
      .update({ razorpay_order_id: rpOrder.id, payment_gateway: "razorpay" })
      .eq("id", order.id);
    if (saveErr) {
      console.error("Failed to save razorpay_order_id:", saveErr);
      return json({ error: "Could not start payment. Please try again." }, 500);
    }

    return json({
      razorpay_order_id: rpOrder.id,
      amount: rpOrder.amount,
      currency: rpOrder.currency,
      key_id: RAZORPAY_KEY_ID,
    });
  } catch (e) {
    console.error("create-razorpay-order error:", e);
    return json({ error: "Internal error" }, 500);
  }
});
