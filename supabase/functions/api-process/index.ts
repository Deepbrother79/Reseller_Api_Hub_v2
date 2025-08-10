
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let product_name, token, qty, use_master_token;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      product_name = url.searchParams.get('product_name') || url.searchParams.get('product');
      token = url.searchParams.get('token');
      qty = parseInt(url.searchParams.get('qty') || '0');
      use_master_token = url.searchParams.get('use_master_token') === 'true';
    } else if (req.method === 'POST') {
      const body = await req.json();
      product_name = body.product_name || body.product;
      token = body.token;
      qty = parseInt(body.qty || '0');
      use_master_token = Boolean(body.use_master_token);
    } else {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!product_name || !token || !qty) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required parameters: product_name, token, qty' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Chiama la funzione processa-richiesta esistente
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/processa-richiesta`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
        body: JSON.stringify({
          product_name: product_name,
          token: token,
          qty: qty,
          use_master_token
        })
    });

    const data = await response.json();

    // Rimuovi full_response dall'output se presente
    const cleanedData = { ...data };
    if (cleanedData.full_response) {
      delete cleanedData.full_response;
    }

    return new Response(
      JSON.stringify(cleanedData),
      { 
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
