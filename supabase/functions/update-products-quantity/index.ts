import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
// Calculate markup based on USD price (after conversion)
function calculateDefaultMarkup(priceUSD) {
  if (priceUSD >= 0 && priceUSD <= 0.0019) {
    return 1.50; // +50%
  } else if (priceUSD >= 0.0020 && priceUSD <= 0.0199) {
    return 1.30; // +30%
  } else if (priceUSD >= 0.020 && priceUSD <= 0.0399) {
    return 1.25; // +25%
  } else if (priceUSD >= 0.04 && priceUSD <= 0.0999) {
    return 1.20; // +20%
  } else if (priceUSD >= 0.1 && priceUSD <= 0.4999) {
    return 1.15; // +15%
  } else if (priceUSD >= 0.5 && priceUSD <= 0.9999) {
    return 1.12; // +12%
  } else {
    return 1.09; // +9% for $1 and above
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
    console.log('Starting unified products update process (quantity and price)...');
    // Get all products to update
    const { data: products, error: productsError } = await supabase.from('products').select('id, product_type, name');
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
    console.log(`Processing ${products.length} products...`);
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    // Process each product
    for (const product of products){
      try {
        console.log(`Processing product ID: ${product.id}, Type: ${product.product_type}`);
        let finalQuantity = 0;
        let finalPriceUSD = 1.0000; // Default value
        if (product.product_type === 'digital') {
          // For digital products, count available items in digital_products table
          const { count, error: countError } = await supabase.from('digital_products').select('*', {
            count: 'exact',
            head: true
          }).eq('product_id', product.id).eq('is_used', false);
          if (countError) {
            console.error(`Error counting digital products for ${product.id}:`, countError);
            results.push({
              id: product.id,
              success: false,
              error: `Failed to count digital products: ${countError.message}`
            });
            errorCount++;
            continue;
          }
          finalQuantity = count || 0;
          console.log(`Digital product ${product.id} has ${finalQuantity} available items`);
          // Digital products keep their existing price (no API call needed)
          const { data: currentProduct, error: productError } = await supabase.from('products').select('value').eq('id', product.id).single();
          if (!productError && currentProduct) {
            finalPriceUSD = currentProduct.value || 1.0000;
          }
        } else {
          // For API products, get configuration from products_quantity table
          const { data: productQuantity, error: fetchError } = await supabase.from('products_quantity').select('*').eq('id', product.id).single();
          if (fetchError) {
            if (fetchError.code === 'PGRST116') {
              console.log(`No products_quantity record found for ${product.id}, setting defaults`);
              finalQuantity = 0;
              finalPriceUSD = 1.0000;
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
          } else {
            // Make API call to get both quantity and price
            if (!productQuantity.fornitore_url) {
              console.log(`Skipping product ${product.id} - no fornitore_url`);
              finalQuantity = 0;
              finalPriceUSD = 1.0000;
            } else {
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
                  finalQuantity = 0;
                  finalPriceUSD = 1.0000;
                } else {
                  let jsonResponse;
                  try {
                    jsonResponse = JSON.parse(responseText);
                  } catch (parseError) {
                    console.error(`JSON parse error for ${product.id}:`, parseError);
                    finalQuantity = 0;
                    finalPriceUSD = 1.0000;
                  }
                  if (jsonResponse) {
                    // Extract QUANTITY using path_body
                    let extractedQuantity = null;
                    if (productQuantity.path_body && productQuantity.path_body.trim()) {
                      const pathParts = productQuantity.path_body.split('.');
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
                      extractedQuantity = currentData;
                      console.log(`Extracted quantity for ${product.id} using path "${productQuantity.path_body}":`, extractedQuantity);
                    } else {
                      extractedQuantity = jsonResponse.quantity || jsonResponse.amount || jsonResponse.count;
                      console.log(`No path_body specified for ${product.id}, found quantity:`, extractedQuantity);
                    }
                    // Apply regex for quantity if specified
                    if (productQuantity.regex_output && productQuantity.regex_output.trim() && extractedQuantity) {
                      try {
                        const regex = new RegExp(productQuantity.regex_output);
                        const regexMatch = String(extractedQuantity).match(regex);
                        if (regexMatch) {
                          extractedQuantity = regexMatch[0];
                          console.log(`Applied regex for quantity ${product.id}:`, extractedQuantity);
                        }
                      } catch (regexError) {
                        console.error(`Regex error for quantity ${product.id}:`, regexError);
                      }
                    }
                    const quantityNumber = parseInt(String(extractedQuantity));
                    if (isNaN(quantityNumber)) {
                      console.error(`Invalid quantity for ${product.id}:`, extractedQuantity);
                      finalQuantity = 0;
                    } else {
                      finalQuantity = quantityNumber;
                    }
                    // Extract PRICE using path_body_value
                    if (productQuantity.path_body_value && productQuantity.path_body_value.trim()) {
                      let extractedPrice = null;
                      const priceParts = productQuantity.path_body_value.split('.');
                      let priceData = jsonResponse;
                      for (const part of priceParts){
                        if (priceData && typeof priceData === 'object') {
                          if (Array.isArray(priceData) && !isNaN(parseInt(part))) {
                            priceData = priceData[parseInt(part)];
                          } else if (part in priceData) {
                            priceData = priceData[part];
                          } else {
                            priceData = null;
                            break;
                          }
                        } else {
                          priceData = null;
                          break;
                        }
                      }
                      extractedPrice = priceData;
                      console.log(`Extracted price for ${product.id} using path "${productQuantity.path_body_value}":`, extractedPrice);
                      // Apply regex for price if specified (using same regex_output field)
                      if (productQuantity.regex_output && productQuantity.regex_output.trim() && extractedPrice) {
                        try {
                          const regex = new RegExp(productQuantity.regex_output);
                          const regexMatch = String(extractedPrice).match(regex);
                          if (regexMatch) {
                            extractedPrice = regexMatch[0];
                            console.log(`Applied regex for price ${product.id}:`, extractedPrice);
                          }
                        } catch (regexError) {
                          console.error(`Regex error for price ${product.id}:`, regexError);
                        }
                      }
                      // Convert to number and process price
                      const priceOriginal = parseFloat(String(extractedPrice));
                      if (!isNaN(priceOriginal) && priceOriginal > 0) {
                        // Get exchange rate from database or use default 1 (for USD)
                        const exchangeRate = productQuantity.exchange_currency ? parseFloat(productQuantity.exchange_currency) : 1;
                        console.log(`Exchange rate for ${product.id}: 1 USD = ${exchangeRate} (original currency)`);
                        // Convert to USD
                        const priceUSD = priceOriginal / exchangeRate;
                        console.log(`Price conversion for ${product.id}: ${priceOriginal} (original) / ${exchangeRate} = ${priceUSD} USD`);
                        // Determine markup: use percentage_profit if provided, otherwise use default rules
                        let markup;
                        if (productQuantity.percentage_profit && productQuantity.percentage_profit > 0) {
                          // Convert percentage to markup multiplier (e.g., 50% -> 1.50)
                          markup = 1 + parseFloat(productQuantity.percentage_profit) / 100;
                          console.log(`Using custom markup for ${product.id}: ${productQuantity.percentage_profit}% -> ${markup}x`);
                        } else {
                          // Use default markup based on USD price ranges
                          markup = calculateDefaultMarkup(priceUSD);
                          console.log(`Using default markup for ${product.id} based on price $${priceUSD}: ${markup}x`);
                        }
                        // Apply markup to get final price
                        finalPriceUSD = parseFloat((priceUSD * markup).toFixed(4));
                        console.log(`Final price calculation for ${product.id}: $${priceUSD} * ${markup} = $${finalPriceUSD}`);
                      } else {
                        console.error(`Invalid price for ${product.id}:`, extractedPrice);
                        finalPriceUSD = 1.0000;
                      }
                    } else {
                      console.log(`No path_body_value specified for ${product.id}, using default price`);
                      finalPriceUSD = 1.0000;
                    }
                  }
                }
              } catch (apiError) {
                console.error(`API call error for ${product.id}:`, apiError);
                finalQuantity = 0;
                finalPriceUSD = 1.0000;
              }
            }
          }
        }
        console.log(`Final values for ${product.id}: Quantity=${finalQuantity}, Price=$${finalPriceUSD} USD`);
        // Update products table with both quantity and price
        const { error: updateError } = await supabase.from('products').update({
          quantity: finalQuantity,
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
          console.log(`Successfully updated ${product.id}: Quantity=${finalQuantity}, Price=$${finalPriceUSD} USD`);
          results.push({
            id: product.id,
            success: true,
            quantity: finalQuantity,
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
    console.log(`Update process completed. Success: ${successCount}, Errors: ${errorCount}`);
    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${products.length} products (quantity and price)`,
      updated_count: successCount,
      error_count: errorCount,
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
