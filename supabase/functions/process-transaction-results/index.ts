import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
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

    console.log('Starting transaction results processing...');

    // Fetch all configuration rows from processed_used_goods table
    const { data: configs, error: configError } = await supabaseClient
      .from('processed_used_goods')
      .select('*')
      .order('created_at', { ascending: true });

    if (configError) {
      console.error('Error fetching configs:', configError);
      return new Response(JSON.stringify({
        error: 'Failed to fetch processing configurations'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!configs || configs.length === 0) {
      console.log('No processing configurations found');
      return new Response(JSON.stringify({
        message: 'No processing configurations found',
        processedCount: 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found ${configs.length} processing configurations`);

    let totalProcessedTransactions = 0;
    let totalSuccessfulInserts = 0;
    let totalErrors = 0;

    // Process each configuration
    for (const config of configs) {
      console.log(`Processing config ${config.id}`);

      // Parse used_items (comma-separated product IDs)
      const targetProductIds = config.used_items
        .split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0); // Remove empty strings

      const destinationProductId = config.digit_item_ref;
      const startCheckMinutes = config.start_check_time;
      const lastCheckTime = new Date(config.last_check_time);

      console.log('Config details:', {
        configId: config.id,
        targetProductIds,
        destinationProductId,
        startCheckMinutes,
        lastCheckTime: lastCheckTime.toISOString()
      });

      // Calculate time window
      const now = new Date();
      // start_check_time è il numero di minuti che devono essere passati dalla creazione della transazione
      // Le transazioni devono essere create PRIMA di questo tempo per essere processate
      const startCheckTime = new Date(now.getTime() - startCheckMinutes * 60 * 1000);
      
      console.log(`Current time: ${now.toISOString()}`);
      console.log(`Start check time (${startCheckMinutes} minutes ago): ${startCheckTime.toISOString()}`);
      console.log(`Last check time: ${lastCheckTime.toISOString()}`);

      // First, check if there are any transactions newer than last_check_time for these products
      const { data: newerTransactions, error: newerTransactionsError } = await supabaseClient
        .from('transactions')
        .select('timestamp')
        .in('product_id', targetProductIds)
        .gt('timestamp', lastCheckTime.toISOString())
        .order('timestamp', { ascending: false })
        .limit(1);

      if (newerTransactionsError) {
        console.error(`Error checking for newer transactions for config ${config.id}:`, newerTransactionsError);
        totalErrors++;
        continue;
      }

      // If no newer transactions exist, update last_check_time to current time and skip processing
      if (!newerTransactions || newerTransactions.length === 0) {
        console.log(`No newer transactions found for config ${config.id}, updating last_check_time to current time`);
        
        const currentTimestamp = new Date().toISOString();
        const { error: updateError } = await supabaseClient
          .from('processed_used_goods')
          .update({
            last_check_time: currentTimestamp
          })
          .eq('id', config.id);

        if (updateError) {
          console.error(`Error updating last_check_time for config ${config.id}:`, updateError);
        } else {
          console.log(`Updated last_check_time for config ${config.id} to: ${currentTimestamp}`);
        }
        continue;
      }

      // Fetch transactions that are:
      // 1. Created AFTER last_check_time (to avoid reprocessing)
      // 2. Created BEFORE start_check_time (to ensure they are old enough)
      // 3. Have status = 'success'
      // 4. Don't have 'Refunded' in the note field
      const { data: transactions, error: transactionsError } = await supabaseClient
        .from('transactions')
        .select('*')
        .in('product_id', targetProductIds)
        .eq('status', 'success')
        .gt('timestamp', lastCheckTime.toISOString())
        .lt('timestamp', startCheckTime.toISOString())
        .or('note.is.null,note.neq.Refunded')
        .order('timestamp', { ascending: true });

      if (transactionsError) {
        console.error(`Error fetching transactions for config ${config.id}:`, transactionsError);
        totalErrors++;
        continue;
      }

      if (!transactions || transactions.length === 0) {
        console.log(`No new transactions found for config ${config.id}`);
        continue;
      }

      console.log(`Found ${transactions.length} transactions to process for config ${config.id}`);

      // Process each transaction
      const insertPromises = [];
      let latestTimestamp = lastCheckTime;

      for (const transaction of transactions) {
        console.log(`Processing transaction ${transaction.id} with timestamp ${transaction.timestamp}, note: ${transaction.note || 'NULL'}`);
        
        // Track the latest timestamp
        const transactionTime = new Date(transaction.timestamp);
        if (transactionTime > latestTimestamp) {
          latestTimestamp = transactionTime;
        }

        let outputResults = [];

        // Parse output_result - handle different formats
        if (transaction.output_result) {
          try {
            // If it's already an array, use it directly
            if (Array.isArray(transaction.output_result)) {
              outputResults = transaction.output_result;
            } 
            // If it's a string, try to parse as JSON
            else if (typeof transaction.output_result === 'string') {
              const parsed = JSON.parse(transaction.output_result);
              outputResults = Array.isArray(parsed) ? parsed : [parsed];
            }
            // If it's an object, convert to array
            else {
              outputResults = [transaction.output_result];
            }
          } catch (parseError) {
            console.error(`Error parsing output_result for transaction ${transaction.id}:`, parseError);
            // If JSON parsing fails, treat as single string
            outputResults = [transaction.output_result];
          }
        }

        console.log(`Transaction ${transaction.id} has ${outputResults.length} results to process`);

        // Create insert operations for each result
        for (let i = 0; i < outputResults.length; i++) {
          const result = outputResults[i];
          let cleanResult = result;

          // Clean the result: remove brackets and quotes
          if (typeof result === 'string') {
            // Remove array brackets and quotes
            cleanResult = result
              .replace(/^\["|"\]$/g, '') // Remove ["..."]
              .replace(/^"|"$/g, '')     // Remove "..."
              .replace(/^\[|\]$/g, '')   // Remove [...] 
              .trim();
          } else {
            // Convert to string and clean
            cleanResult = String(result)
              .replace(/^\["|"\]$/g, '')
              .replace(/^"|"$/g, '')
              .replace(/^\[|\]$/g, '')
              .trim();
          }

          if (cleanResult && cleanResult.length > 0) {
            console.log(`Preparing insert for result ${i + 1}: "${cleanResult}"`);
            
            insertPromises.push(
              supabaseClient
                .from('digital_products')
                .insert({
                  content: cleanResult,
                  product_id: destinationProductId,
                  is_used: false
                })
            );
          } else {
            console.log(`Skipping empty result ${i + 1} for transaction ${transaction.id}`);
          }
        }
      }

      // Execute all inserts for this config
      if (insertPromises.length > 0) {
        console.log(`Executing ${insertPromises.length} insert operations for config ${config.id}`);
        
        const results = await Promise.allSettled(insertPromises);

        // Count successful inserts
        let successCount = 0;
        let errorCount = 0;

        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && !result.value.error) {
            successCount++;
          } else {
            errorCount++;
            console.error(`Insert ${index + 1} failed for config ${config.id}:`, 
              result.status === 'rejected' ? result.reason : result.value.error);
          }
        });

        totalProcessedTransactions += transactions.length;
        totalSuccessfulInserts += successCount;
        totalErrors += errorCount;

        console.log(`Config ${config.id} processing complete. Successful inserts: ${successCount}, Errors: ${errorCount}`);

        // Update last_check_time only if we processed transactions and have a newer timestamp
        if (latestTimestamp > lastCheckTime) {
          // Add a small buffer (1 millisecond) to ensure we don't reprocess the same timestamp
          const updateTimestamp = new Date(latestTimestamp.getTime() + 1);
          
          const { error: updateError } = await supabaseClient
            .from('processed_used_goods')
            .update({
              last_check_time: updateTimestamp.toISOString()
            })
            .eq('id', config.id);

          if (updateError) {
            console.error(`Error updating last_check_time for config ${config.id}:`, updateError);
          } else {
            console.log(`Updated last_check_time for config ${config.id} to: ${updateTimestamp.toISOString()}`);
          }
        }
      } else {
        console.log(`No valid results to insert for config ${config.id}`);
      }
    }

    console.log(`Overall processing complete. Total transactions: ${totalProcessedTransactions}, Total successful inserts: ${totalSuccessfulInserts}, Total errors: ${totalErrors}`);

    return new Response(JSON.stringify({
      message: 'Processing complete',
      processedConfigurations: configs.length,
      totalProcessedTransactions,
      totalSuccessfulInserts,
      totalErrors
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});