import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Static client id required by the service response contract
const CLIENT_ID = "8caf5ed3-088c-4fa5-b3a8-684e6f0d1616";
const TARGET_URL = "https://getouthy2-54304885440.europe-west1.run.app";
const CONCURRENCY_LIMIT = 10;
const REQUEST_TIMEOUT_MS = 75_000; // external API may take 25-50s per spec

function parseLines(raw: string): Array<{ email: string; password: string }>{
  const lines = raw
    .split(/\r?\n/) // split by newline
    .map(l => l.trim())
    .filter(Boolean);

  const parsed: Array<{ email: string; password: string }> = [];

  for (const line of lines) {
    // Support both '|' and ':' as separators
    const sep = line.includes('|') ? '|' : (line.includes(':') ? ':' : null);
    if (!sep) continue;
    const [email, password, ...rest] = line.split(sep);
    if (!email || !password || rest.length > 0) continue;
    parsed.push({ email: email.trim(), password: password.trim() });
  }
  return parsed;
}

function dedupeByEmail(items: Array<{ email: string; password: string }>) {
  const seen = new Set<string>();
  const out: typeof items = [];
  for (const item of items) {
    const key = item.email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

async function fetchWithTimeout(email: string, password: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(TARGET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    });

    const text = await res.text();
    let json: any = undefined;
    try { json = text ? JSON.parse(text) : undefined; } catch (_) { /* ignore */ }

    return { ok: res.ok, status: res.status, data: json, rawText: text };
  } finally {
    clearTimeout(timeout);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const token: string | undefined = body.token?.trim();
    const single = (body.email_password ?? '').toString();
    const multi = (body.email_passwords ?? '').toString();
    const removeDuplicates: boolean = Boolean(body.remove_duplicates);

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, message: "Authorization token is required", error_type: "missing_parameters" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build list of credentials
    let items: Array<{ email: string; password: string }> = [];
    if (multi && multi.trim()) {
      items = parseLines(multi);
    } else if (single && single.trim()) {
      const parsed = parseLines(single);
      if (parsed.length) items = parsed.slice(0, 1);
    }

    if (!items.length) {
      return new Response(
        JSON.stringify({ success: false, message: "Provide credentials in format email@domain.com|password or email@domain.com:password", error_type: "invalid_format" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (removeDuplicates) {
      items = dedupeByEmail(items);
    }

    if (items.length > 100) {
      return new Response(
        JSON.stringify({ success: false, message: "Maximum 100 emails per request", error_type: "limit_exceeded", limit: 100 }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Resolve product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id')
      .eq('name', 'GET-OAUTH2-TOKEN')
      .eq('product_type', 'digital')
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ success: false, message: 'Product GET-OAUTH2-TOKEN not found or not configured as digital product', error_type: 'product_not_found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate token and credits
    const { data: tokenData, error: tokenError } = await supabase
      .from('tokens')
      .select('*')
      .eq('token', token)
      .eq('product_id', product.id)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid Token: Token not found or not authorized for GET-OAUTH2-TOKEN product. Please verify your token is correct and valid.', error_type: 'invalid_token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if ((tokenData.credits ?? 0) < items.length) {
      return new Response(
        JSON.stringify({ success: false, message: `Insufficient credits for GET-OAUTH2-TOKEN. Available: ${tokenData.credits}, Required: ${items.length}`, error_type: 'insufficient_credits' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduct credits upfront equal to number of items
    const { error: deductError } = await supabase
      .from('tokens')
      .update({ credits: (tokenData.credits as number) - items.length })
      .eq('token', token);

    if (deductError) {
      console.error('Failed to deduct credits:', deductError);
    }

    // Concurrency pool processing
    type ItemResult = {
      email: string;
      status: 'success' | 'fail';
      response?: any; // full success payload we return
      result_text?: string; // Result string on success
      error_message?: string; // fail reason
    };

    const results: ItemResult[] = new Array(items.length);

    let index = 0;
    async function worker() {
      while (index < items.length) {
        const currentIndex = index++;
        const { email, password } = items[currentIndex];

        try {
          const resp = await fetchWithTimeout(email, password);

          if (resp.ok && resp.data && resp.status === 200 && resp.data.refresh_token) {
            const oauthData = resp.data;
            const resultText = `${email}|${password}|${oauthData.refresh_token}|${CLIENT_ID}`;
            const fullResponse = {
              ...oauthData,
              CLIENT_ID,
              Result: resultText,
            };

            // Insert transaction success
            const { error: txErr } = await supabase
              .from('transactions')
              .insert({
                token,
                product_id: product.id,
                product_name: 'GET-OAUTH2-TOKEN',
                qty: 1,
                status: 'success',
                response_data: fullResponse,
                output_result: [resultText],
                note: email,
              });
            if (txErr) console.error('Transaction insert error (success):', txErr);

            results[currentIndex] = { email, status: 'success', response: fullResponse, result_text: resultText };
          } else {
            // Parse error message
            const message = resp.data?.message || resp.data?.error_description || resp.data?.error || resp.rawText || 'Request failed';
            const visibleMsg = typeof message === 'string' ? message : JSON.stringify(message);
            const combined = `${email}|${password} ${visibleMsg}`;

            const { error: txErr } = await supabase
              .from('transactions')
              .insert({
                token,
                product_id: product.id,
                product_name: 'GET-OAUTH2-TOKEN',
                qty: 1,
                status: 'fail',
                response_data: combined,
                output_result: [combined],
                note: email,
              });
            if (txErr) console.error('Transaction insert error (fail):', txErr);

            results[currentIndex] = { email, status: 'fail', error_message: visibleMsg };
          }
        } catch (e: any) {
          const msg = e?.message || 'Connection error';
          const combined = `${email}|${password} ${msg}`;

          const { error: txErr } = await supabase
            .from('transactions')
            .insert({
              token,
              product_id: product.id,
              product_name: 'GET-OAUTH2-TOKEN',
              qty: 1,
              status: 'fail',
              response_data: combined,
              output_result: [combined],
              note: email,
            });
          if (txErr) console.error('Transaction insert error (exception):', txErr);

          results[currentIndex] = { email, status: 'fail', error_message: msg };
        }
      }
    }

    // Start workers
    const workers = Array.from({ length: Math.min(CONCURRENCY_LIMIT, items.length) }, () => worker());
    await Promise.all(workers);

    return new Response(
      JSON.stringify({ success: true, count: items.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in get-oauth2-token function:', error);
    return new Response(
      JSON.stringify({ success: false, message: `Server error: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
