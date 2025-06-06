
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product_name, token, qty } = await req.json();
    console.log('Processing request:', { product_name, token, qty });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate input
    if (!product_name || !token || !qty) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Missing required fields: product_name, token, qty" 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get product information
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('name', product_name)
      .single();

    if (productError || !product) {
      console.error('Product not found:', productError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Product not found" 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check token and credits
    const { data: tokenData, error: tokenError } = await supabase
      .from('tokens')
      .select('*')
      .eq('token', token)
      .eq('product_id', product.id)
      .single();

    if (tokenError || !tokenData) {
      console.error('Invalid token:', tokenError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Invalid token or token not found for this product" 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (tokenData.crediti < qty) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Insufficient credits. Available: ${tokenData.crediti}, Required: ${qty}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Simulate API call to external provider
    let apiResponse;
    let status = 'success';
    
    try {
      console.log(`Making ${product.http_method} API call to ${product.fornitore_url}`);
      
      // Prepare request options based on HTTP method
      const requestOptions: RequestInit = {
        method: product.http_method,
        headers: {
          'Content-Type': 'application/json',
        }
      };

      // Add body only for POST requests and if payload_template exists
      if (product.http_method === 'POST' && product.payload_template) {
        requestOptions.body = JSON.stringify(product.payload_template);
      }

      // Simulate external API call
      apiResponse = {
        success: true,
        data: `Successfully processed ${qty} units of ${product_name} using ${product.http_method} method`,
        timestamp: new Date().toISOString(),
        method: product.http_method
      };
      
    } catch (apiError) {
      console.error('External API error:', apiError);
      status = 'failed';
      apiResponse = {
        success: false,
        error: apiError.message
      };
    }

    // Create transaction record
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        token: token,
        product_id: product.id,
        qty: qty,
        status: status,
        response_data: apiResponse
      });

    if (transactionError) {
      console.error('Transaction creation error:', transactionError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Failed to create transaction record" 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update token credits only if successful
    if (status === 'success') {
      const { error: updateError } = await supabase
        .from('tokens')
        .update({ crediti: tokenData.crediti - qty })
        .eq('token', token);

      if (updateError) {
        console.error('Credit update error:', updateError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Failed to update credits" 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: status === 'success' 
          ? `Successfully processed ${qty} units of ${product_name}. Remaining credits: ${tokenData.crediti - qty}`
          : "Request processed but external API failed"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: "Internal server error" 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
