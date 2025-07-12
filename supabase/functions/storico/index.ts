
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
    const { token } = await req.json();
    console.log('Retrieving history for token:', token);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate input
    if (!token) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Token is required" 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token exists in either tokens or tokens_master table
    const { data: regularToken } = await supabase
      .from('tokens')
      .select('token')
      .eq('token', token)
      .maybeSingle();

    const { data: masterToken } = await supabase
      .from('tokens_master')
      .select('token')
      .eq('token', token)
      .maybeSingle();

    if (!regularToken && !masterToken) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Token not found" 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get transactions for the token - only successful ones
    const { data: transactions, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('token', token)
      .eq('status', 'success')
      .order('timestamp', { ascending: false });

    if (transactionError) {
      console.error('Transaction query error:', transactionError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Failed to retrieve transaction history" 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        transactions: transactions || [] 
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
