
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

    // Make real API call to external provider
    let apiResponse;
    let filteredResponse;
    let status = 'success';
    
    try {
      console.log(`Making ${product.http_method} API call to ${product.fornitore_url}`);
      
      // Replace {{qty}} placeholder in the URL
      const processedUrl = product.fornitore_url.replace(/\{\{qty\}\}/g, qty.toString());
      console.log(`Processed URL: ${processedUrl}`);
      
      // Prepare request options based on HTTP method
      const requestOptions: RequestInit = {
        method: product.http_method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Supabase-Edge-Function/1.0'
        }
      };

      // Add body only for POST requests and if payload_template exists
      if (product.http_method === 'POST' && product.payload_template) {
        // Replace {{qty}} in payload template if it exists
        let processedPayload = product.payload_template;
        if (typeof processedPayload === 'string') {
          processedPayload = processedPayload.replace(/\{\{qty\}\}/g, qty.toString());
        } else if (typeof processedPayload === 'object') {
          processedPayload = JSON.parse(
            JSON.stringify(processedPayload).replace(/\{\{qty\}\}/g, qty.toString())
          );
        }
        requestOptions.body = JSON.stringify(processedPayload);
      }

      // Make the actual HTTP request
      const response = await fetch(processedUrl, requestOptions);
      const responseText = await response.text();
      
      console.log(`External API response status: ${response.status}`);
      console.log(`External API response: ${responseText}`);
      
      if (response.ok) {
        try {
          // Try to parse as JSON
          const fullResponse = JSON.parse(responseText);
          apiResponse = fullResponse;
          
          // Extract specific path if path_body is specified
          if (product.path_body && product.path_body.trim()) {
            const pathParts = product.path_body.split('.');
            let extractedData = fullResponse;
            
            for (const part of pathParts) {
              if (extractedData && typeof extractedData === 'object' && part in extractedData) {
                extractedData = extractedData[part];
              } else {
                extractedData = fullResponse; // Fallback to full response if path not found
                break;
              }
            }
            filteredResponse = extractedData;
          } else {
            filteredResponse = fullResponse;
          }
        } catch {
          // If not JSON, store as text
          apiResponse = {
            success: true,
            data: responseText,
            status: response.status
          };
          filteredResponse = responseText;
        }
      } else {
        status = 'failed';
        apiResponse = {
          success: false,
          error: `HTTP ${response.status}: ${responseText}`,
          status: response.status
        };
        filteredResponse = apiResponse;
      }
      
    } catch (apiError) {
      console.error('External API error:', apiError);
      status = 'failed';
      apiResponse = {
        success: false,
        error: apiError.message || 'Unknown error occurred'
      };
      filteredResponse = apiResponse;
    }

    // Create transaction record with product_name
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        token: token,
        product_id: product.id,
        product_name: product.name, // Aggiungo il nome del prodotto
        qty: qty,
        status: status,
        response_data: apiResponse,
        output_result: Array.isArray(filteredResponse) ? filteredResponse : [filteredResponse]
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
        success: status === 'success', 
        message: status === 'success' 
          ? `Successfully processed ${qty} units of ${product_name}. Remaining credits: ${tokenData.crediti - qty}`
          : "Request processed but external API failed",
        api_response: filteredResponse, // Send the filtered response
        full_response: apiResponse // Also include full response for debugging
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
