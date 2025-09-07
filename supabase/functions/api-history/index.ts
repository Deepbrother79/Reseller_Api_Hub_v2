
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
    let token;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      token = url.searchParams.get('token');
    } else if (req.method === 'POST') {
      const body = await req.json();
      token = body.token;
    } else {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!token) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required parameter: token' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Looking for token:', token);

    // Try to find in regular tokens table first
    const { data: regularToken, error: regularTokenError } = await supabase
      .from('tokens')
      .select('credits, name, product_id, activated, locked, activation_status')
      .eq('token', token)
      .maybeSingle();

    console.log('Regular token query result:', {
      regularToken,
      regularTokenError,
      hasProductId: regularToken?.product_id ? true : false,
      productIdValue: regularToken?.product_id,
      tokenName: regularToken?.name
    });

    let tokenData = regularToken;
    let isMasterToken = false;

    // If not found in regular tokens, try master tokens
    if (!regularToken && !regularTokenError) {
      const { data: masterToken, error: masterTokenError } = await supabase
        .from('tokens_master')
        .select('credits, name')
        .eq('token', token)
        .maybeSingle();

      if (masterToken) {
        tokenData = masterToken;
        isMasterToken = true;
      }
    }

    console.log('Token query result:', { tokenData, isMasterToken });

    if (regularTokenError) {
      console.error('Database error:', regularTokenError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Database error' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tokenData) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token not found' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for rejected activation status - return data but mark as rejected
    if (!isMasterToken && tokenData.activation_status === 'Rejected') {
      // Get product_id even for rejected tokens
      let finalProductId = tokenData.product_id;
      
      // If no direct product_id, try to get it by looking up the product by name
      if (!finalProductId && tokenData.name) {
        console.log('Rejected token - No direct product_id, looking up by product name:', tokenData.name);
        
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('id')
          .eq('name', tokenData.name)
          .maybeSingle();
        
        if (product && !productError) {
          finalProductId = product.id;
          console.log('Rejected token - Found product_id by name lookup:', finalProductId);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Activation Rejected - Contact the dealer',
          credits: tokenData.credits,
          product_name: tokenData.name,
          product_id: finalProductId,
          is_master_token: false,
          activated: false,
          locked: tokenData.locked ?? false,
          activation_status: 'Rejected',
          transactions: [],
          message: 'Activation Rejected - Contact the dealer'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for pending activation status - return data but mark as pending
    if (!isMasterToken && tokenData.activation_status === 'Pending') {
      // Get product_id even for pending tokens
      let finalProductId = tokenData.product_id;
      
      // If no direct product_id, try to get it by looking up the product by name
      if (!finalProductId && tokenData.name) {
        console.log('Pending token - No direct product_id, looking up by product name:', tokenData.name);
        
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('id')
          .eq('name', tokenData.name)
          .maybeSingle();
        
        if (product && !productError) {
          finalProductId = product.id;
          console.log('Pending token - Found product_id by name lookup:', finalProductId);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Activation Pending - Contact the dealer',
          credits: tokenData.credits,
          product_name: tokenData.name,
          product_id: finalProductId,
          is_master_token: false,
          activated: false,
          locked: tokenData.locked ?? false,
          activation_status: 'Pending',
          transactions: [],
          message: 'Activation Pending - Contact the dealer'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get product_id from either direct field or by looking up the product by name
    let finalProductId = null;
    if (!isMasterToken) {
      finalProductId = tokenData.product_id;
      
      // If no direct product_id, try to get it by looking up the product by name
      if (!finalProductId && tokenData.name) {
        console.log('No direct product_id, looking up by product name:', tokenData.name);
        
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('id')
          .eq('name', tokenData.name)
          .maybeSingle();
        
        if (product && !productError) {
          finalProductId = product.id;
          console.log('Found product_id by name lookup:', finalProductId);
        } else {
          console.log('Product lookup by name failed:', productError);
        }
      }
      
      console.log('Product ID resolution:', {
        directProductId: tokenData.product_id,
        lookupProductId: finalProductId !== tokenData.product_id ? finalProductId : 'not_used',
        finalProductId,
        productName: tokenData.name
      });
    }

    // Fetch transaction history from existing storico function
    let historyData = null;
    let historyError = null;
    
    try {
      const historyResponse = await fetch(`${supabaseUrl}/functions/v1/storico`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token
        })
      });

      historyData = await historyResponse.json();
      
      if (!historyResponse.ok) {
        console.log('History API returned error:', historyData);
        historyError = historyData.error || historyData.message || 'Failed to fetch history';
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      historyError = 'Failed to fetch transaction history';
    }

    // Build unified response
    const responseData = { 
      success: true, 
      credits: tokenData.credits,
      product_name: isMasterToken ? 'Master Token' : tokenData.name,
      product_id: finalProductId,
      is_master_token: isMasterToken,
      activated: isMasterToken ? true : (tokenData.activated ?? true),
      locked: isMasterToken ? false : (tokenData.locked ?? false),
      // Include history data if available
      transactions: historyData?.transactions || [],
      message: historyError || historyData?.message || (historyData?.transactions?.length > 0 ? `Found ${historyData.transactions.length} transactions` : 'No transactions found')
    };

    console.log('API History Response:', JSON.stringify(responseData, null, 2));
    
    // Extra debug for product_id issues
    if (!isMasterToken && !finalProductId) {
      console.log('WARNING: Non-master token missing product_id!', {
        tokenData,
        allFields: Object.keys(tokenData),
        directProductId: tokenData.product_id,
        productName: tokenData.name,
        finalProductId
      });
    }

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching history and credits:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
