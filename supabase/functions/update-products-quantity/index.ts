
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

    console.log('Starting products quantity update process...');

    // Get all records from products_quantity table
    const { data: productsQuantity, error: fetchError } = await supabase
      .from('products_quantity')
      .select('*');

    if (fetchError) {
      console.error('Error fetching products_quantity:', fetchError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to fetch products_quantity data' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!productsQuantity || productsQuantity.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No products_quantity records found',
          updated_count: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${productsQuantity.length} products...`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each product quantity record
    for (const product of productsQuantity) {
      try {
        console.log(`Processing product ID: ${product.id}`);

        if (!product.fornitore_url) {
          console.log(`Skipping product ${product.id} - no fornitore_url`);
          results.push({
            id: product.id,
            success: false,
            error: 'Missing fornitore_url'
          });
          errorCount++;
          continue;
        }

        // Prepare request options
        const requestOptions: RequestInit = {
          method: product.http_method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Supabase-Edge-Function/1.0'
          }
        };

        // Add custom headers if present
        if (product.header_http && typeof product.header_http === 'object') {
          Object.assign(requestOptions.headers, product.header_http);
          console.log(`Added custom headers for ${product.id}:`, product.header_http);
        }

        // Add body for POST requests
        if (product.http_method === 'POST' && product.payload_template) {
          requestOptions.body = JSON.stringify(product.payload_template);
          console.log(`Added POST body for ${product.id}`);
        }

        console.log(`Making ${product.http_method} request to: ${product.fornitore_url}`);

        // Make HTTP request
        const response = await fetch(product.fornitore_url, requestOptions);
        const responseText = await response.text();

        console.log(`Response status for ${product.id}: ${response.status}`);

        if (!response.ok) {
          console.error(`HTTP error for ${product.id}: ${response.status} - ${responseText}`);
          results.push({
            id: product.id,
            success: false,
            error: `HTTP ${response.status}: ${responseText}`
          });
          errorCount++;
          continue;
        }

        let jsonResponse;
        try {
          jsonResponse = JSON.parse(responseText);
        } catch (parseError) {
          console.error(`JSON parse error for ${product.id}:`, parseError);
          results.push({
            id: product.id,
            success: false,
            error: 'Invalid JSON response'
          });
          errorCount++;
          continue;
        }

        // Extract quantity using path_body
        let extractedQuantity = null;
        if (product.path_body && product.path_body.trim()) {
          const pathParts = product.path_body.split('.');
          let currentData = jsonResponse;
          
          for (const part of pathParts) {
            if (currentData && typeof currentData === 'object') {
              if (Array.isArray(currentData) && !isNaN(parseInt(part))) {
                currentData = currentData[parseInt(part)];
              } else if (part in currentData) {
                currentData = currentData[part];
              } else {
                currentData = null;
                break;
              }
            } else {
              currentData = null;
              break;
            }
          }
          
          extractedQuantity = currentData;
          console.log(`Extracted data for ${product.id} using path "${product.path_body}":`, extractedQuantity);
        } else {
          // If no path_body, try to find quantity in common fields
          extractedQuantity = jsonResponse.quantity || jsonResponse.amount || jsonResponse.count;
          console.log(`No path_body specified for ${product.id}, found:`, extractedQuantity);
        }

        // Apply regex if specified
        if (product.regex_output && product.regex_output.trim() && extractedQuantity) {
          try {
            const regex = new RegExp(product.regex_output);
            const regexMatch = String(extractedQuantity).match(regex);
            if (regexMatch) {
              extractedQuantity = regexMatch[0];
              console.log(`Applied regex for ${product.id}:`, extractedQuantity);
            }
          } catch (regexError) {
            console.error(`Regex error for ${product.id}:`, regexError);
          }
        }

        // Convert to number
        const quantityNumber = parseInt(String(extractedQuantity));
        if (isNaN(quantityNumber)) {
          console.error(`Invalid quantity for ${product.id}:`, extractedQuantity);
          results.push({
            id: product.id,
            success: false,
            error: `Invalid quantity extracted: ${extractedQuantity}`
          });
          errorCount++;
          continue;
        }

        console.log(`Final quantity for ${product.id}: ${quantityNumber}`);

        // Update both tables
        const updatePromises = [
          supabase
            .from('products')
            .update({ quantity: quantityNumber })
            .eq('id', product.id),
          supabase
            .from('products_quantity')
            .update({ quantity: quantityNumber })
            .eq('id', product.id)
        ];

        const updateResults = await Promise.all(updatePromises);

        let updateSuccess = true;
        let updateErrors = [];

        for (let i = 0; i < updateResults.length; i++) {
          const { error } = updateResults[i];
          if (error) {
            updateSuccess = false;
            updateErrors.push(`Table ${i === 0 ? 'products' : 'products_quantity'}: ${error.message}`);
            console.error(`Update error for ${product.id} in table ${i === 0 ? 'products' : 'products_quantity'}:`, error);
          }
        }

        if (updateSuccess) {
          console.log(`Successfully updated quantity for ${product.id}: ${quantityNumber}`);
          results.push({
            id: product.id,
            success: true,
            quantity: quantityNumber
          });
          successCount++;
        } else {
          results.push({
            id: product.id,
            success: false,
            error: `Update failed: ${updateErrors.join(', ')}`
          });
          errorCount++;
        }

      } catch (error) {
        console.error(`Error processing product ${product.id}:`, error);
        results.push({
          id: product.id,
          success: false,
          error: error.message || 'Unknown error'
        });
        errorCount++;
      }

      // Add small delay between requests to avoid overwhelming servers
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Update process completed. Success: ${successCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Processed ${productsQuantity.length} products`,
        updated_count: successCount,
        error_count: errorCount,
        results: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
