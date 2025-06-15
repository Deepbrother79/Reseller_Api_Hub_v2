
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email_password, token } = await req.json();
    console.log('Processing OAuth2 request for token:', token ? '[PROVIDED]' : '[NOT PROVIDED]');

    if (!email_password || !token) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Email/password credentials and authorization token are required",
          error_type: "missing_parameters"
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get GET-OAUTH2-TOKEN product from database
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id')
      .eq('name', 'GET-OAUTH2-TOKEN')
      .eq('product_type', 'digital')
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Product GET-OAUTH2-TOKEN not found or not configured as digital product`,
          error_type: "product_not_found"
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: tokenData, error: tokenError } = await supabase
      .from('tokens')
      .select('*')
      .eq('token', token)
      .eq('product_id', product.id)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Invalid Token: Token not found or not authorized for GET-OAUTH2-TOKEN product. Please verify your token is correct and valid.`,
          error_type: "invalid_token"
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (tokenData.credits < 1) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Insufficient credits for GET-OAUTH2-TOKEN. Available: ${tokenData.credits}, Required: 1`,
          error_type: "insufficient_credits"
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse email and password from input
    const parts = email_password.split('|');
    if (parts.length !== 2) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Invalid email/password format. Expected format: email@domain.com|password',
          error_type: "invalid_format"
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const [email, password] = parts;

    // Get API key from environment or use a default one
    const apiKey = Deno.env.get('OAUTH2_API_KEY') || 'default-api-key';

    // Make request to OAuth2 API
    try {
      const oauthResponse = await fetch('https://api.dongvanfb.net/api/getOauth2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
          apikey: apiKey
        })
      });

      const oauthData = await oauthResponse.json();
      console.log('OAuth2 API response:', oauthResponse.status, oauthData);

      if (!oauthResponse.ok) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `OAuth2 API error: ${oauthData.message || 'Request failed'}`,
            error_type: "oauth2_api_error",
            api_response: oauthData
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update credits
      const { error: updateError } = await supabase
        .from('tokens')
        .update({ credits: tokenData.credits - 1 })
        .eq('token', token);

      if (updateError) {
        console.error('Failed to update credits:', updateError);
      }

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          token: token,
          product_id: product.id,
          product_name: 'GET-OAUTH2-TOKEN',
          qty: 1,
          status: 'success',
          response_data: oauthData,
          output_result: [JSON.stringify(oauthData)]
        });

      if (transactionError) {
        console.error('Failed to create transaction record:', transactionError);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: oauthData,
          message: "OAuth2 token retrieved successfully"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Error calling OAuth2 API:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Failed to connect to OAuth2 service: ${error.message}`,
          error_type: "connection_error"
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in get-oauth2-token function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Server error: ${error.message}`,
        error_type: "server_error"
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
