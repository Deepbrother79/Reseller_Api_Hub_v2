
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

    // Get all products to update their quantities
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, product_type, name');

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to fetch products' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No products found',
          updated_count: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${products.length} products...`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each product
    for (const product of products) {
      try {
        console.log(`Processing product ID: ${product.id}, Type: ${product.product_type}`);

        let finalQuantity = 0;

        if (product.product_type === 'digital') {
          // For digital products, count available items in digital_products table
          const { count, error: countError } = await supabase
            .from('digital_products')
            .select('*', { count: 'exact', head: true })
            .eq('product_id', product.id)
            .eq('is_used', false);

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

        } else {
          // For API products, get from products_quantity table
          const { data: productQuantity, error: fetchError } = await supabase
            .from('products_quantity')
            .select('*')
            .eq('id', product.id)
            .single();

          if (fetchError) {
            if (fetchError.code === 'PGRST116') {
              console.log(`No products_quantity record found for ${product.id}, setting quantity to 0`);
              finalQuantity = 0;
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
            // Make API call to get quantity
            if (!productQuantity.fornitore_url) {
              console.log(`Skipping product ${product.id} - no fornitore_url`);
              finalQuantity = 0;
            } else {
              try {
                const requestOptions: RequestInit = {
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
                } else {
                  let jsonResponse;
                  try {
                    jsonResponse = JSON.parse(responseText);
                  } catch (parseError) {
                    console.error(`JSON parse error for ${product.id}:`, parseError);
                    finalQuantity = 0;
                  }

                  if (jsonResponse) {
                    let extractedQuantity = null;
                    if (productQuantity.path_body && productQuantity.path_body.trim()) {
                      const pathParts = productQuantity.path_body.split('.');
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
                      console.log(`Extracted data for ${product.id} using path "${productQuantity.path_body}":`, extractedQuantity);
                    } else {
                      extractedQuantity = jsonResponse.quantity || jsonResponse.amount || jsonResponse.count;
                      console.log(`No path_body specified for ${product.id}, found:`, extractedQuantity);
                    }

                    if (productQuantity.regex_output && productQuantity.regex_output.trim() && extractedQuantity) {
                      try {
                        const regex = new RegExp(productQuantity.regex_output);
                        const regexMatch = String(extractedQuantity).match(regex);
                        if (regexMatch) {
                          extractedQuantity = regexMatch[0];
                          console.log(`Applied regex for ${product.id}:`, extractedQuantity);
                        }
                      } catch (regexError) {
                        console.error(`Regex error for ${product.id}:`, regexError);
                      }
                    }

                    const quantityNumber = parseInt(String(extractedQuantity));
                    if (isNaN(quantityNumber)) {
                      console.error(`Invalid quantity for ${product.id}:`, extractedQuantity);
                      finalQuantity = 0;
                    } else {
                      finalQuantity = quantityNumber;
                    }
                  }
                }
              } catch (apiError) {
                console.error(`API call error for ${product.id}:`, apiError);
                finalQuantity = 0;
              }
            }
          }
        }

        console.log(`Final quantity for ${product.id}: ${finalQuantity}`);

        // Update products table with the calculated quantity
        const { error: updateError } = await supabase
          .from('products')
          .update({ quantity: finalQuantity })
          .eq('id', product.id);

        if (updateError) {
          console.error(`Update error for ${product.id}:`, updateError);
          results.push({
            id: product.id,
            success: false,
            error: `Update failed: ${updateError.message}`
          });
          errorCount++;
        } else {
          console.log(`Successfully updated quantity for ${product.id}: ${finalQuantity}`);
          results.push({
            id: product.id,
            success: true,
            quantity: finalQuantity
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
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Update process completed. Success: ${successCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Processed ${products.length} products`,
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
