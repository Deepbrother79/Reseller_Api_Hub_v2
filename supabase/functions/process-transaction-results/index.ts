import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting transaction results processing with new logic...')

    // Fetch all configuration rows from processed_used_goods table
    const { data: configs, error: configError } = await supabaseClient
      .from('processed_used_goods')
      .select('*')
      .order('created_at', { ascending: true })

    if (configError) {
      console.error('Error fetching configs:', configError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch processing configurations' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!configs || configs.length === 0) {
      console.log('No processing configurations found')
      return new Response(
        JSON.stringify({ message: 'No processing configurations found', processedCount: 0 }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Found ${configs.length} processing configurations`)

    let totalProcessedTransactions = 0
    let totalSuccessfulInserts = 0
    let totalErrors = 0

    // Process each configuration
    for (const config of configs) {
      console.log(`Processing config ${config.id}`)

      // Parse used_items (comma-separated product IDs)
      const targetProductIds = config.used_items.split(',').map(id => id.trim())
      const destinationProductId = config.digit_item_ref
      const startCheckMinutes = config.start_check_time
      const lastCheckTime = new Date(config.last_check_time)

      console.log('Config details:', {
        targetProductIds,
        destinationProductId,
        startCheckMinutes,
        lastCheckTime: lastCheckTime.toISOString()
      })

      // Calculate time window
      const now = new Date()
      const startCheckTime = new Date(now.getTime() - (startCheckMinutes * 60 * 1000))

      // Fetch transactions after lastCheckTime and after startCheckMinutes
      const timeThreshold = lastCheckTime > startCheckTime ? lastCheckTime : startCheckTime

      console.log('Time threshold:', timeThreshold.toISOString())

      const { data: transactions, error: transactionsError } = await supabaseClient
        .from('transactions')
        .select('*')
        .in('product_id', targetProductIds)
        .eq('status', 'success')
        .gt('timestamp', timeThreshold.toISOString())
        .order('timestamp', { ascending: true })

      if (transactionsError) {
        console.error('Error fetching transactions for config', config.id, ':', transactionsError)
        continue
      }

      if (!transactions || transactions.length === 0) {
        console.log(`No new transactions found for config ${config.id}`)
        continue
      }

      console.log(`Found ${transactions.length} transactions to process for config ${config.id}`)

      // Process each transaction
      const insertPromises = []
      let latestTimestamp = lastCheckTime
      
      for (const transaction of transactions) {
        // Track the latest timestamp
        const transactionTime = new Date(transaction.timestamp)
        if (transactionTime > latestTimestamp) {
          latestTimestamp = transactionTime
        }

        let outputResults = []
        
        // Parse output_result - it can be string or array
        if (transaction.output_result) {
          if (typeof transaction.output_result === 'string') {
            try {
              // Try to parse as JSON first
              const parsed = JSON.parse(transaction.output_result)
              outputResults = Array.isArray(parsed) ? parsed : [parsed]
            } catch {
              // If not JSON, treat as single string
              outputResults = [transaction.output_result]
            }
          } else if (Array.isArray(transaction.output_result)) {
            outputResults = transaction.output_result
          } else {
            // If it's an object, convert to array
            outputResults = [transaction.output_result]
          }
        }

        console.log(`Transaction ${transaction.id} has ${outputResults.length} results`)

        // Create insert operations for each result
        for (const result of outputResults) {
          let cleanResult = result
          
          // Clean the result: remove brackets and quotes if it's a string
          if (typeof result === 'string') {
            cleanResult = result.replace(/^\["|"\]$/g, '').replace(/^"|"$/g, '')
          } else {
            // If it's not a string, convert to string and clean
            cleanResult = String(result).replace(/^\["|"\]$/g, '').replace(/^"|"$/g, '')
          }

          if (cleanResult && cleanResult.trim()) {
            insertPromises.push(
              supabaseClient
                .from('digital_products')
                .insert({
                  content: cleanResult.trim(),
                  product_id: destinationProductId,
                  is_used: false
                })
            )
          }
        }
      }

      // Execute all inserts for this config
      if (insertPromises.length > 0) {
        const results = await Promise.allSettled(insertPromises)
        
        // Count successful inserts
        let successCount = 0
        let errorCount = 0
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && !result.value.error) {
            successCount++
          } else {
            errorCount++
            console.error(`Insert ${index} failed for config ${config.id}:`, 
              result.status === 'rejected' ? result.reason : result.value.error)
          }
        })

        totalProcessedTransactions += transactions.length
        totalSuccessfulInserts += successCount
        totalErrors += errorCount

        // Update last_check_time with the latest transaction timestamp
        if (latestTimestamp > lastCheckTime) {
          const { error: updateError } = await supabaseClient
            .from('processed_used_goods')
            .update({ last_check_time: latestTimestamp.toISOString() })
            .eq('id', config.id)

          if (updateError) {
            console.error(`Error updating last_check_time for config ${config.id}:`, updateError)
          } else {
            console.log(`Updated last_check_time for config ${config.id} to:`, latestTimestamp.toISOString())
          }
        }

        console.log(`Config ${config.id} processing complete. Successful inserts: ${successCount}, Errors: ${errorCount}`)
      }
    }

    console.log(`Overall processing complete. Total transactions: ${totalProcessedTransactions}, Total successful inserts: ${totalSuccessfulInserts}, Total errors: ${totalErrors}`)

    return new Response(
      JSON.stringify({ 
        message: 'Processing complete',
        processedConfigurations: configs.length,
        totalProcessedTransactions,
        totalSuccessfulInserts,
        totalErrors
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})