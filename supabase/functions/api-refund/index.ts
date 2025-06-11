
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { transaction_id } = await req.json();

    if (!transaction_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Transaction ID is required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if transaction exists
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transaction_id)
      .single();

    if (transactionError || !transaction) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Transaction ID not found' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if refund request already exists
    const { data: existingRefund, error: refundCheckError } = await supabase
      .from('refund_transactions')
      .select('*')
      .eq('transaction_id', transaction_id)
      .single();

    if (existingRefund) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Refund request already sent',
          refund_data: {
            refund_status: existingRefund.refund_status,
            response_message: existingRefund.response_message,
            created_at: existingRefund.created_at
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if transaction is within 1 hour of creation
    const transactionTime = new Date(transaction.timestamp);
    const now = new Date();
    const hoursDiff = (now.getTime() - transactionTime.getTime()) / (1000 * 60 * 60);

    if (hoursDiff > 1) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Refund request time expired' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send request to Azure Logic App
    const azureUrl = 'https://prod-20.centralindia.logic.azure.com:443/workflows/080ac029006c4ac79c17ca236dd516e8/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=8s4d2e6rdq9mhs_Z0FrHe0QiI1V-kmZ6HjtiJJsyk8Q';
    
    console.log('Sending refund request to Azure for transaction:', transaction_id);
    
    const azureResponse = await fetch(azureUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transaction)
    });

    let refundStatus = 'failed';
    let responseMessage = 'Server Error';

    if (azureResponse.status === 200) {
      try {
        const azureData = await azureResponse.json();
        refundStatus = azureData.refund_status || 'pending';
        responseMessage = azureData.response_message || 'Refund request processed';
      } catch (parseError) {
        console.error('Error parsing Azure response:', parseError);
        refundStatus = 'pending';
        responseMessage = 'Refund request submitted successfully';
      }
    } else {
      console.error('Azure response error:', azureResponse.status, await azureResponse.text());
    }

    // Insert refund request into database
    const { data: refundData, error: insertError } = await supabase
      .from('refund_transactions')
      .insert({
        transaction_id: transaction_id,
        refund_status: refundStatus,
        response_message: responseMessage
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting refund request:', insertError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Failed to create refund request' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Refund request submitted successfully',
        refund_data: {
          refund_status: refundData.refund_status,
          response_message: refundData.response_message,
          created_at: refundData.created_at
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing refund request:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Failed to process refund request' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
