
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
      .select('credits, name')
      .eq('token', token)
      .maybeSingle();

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

    return new Response(
      JSON.stringify({ 
        success: true, 
        credits: tokenData.credits,
        product_name: isMasterToken ? 'Master Token' : tokenData.name,
        is_master_token: isMasterToken
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching credits:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
