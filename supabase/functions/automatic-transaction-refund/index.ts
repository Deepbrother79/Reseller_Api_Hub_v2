import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting automatic transaction refund process...');

    // Get all refund payload configurations
    const { data: refundConfigs, error: configError } = await supabaseClient
      .from('refund_payload_transactions')
      .select('*');

    if (configError) {
      console.error('Error fetching refund configurations:', configError);
      return new Response(JSON.stringify({
        error: 'Failed to fetch refund configurations'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log(`Found ${refundConfigs?.length || 0} refund configurations`);

    let totalProcessed = 0;
    let totalRefunded = 0;

    // Process each refund configuration
    for (const config of refundConfigs || []) {
      console.log(`Processing config ID ${config.id} with payloads: "${config.payloads}" and timing: ${config.Timing_hour} hours`);

      // Parse payloads (split by comma if multiple)
      const payloads = config.payloads.split(',').map(p => p.trim().toLowerCase());

      // Calculate time threshold
      const now = new Date();
      const timeThreshold = new Date(now.getTime() - config.Timing_hour * 60 * 60 * 1000);

      console.log(`Looking for transactions after: ${timeThreshold.toISOString()}`);

      // Find transactions that match criteria
      const { data: transactions, error: transError } = await supabaseClient
        .from('transactions')
        .select('*')
        .eq('status', 'success')
        .gte('timestamp', timeThreshold.toISOString());

      if (transError) {
        console.error('Error fetching transactions:', transError);
        continue;
      }

      console.log(`Found ${transactions?.length || 0} successful transactions in time window`);

      // Filter transactions that contain error payloads
      const eligibleTransactions = transactions?.filter(transaction => {
        if (!transaction.output_result) return false;

        const outputStr = JSON.stringify(transaction.output_result).toLowerCase();
        const hasErrorPayload = payloads.some(payload => outputStr.includes(payload));

        if (hasErrorPayload) {
          console.log(`Transaction ${transaction.id} contains error payload: ${outputStr}`);
        }

        return hasErrorPayload;
      }) || [];

      console.log(`Found ${eligibleTransactions.length} transactions eligible for refund`);
      totalProcessed += eligibleTransactions.length;

      // Process refunds
      for (const transaction of eligibleTransactions) {
        try {
          // Get current note value
          const currentNote = transaction.note || '';
          
          // Prepare updated note with "Refunded" appended
          const updatedNote = currentNote 
            ? `${currentNote} Refunded` 
            : 'Refunded';

          // Update transaction output_result to "Order Refunded" and add "Refunded" to note
          const { error: updateError } = await supabaseClient
            .from('transactions')
            .update({
              output_result: ["Order Refunded"],
              note: updatedNote
            })
            .eq('id', transaction.id);

          if (updateError) {
            console.error(`Error updating transaction ${transaction.id}:`, updateError);
            continue;
          }

          // Get current token credits
          const { data: tokenData, error: tokenError } = await supabaseClient
            .from('tokens')
            .select('credits, Note')
            .eq('token', transaction.token)
            .single();

          if (tokenError) {
            console.error(`Error fetching token ${transaction.token}:`, tokenError);
            continue;
          }

          // Add refunded credits back to token
          const newCredits = (tokenData.credits || 0) + transaction.qty;
          const currentTokenNote = tokenData.Note || '';
          const refundNote = `${currentTokenNote} Refunded (${transaction.id})`.trim();

          const { error: creditError } = await supabaseClient
            .from('tokens')
            .update({
              credits: newCredits,
              Note: refundNote
            })
            .eq('token', transaction.token);

          if (creditError) {
            console.error(`Error updating token credits for ${transaction.token}:`, creditError);
            continue;
          }

          console.log(`Refunded ${transaction.qty} credits to token ${transaction.token} for transaction ${transaction.id}`);
          console.log(`Updated transaction ${transaction.id} note to: "${updatedNote}"`);
          totalRefunded++;

        } catch (error) {
          console.error(`Error processing refund for transaction ${transaction.id}:`, error);
        }
      }
    }

    console.log(`Refund process completed. Processed: ${totalProcessed}, Refunded: ${totalRefunded}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${totalProcessed} transactions, refunded ${totalRefunded}`,
      totalProcessed,
      totalRefunded
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error in automatic-transaction-refund function:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
