import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Exchange rate: VND to USD (easily modifiable)
const VND_TO_USD_RATE = 26200; // 1 USD = 26,200 VND
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
// Calculate markup based on VND price
function calculateMarkup(priceVND) {
  if (priceVND >= 1 && priceVND <= 49) {
    return 1.50; // +50%
  } else if (priceVND >= 50 && priceVND <= 499) {
    return 1.35; // +30%
  } else if (priceVND >= 500 && priceVND <= 1000) {
    return 1.25; // +25%
  } else if (priceVND >= 1000 && priceVND <= 2500) {
    return 1.20; // +20%
  } else if (priceVND >= 2500 && priceVND <= 5000) {
    return 1.18; // +20%
  } else {
    return 1.15; // +15% for 5000+
  }
}
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Starting products prices update process...');
    // Get all products to update their prices
    const { data: products, error: productsError } = await supabase.from('products').select('id, name');
    if (productsError) {
      console.error('Error fetching products:', productsError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch products'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (!products || products.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No products found',
        updated_count: 0
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`Processing ${products.length} products for price updates...`);
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    // Process each product
    for (const product of products){
      try {
        console.log(`Processing product ID: ${product.id}`);
        // Get product quantity configuration
        const { data: productQuantity, error: fetchError } = await supabase.from('products_quantity').select('*').eq('id', product.id).single();
        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            console.log(`No products_quantity record found for ${product.id}, skipping`);
            results.push({
              id: product.id,
              success: false,
              error: 'No products_quantity configuration found'
            });
            errorCount++;
            continue;
          } else {
            console.error(`Error fetching products_quantity for ${product.id}:`, fetchError);
            results.push({
              id: product.id,
              success: false,
              error: `Failed to fetch products_quantity: ${fetchError.message}`
            });
            errorCount++;
            continue;
          }
        }
        // Skip if no path_body_value or fornitore_url
        if (!productQuantity.path_body_value || !productQuantity.fornitore_url) {
          console.log(`Skipping product ${product.id} - missing path_body_value or fornitore_url`);
          results.push({
            id: product.id,
            success: false,
            error: 'Missing path_body_value or fornitore_url configuration'
          });
          errorCount++;
          continue;
        }
        let finalPriceUSD = 1.0000; // Default value
        try {
          const requestOptions = {
            method: productQuantity.http_method || 'GET',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Supabase-Edge-Function/1.0'
            }
          };
          if (productQuantity.header_http && typeof productQuantity.header_http === 'object') {
            Object.assign(requestOptions.headers, productQuantity.header_http);
          }
          if (productQuantity.http_method === 'POST' && productQuantity.payload_template) {
            requestOptions.body = JSON.stringify(productQuantity.payload_template);
          }
          console.log(`Making ${productQuantity.http_method} request to: ${productQuantity.fornitore_url}`);
          const response = await fetch(productQuantity.fornitore_url, requestOptions);
          const responseText = await response.text();
          console.log(`Response status for ${product.id}: ${response.status}`);
          if (!response.ok) {
            console.error(`HTTP error for ${product.id}: ${response.status} - ${responseText}`);
            finalPriceUSD = 1.0000;
          } else {
            let jsonResponse;
            try {
              jsonResponse = JSON.parse(responseText);
            } catch (parseError) {
              console.error(`JSON parse error for ${product.id}:`, parseError);
              finalPriceUSD = 1.0000;
            }
            if (jsonResponse) {
              let extractedPrice = null;
              // Extract price using path_body_value
              const pathParts = productQuantity.path_body_value.split('.');
              let currentData = jsonResponse;
              for (const part of pathParts){
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
              extractedPrice = currentData;
              console.log(`Extracted price for ${product.id} using path "${productQuantity.path_body_value}":`, extractedPrice);
              // Apply regex if specified
              if (productQuantity.regex_output && productQuantity.regex_output.trim() && extractedPrice) {
                try {
                  const regex = new RegExp(productQuantity.regex_output);
                  const regexMatch = String(extractedPrice).match(regex);
                  if (regexMatch) {
                    extractedPrice = regexMatch[0];
                    console.log(`Applied regex for ${product.id}:`, extractedPrice);
                  }
                } catch (regexError) {
                  console.error(`Regex error for ${product.id}:`, regexError);
                }
              }
              // Convert to number and process
              const priceVND = parseFloat(String(extractedPrice));
              if (!isNaN(priceVND) && priceVND > 0) {
                // Apply markup based on price range
                const markup = calculateMarkup(priceVND);
                const markedUpPriceVND = priceVND * markup;
                // Convert to USD with 4 decimal places
                finalPriceUSD = parseFloat((markedUpPriceVND / VND_TO_USD_RATE).toFixed(4));
                console.log(`Price calculation for ${product.id}: ${priceVND} VND -> ${markedUpPriceVND} VND (${markup}x) -> ${finalPriceUSD} USD`);
              } else {
                console.error(`Invalid price for ${product.id}:`, extractedPrice);
                finalPriceUSD = 1.0000;
              }
            }
          }
        } catch (apiError) {
          console.error(`API call error for ${product.id}:`, apiError);
          finalPriceUSD = 1.0000;
        }
        console.log(`Final price for ${product.id}: ${finalPriceUSD} USD`);
        // Update products table with the calculated price
        const { error: updateError } = await supabase.from('products').update({
          value: finalPriceUSD
        }).eq('id', product.id);
        if (updateError) {
          console.error(`Update error for ${product.id}:`, updateError);
          results.push({
            id: product.id,
            success: false,
            error: `Update failed: ${updateError.message}`
          });
          errorCount++;
        } else {
          console.log(`Successfully updated price for ${product.id}: ${finalPriceUSD} USD`);
          results.push({
            id: product.id,
            success: true,
            price_usd: finalPriceUSD
          });
          successCount++;
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
      await new Promise((resolve)=>setTimeout(resolve, 100));
    }
    console.log(`Price update process completed. Success: ${successCount}, Errors: ${errorCount}`);
    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${products.length} products`,
      updated_count: successCount,
      error_count: errorCount,
      exchange_rate: `1 USD = ${VND_TO_USD_RATE} VND`,
      results: results
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
