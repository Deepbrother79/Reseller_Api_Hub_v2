
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Retrieve sensitive data from Supabase secrets
const CLIENT_ID = Deno.env.get('CLIENT_ID');
const TARGET_URL = Deno.env.get('TARGET_URL');

const CONCURRENCY_LIMIT = 10;
const REQUEST_TIMEOUT_MS = 75_000; // external API may take 25-50s per spec

function parseLines(raw) {
  const lines = raw.split(/\r?\n/) // split by newline
  .map((l)=>l.trim()).filter(Boolean);
  const parsed = [];
  for (const line of lines){
    // Support both '|' and ':' as separators
    const sep = line.includes('|') ? '|' : line.includes(':') ? ':' : null;
    if (!sep) continue;
    const [email, password, ...rest] = line.split(sep);
    if (!email || !password || rest.length > 0) continue;
    parsed.push({
      email: email.trim(),
      password: password.trim()
    });
  }
  return parsed;
}

function dedupeByEmail(items) {
  const seen = new Set();
  const out = [];
  for (const item of items){
    const key = item.email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

async function fetchWithTimeout(email, password) {
  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(TARGET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password
      }),
      signal: controller.signal
    });
    const text = await res.text();
    let json = undefined;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch (_) {}
    return {
      ok: res.ok,
      status: res.status,
      data: json,
      rawText: text
    };
  } finally{
    clearTimeout(timeout);
  }
}

// Funzione per processare una singola credenziale
async function processCredential(item, itemIndex, token, product, supabase, isMasterToken = false) {
  const { email, password } = item;
  try {
    console.log(`Processing credential ${itemIndex + 1}: ${email}`);
    const resp = await fetchWithTimeout(email, password);
    if (resp.ok && resp.data && resp.status === 200 && resp.data.refresh_token) {
      const oauthData = resp.data;
      const resultText = `${email}|${password}|${oauthData.refresh_token}|${CLIENT_ID}`;
      const fullResponse = {
        ...oauthData,
        CLIENT_ID,
        Result: resultText
      };
      // Ensure FK compatibility when using master token by creating a shadow token if missing
      if (isMasterToken) {
        const { data: existingTok } = await supabase
          .from('tokens')
          .select('token')
          .eq('token', token)
          .maybeSingle();
        if (!existingTok) {
          const { error: insertShadowErr } = await supabase
            .from('tokens')
            .insert({ token, product_id: product.id, name: 'MASTER-LINK', credits: 0 });
          if (insertShadowErr) console.error('Failed to insert shadow token for FK:', insertShadowErr);
        }
      }
      // Insert transaction success
      const { error: txErr } = await supabase.from('transactions').insert({
        token,
        product_id: product.id,
        product_name: 'GET-OAUTH2-TOKEN',
        qty: 1,
        status: 'success',
        response_data: fullResponse,
        output_result: [
          resultText
        ],
        note: email
      });
      if (txErr) console.error('Transaction insert error (success):', txErr);
      return {
        email,
        status: 'success',
        response: fullResponse,
        result_text: resultText
      };
    } else {
      // Parse error message
      const message = resp.data?.message || resp.data?.error_description || resp.data?.error || resp.rawText || 'Request failed';
      const visibleMsg = typeof message === 'string' ? message : JSON.stringify(message);
      const combined = `${email}|${password} ${visibleMsg}`;
      // Ensure FK compatibility when using master token by creating a shadow token if missing
      if (isMasterToken) {
        const { data: existingTok } = await supabase
          .from('tokens')
          .select('token')
          .eq('token', token)
          .maybeSingle();
        if (!existingTok) {
          const { error: insertShadowErr } = await supabase
            .from('tokens')
            .insert({ token, product_id: product.id, name: 'MASTER-LINK', credits: 0 });
          if (insertShadowErr) console.error('Failed to insert shadow token for FK:', insertShadowErr);
        }
      }
      const { error: txErr } = await supabase.from('transactions').insert({
        token,
        product_id: product.id,
        product_name: 'GET-OAUTH2-TOKEN',
        qty: 1,
        status: 'fail',
        response_data: combined,
        output_result: [
          combined
        ],
        note: email
      });
      if (txErr) console.error('Transaction insert error (fail):', txErr);
      return {
        email,
        status: 'fail',
        error_message: visibleMsg
      };
    }
  } catch (e) {
    console.error(`Error processing ${email}:`, e);
    const msg = e?.message || 'Connection error';
    const combined = `${email}|${password} ${msg}`;
    // Ensure FK compatibility when using master token by creating a shadow token if missing
    if (isMasterToken) {
      const { data: existingTok } = await supabase
        .from('tokens')
        .select('token')
        .eq('token', token)
        .maybeSingle();
      if (!existingTok) {
        const { error: insertShadowErr } = await supabase
          .from('tokens')
          .insert({ token, product_id: product.id, name: 'MASTER-LINK', credits: 0 });
        if (insertShadowErr) console.error('Failed to insert shadow token for FK:', insertShadowErr);
      }
    }
    const { error: txErr } = await supabase.from('transactions').insert({
      token,
      product_id: product.id,
      product_name: 'GET-OAUTH2-TOKEN',
      qty: 1,
      status: 'fail',
      response_data: combined,
      output_result: [
        combined
      ],
      note: email
    });
    if (txErr) console.error('Transaction insert error (exception):', txErr);
    return {
      email,
      status: 'fail',
      error_message: msg
    };
  }
}

serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    // Check if required secrets are available
    if (!CLIENT_ID || !TARGET_URL) {
      console.error('Missing required secrets: CLIENT_ID or TARGET_URL');
      return new Response(JSON.stringify({
        success: false,
        message: "Server configuration error: Missing required secrets",
        error_type: "configuration_error"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const body = await req.json().catch(()=>({}));
    const token = body.token?.trim();
    const single = (body.email_password ?? '').toString();
    const multi = (body.email_passwords ?? '').toString();
    const removeDuplicates = Boolean(body.remove_duplicates);
    const useMasterToken = Boolean(body.use_master_token);
    
    if (!token) {
      return new Response(JSON.stringify({
        success: false,
        message: "Authorization token is required",
        error_type: "missing_parameters"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Build list of credentials
    let items = [];
    if (multi && multi.trim()) {
      items = parseLines(multi);
    } else if (single && single.trim()) {
      const parsed = parseLines(single);
      if (parsed.length) items = parsed.slice(0, 1);
    }
    
    if (!items.length) {
      return new Response(JSON.stringify({
        success: false,
        message: "Provide credentials in format email@domain.com|password or email@domain.com:password",
        error_type: "invalid_format"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    if (removeDuplicates) {
      items = dedupeByEmail(items);
    }
    
    if (items.length > 100) {
      return new Response(JSON.stringify({
        success: false,
        message: "Maximum 100 emails per request",
        error_type: "limit_exceeded",
        limit: 100
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Resolve product
    const { data: product, error: productError } = await supabase.from('products').select('id').eq('name', 'GET-OAUTH2-TOKEN').eq('product_type', 'digital').single();
    if (productError || !product) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Product GET-OAUTH2-TOKEN not found or not configured as digital product',
        error_type: 'product_not_found'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Validate token and credits based on master token flag
    let tokenData;
    let isMasterToken = false;
    let requiredCredits = items.length;

    if (useMasterToken) {
      // Try master token table first
      const { data: masterToken, error: masterTokenError } = await supabase.from('tokens_master').select('*').eq('token', token).single();
      if (masterToken) {
        tokenData = masterToken;
        isMasterToken = true;
        // For master tokens, we need to get the product value to calculate credits
        const { data: productData } = await supabase.from('products').select('value').eq('id', product.id).single();
        requiredCredits = items.length * (productData?.value || 1);
        console.log('Using master token, required credits:', requiredCredits);
      } else {
        return new Response(JSON.stringify({
          success: false,
          message: 'Master token not found. Please verify your token is correct.',
          error_type: 'invalid_token'
        }), {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    } else {
      // Try regular token table
      const { data: regularToken, error: regularTokenError } = await supabase.from('tokens').select('*').eq('token', token).eq('product_id', product.id).single();
      if (regularToken) {
        tokenData = regularToken;
      } else {
        return new Response(JSON.stringify({
          success: false,
          message: 'Invalid Token: Token not found or not authorized for GET-OAUTH2-TOKEN product. Please verify your token is correct and valid.',
          error_type: 'invalid_token'
        }), {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }
    
    if ((tokenData.credits ?? 0) < requiredCredits) {
      return new Response(JSON.stringify({
        success: false,
        message: `Insufficient credits for GET-OAUTH2-TOKEN. Available: ${tokenData.credits}, Required: ${requiredCredits}`,
        error_type: 'insufficient_credits'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Deduct credits upfront equal to required credits
    const tableName = isMasterToken ? 'tokens_master' : 'tokens';
    const { error: deductError } = await supabase.from(tableName).update({
      credits: tokenData.credits - requiredCredits
    }).eq('token', token);
    if (deductError) {
      console.error('Failed to deduct credits:', deductError);
    }
    
    console.log(`Processing ${items.length} credentials with ${Math.min(CONCURRENCY_LIMIT, items.length)} concurrent workers`);
    
    // ✅ SOLUZIONE: Utilizziamo Promise.allSettled con controllo di concorrenza
    const processWithConcurrency = async (items, concurrency)=>{
      const results = [];
      for(let i = 0; i < items.length; i += concurrency){
        const batch = items.slice(i, i + concurrency);
        console.log(`Processing batch ${Math.floor(i / concurrency) + 1}, items ${i + 1} to ${Math.min(i + concurrency, items.length)}`);
        const batchPromises = batch.map((item, batchIndex)=>processCredential(item, i + batchIndex, token, product, supabase, isMasterToken));
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Aggiungi i risultati mantenendo l'ordine
        batchResults.forEach((result, batchIndex)=>{
          if (result.status === 'fulfilled') {
            results[i + batchIndex] = result.value;
          } else {
            console.error(`Failed to process item ${i + batchIndex}:`, result.reason);
            results[i + batchIndex] = {
              email: batch[batchIndex].email,
              status: 'fail',
              error_message: 'Processing failed: ' + (result.reason?.message || 'Unknown error')
            };
          }
        });
        
        // Pausa breve tra i batch per evitare overload
        if (i + concurrency < items.length) {
          await new Promise((resolve)=>setTimeout(resolve, 100));
        }
      }
      return results;
    };
    
    const results = await processWithConcurrency(items, CONCURRENCY_LIMIT);
    
    console.log(`Completed processing. Success: ${results.filter((r)=>r.status === 'success').length}, Failed: ${results.filter((r)=>r.status === 'fail').length}`);
    
    return new Response(JSON.stringify({
      success: true,
      count: items.length,
      results
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in get-oauth2-token function:', error);
    return new Response(JSON.stringify({
      success: false,
      message: `Server error: ${error.message}`
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
