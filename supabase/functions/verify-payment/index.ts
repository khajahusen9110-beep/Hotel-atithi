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

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
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

    const { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      await req.json().catch(() => ({}));
    if (!order_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return json({ error: "Missing required fields" }, 400);
    }

    const { data: order, error: orderErr } = await supabaseUser
      .from("orders")
      .select("id, customer_id, total, payment_status, razorpay_order_id")
      .eq("id", order_id)
      .single();

    if (orderErr || !order) return json({ error: "Order not found" }, 404);
    if (order.customer_id !== userData.user.id) return json({ error: "Forbidden" }, 403);
    if (order.payment_status === "paid") return json({ success: true, already_paid: true });

    // The Razorpay order must be the one our server created for THIS order
    if (!order.razorpay_order_id || order.razorpay_order_id !== razorpay_order_id) {
      return json({ error: "Order/payment mismatch" }, 400);
    }

    const expected = await hmacSha256Hex(RAZORPAY_KEY_SECRET, `${razorpay_order_id}|${razorpay_payment_id}`);
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (!safeEqual(expected, String(razorpay_signature))) {
      await supabaseAdmin.from("orders").update({ payment_status: "failed" }).eq("id", order_id);
      return json({ error: "Signature verification failed" }, 400);
    }

    // Double-check with Razorpay that the full current order amount was actually captured/authorized
    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const payRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!payRes.ok) {
      console.error("Could not fetch payment from Razorpay:", await payRes.text());
      return json({ error: "Could not confirm payment right now" }, 502);
    }
    const payment = await payRes.json();
    const expectedPaise = Math.round(Number(order.total) * 100);

    if (
      payment.order_id !== razorpay_order_id ||
      !["authorized", "captured"].includes(payment.status) ||
      Number(payment.amount) !== expectedPaise
    ) {
      console.error("Payment does not match order", { order_id, expectedPaise, payment_amount: payment.amount, status: payment.status });
      return json({ error: "Payment amount does not match order" }, 400);
    }

    const { error: updateErr } = await supabaseAdmin
      .from("orders")
      .update({ payment_status: "paid", payment_id: razorpay_payment_id, payment_gateway: "razorpay" })
      .eq("id", order_id);

    if (updateErr) {
      console.error("Failed to update order:", updateErr);
      return json({ error: "Failed to update order" }, 500);
    }

    return json({ success: true });
  } catch (e) {
    console.error("verify-payment error:", e);
    return json({ error: "Internal error" }, 500);
  }
});
