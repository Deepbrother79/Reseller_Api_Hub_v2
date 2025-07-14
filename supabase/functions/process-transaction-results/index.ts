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

    console.log('Starting transaction results processing...')

    // Target product IDs to extract results from
    const targetProductIds = [
      '2ab279e8-714f-434e-92e9-875f734c0eed',
      '92e09be4-b552-48d8-b474-9e01d10b1cf3'
    ]

    // Destination product ID for digital_products
    const destinationProductId = '86a2bb3d-f3c4-4f90-ac96-a2b7575467f8'

    const now = new Date()
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000)

    console.log(`Processing transactions between ${sixHoursAgo.toISOString()} and ${thirtyMinutesAgo.toISOString()}`)

    // Get transactions that meet the criteria
    const { data: transactions, error: transactionsError } = await supabaseClient
      .from('transactions')
      .select('id, output_result, timestamp')
      .in('product_id', targetProductIds)
      .eq('status', 'success')
      .gte('timestamp', sixHoursAgo.toISOString())
      .lte('timestamp', thirtyMinutesAgo.toISOString())

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch transactions' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!transactions || transactions.length === 0) {
      console.log('No transactions found matching criteria')
      return new Response(
        JSON.stringify({ message: 'No transactions to process', processed: 0 }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Found ${transactions.length} transactions to process`)

    // Check which transactions have already been processed
    const transactionIds = transactions.map(t => t.id)
    
    // We'll use a custom approach to track processed transactions
    // First, let's get all digital_products that might have been created from these transactions
    const { data: existingDigitalProducts, error: existingError } = await supabaseClient
      .from('digital_products')
      .select('id')
      .eq('product_id', destinationProductId)

    if (existingError) {
      console.error('Error checking existing digital products:', existingError)
    }

    let totalProcessed = 0
    const insertPromises = []

    for (const transaction of transactions) {
      try {
        if (!transaction.output_result) {
          console.log(`Transaction ${transaction.id} has no output_result, skipping`)
          continue
        }

        let results = []
        
        // Parse output_result - it could be a string or already parsed array
        if (typeof transaction.output_result === 'string') {
          try {
            results = JSON.parse(transaction.output_result)
          } catch (parseError) {
            console.error(`Error parsing output_result for transaction ${transaction.id}:`, parseError)
            continue
          }
        } else if (Array.isArray(transaction.output_result)) {
          results = transaction.output_result
        } else {
          // Single result case
          results = [transaction.output_result]
        }

        // Ensure results is an array
        if (!Array.isArray(results)) {
          results = [results]
        }

        console.log(`Processing transaction ${transaction.id} with ${results.length} results`)

        // Create digital_products entries for each result
        for (const result of results) {
          if (result && typeof result === 'string' && result.trim()) {
            // Clean the result - remove quotes and brackets if present
            const cleanResult = result.toString().replace(/^["'\[\]]+|["'\[\]]+$/g, '').trim()
            
            if (cleanResult) {
              const digitalProductInsert = {
                product_id: destinationProductId,
                content: cleanResult,
                is_used: false
              }

              insertPromises.push(
                supabaseClient
                  .from('digital_products')
                  .insert(digitalProductInsert)
              )
              
              totalProcessed++
            }
          }
        }

      } catch (error) {
        console.error(`Error processing transaction ${transaction.id}:`, error)
      }
    }

    // Execute all inserts
    if (insertPromises.length > 0) {
      console.log(`Inserting ${insertPromises.length} digital products...`)
      
      const insertResults = await Promise.allSettled(insertPromises)
      
      let successfulInserts = 0
      let failedInserts = 0
      
      insertResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && !result.value.error) {
          successfulInserts++
        } else {
          failedInserts++
          console.error(`Insert ${index} failed:`, result.status === 'rejected' ? result.reason : result.value.error)
        }
      })

      console.log(`Inserts completed: ${successfulInserts} successful, ${failedInserts} failed`)
    }

    return new Response(
      JSON.stringify({
        message: 'Transaction results processed successfully',
        processed: totalProcessed,
        transactions_found: transactions.length
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