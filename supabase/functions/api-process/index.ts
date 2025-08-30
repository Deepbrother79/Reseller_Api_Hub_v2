
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
    let product_name, product_id, token, qty, use_master_token;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      product_name = url.searchParams.get('product_name') || url.searchParams.get('product');
      product_id = url.searchParams.get('product_id');
      token = url.searchParams.get('token');
      qty = parseInt(url.searchParams.get('qty') || '0') || 0;
      use_master_token = url.searchParams.get('use_master_token') === 'true';
    } else if (req.method === 'POST') {
      const body = await req.json();
      console.log('POST body received:', JSON.stringify(body));
      product_name = body.product_name || body.product;
      product_id = body.product_id;
      token = body.token;
      qty = parseInt(body.qty || '0') || 0;
      use_master_token = Boolean(body.use_master_token);
      console.log('Parsed values:', { product_name, product_id, token, qty, use_master_token });
    } else {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input - support both product_name and product_id
    if ((!product_name && !product_id) || !token || qty <= 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required parameters: (product_name OR product_id), token, qty' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If product_name was provided but not product_id, look up the product_id
    let finalProductId = product_id;
    if (!product_id && product_name) {
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id')
        .eq('name', product_name)
        .single();
      
      if (productError || !product) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Product not found' 
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      finalProductId = product.id;
    }

    // Call the processa-richiesta function with product_id
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/processa-richiesta`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
        body: JSON.stringify({
          product_id: finalProductId,
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
