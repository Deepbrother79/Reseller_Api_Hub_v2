
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
    const { product_id, token, qty, use_master_token } = await req.json();
    console.log('Processing request:', { product_id, token, qty, use_master_token });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate input
    if (!product_id || !token || !qty) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Missing required fields: product_id, token, qty" 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get product information
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      console.error('Product not found:', productError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Product not found" 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check token type and credits based on use_master_token flag
    let tokenData;
    let isMasterToken = false;
    let requiredCredits = qty;

    if (use_master_token) {
      // Try to find in master tokens table
      const { data: masterToken, error: masterTokenError } = await supabase
        .from('tokens_master')
        .select('*')
        .eq('token', token)
        .maybeSingle();

      if (masterToken) {
        tokenData = masterToken;
        isMasterToken = true;
        // For master tokens: credits are in USD, so calculate based on product.value * qty
        requiredCredits = qty * (product.value || 1);
        console.log('Using master token, required credits:', requiredCredits, 'USD (product.value:', product.value, 'x qty:', qty, ')');
      } else {
        console.error('Master token not found');
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Master token not found. Please verify your token is correct." 
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Try to find in regular tokens table
      const { data: regularToken, error: regularTokenError } = await supabase
        .from('tokens')
        .select('*')
        .eq('token', token)
        .eq('product_id', product.id)
        .maybeSingle();

      if (regularToken) {
        // Check if token is activated
        if (!regularToken.activated) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: "Token Not Activated: Your token is currently deactivated and cannot be used for transactions. Please contact support to activate your token." 
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Check if token is locked
        if (regularToken.locked) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: "Token Locked: Your token has been locked and cannot be used for transactions. Please contact support to unlock your token." 
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        tokenData = regularToken;
        console.log('Using regular token');
      } else {
        console.error('Regular token not found');
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Invalid token or token not found for this product" 
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (tokenData.credits < requiredCredits) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Insufficient credits. Available: ${tokenData.credits}, Required: ${requiredCredits}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let apiResponse;
    let filteredResponse;
    let status = 'success';

    // Check product type and handle accordingly
    if (product.product_type === 'digital') {
      console.log('Processing digital product');
      
      try {
        // Get available digital products for this product_id
        const { data: digitalProducts, error: digitalError } = await supabase
          .from('digital_products')
          .select('*')
          .eq('product_id', product.id)
          .eq('is_used', false)
          .limit(qty);

        if (digitalError) {
          console.error('Error fetching digital products:', digitalError);
          throw new Error('Failed to fetch digital products');
        }

        if (!digitalProducts || digitalProducts.length < qty) {
          status = 'failed';
          apiResponse = {
            success: false,
            error: `Insufficient stock. Available: ${digitalProducts?.length || 0}, Required: ${qty}`
          };
          filteredResponse = apiResponse;
        } else {
          // Mark products as used
          const productIds = digitalProducts.map(p => p.id);
          const { error: updateError } = await supabase
            .from('digital_products')
            .update({ is_used: true })
            .in('id', productIds);

          if (updateError) {
            console.error('Error marking products as used:', updateError);
            throw new Error('Failed to update product status');
          }

          // Prepare response
          const deliveredProducts = digitalProducts.map(p => p.content);
          apiResponse = {
            success: true,
            data: deliveredProducts,
            message: `Successfully delivered ${qty} digital products`
          };
          filteredResponse = deliveredProducts;
          console.log(`Delivered ${qty} digital products`);
        }
      } catch (error) {
        console.error('Digital product processing error:', error);
        status = 'failed';
        apiResponse = {
          success: false,
          error: error.message || 'Failed to process digital product'
        };
        filteredResponse = apiResponse;
      }
    } else {
      // Handle API products with enhanced error handling and fallback logic
      console.log('Processing API product');
      
      // Function to make API request with error checking
      const makeApiRequest = async (productConfig: any, attempt: number) => {
        try {
          console.log(`Making ${productConfig.http_method} API call to ${productConfig.fornitore_url} (attempt ${attempt})`);
          
          // Replace {{qty}} placeholder in the URL
          const processedUrl = productConfig.fornitore_url.replace(/\{\{qty\}\}/g, qty.toString());
          console.log(`Processed URL: ${processedUrl}`);
          
          // Prepare request options based on HTTP method
          const requestOptions: RequestInit = {
            method: productConfig.http_method,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Supabase-Edge-Function/1.0'
            }
          };

          // Add headers from header_http if they exist
          if (productConfig.header_http && typeof productConfig.header_http === 'object') {
            Object.assign(requestOptions.headers, productConfig.header_http);
          }

          // Add body only for POST requests and if payload_template exists
          if (productConfig.http_method === 'POST' && productConfig.payload_template) {
            // Replace {{qty}} in payload template if it exists
            let processedPayload = productConfig.payload_template;
            if (typeof processedPayload === 'string') {
              processedPayload = processedPayload.replace(/\{\{qty\}\}/g, qty.toString());
            } else if (typeof processedPayload === 'object') {
              processedPayload = JSON.parse(
                JSON.stringify(processedPayload).replace(/\{\{qty\}\}/g, qty.toString())
              );
            }
            requestOptions.body = JSON.stringify(processedPayload);
          }

          // Make the actual HTTP request
          const response = await fetch(processedUrl, requestOptions);
          const responseText = await response.text();
          
          console.log(`External API response status: ${response.status}`);
          console.log(`External API response: ${responseText}`);
          
          if (response.ok) {
            try {
              // Try to parse as JSON
              const fullResponse = JSON.parse(responseText);
              
              // Check if condition_reply_output exists and is found in the response
              if (productConfig.condition_reply_output && productConfig.condition_reply_output.trim()) {
                const responseString = JSON.stringify(fullResponse).toLowerCase();
                const conditionTag = productConfig.condition_reply_output.toLowerCase();
                
                if (responseString.includes(conditionTag)) {
                  console.log(`Found error condition "${productConfig.condition_reply_output}" in response, marking as failed`);
                  return {
                    success: false,
                    shouldRetry: true,
                    apiResponse: fullResponse,
                    filteredResponse: fullResponse
                  };
                }
              }
              
              // Extract specific path if path_body is specified
              let extractedData = fullResponse;
              if (productConfig.path_body && productConfig.path_body.trim()) {
                const pathParts = productConfig.path_body.split('.');
                
                for (const part of pathParts) {
                  if (extractedData && typeof extractedData === 'object' && part in extractedData) {
                    extractedData = extractedData[part];
                  } else {
                    extractedData = fullResponse; // Fallback to full response if path not found
                    break;
                  }
                }
              }
              
              return {
                success: true,
                shouldRetry: false,
                apiResponse: fullResponse,
                filteredResponse: extractedData
              };
              
            } catch {
              // If not JSON, store as text
              return {
                success: true,
                shouldRetry: false,
                apiResponse: {
                  success: true,
                  data: responseText,
                  status: response.status
                },
                filteredResponse: responseText
              };
            }
          } else {
            return {
              success: false,
              shouldRetry: false,
              apiResponse: {
                success: false,
                error: `HTTP ${response.status}: ${responseText}`,
                status: response.status
              },
              filteredResponse: {
                success: false,
                error: `HTTP ${response.status}: ${responseText}`,
                status: response.status
              }
            };
          }
          
        } catch (apiError) {
          console.error(`External API error (attempt ${attempt}):`, apiError);
          return {
            success: false,
            shouldRetry: false,
            apiResponse: {
              success: false,
              error: apiError.message || 'Unknown error occurred'
            },
            filteredResponse: {
              success: false,
              error: apiError.message || 'Unknown error occurred'
            }
          };
        }
      };

      // Try first request with original product config
      let result = await makeApiRequest(product, 1);
      
      // If first attempt failed with error condition, try retry
      if (!result.success && result.shouldRetry) {
        console.log('First attempt failed with error condition, retrying...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        result = await makeApiRequest(product, 2);
        
        // If second attempt also failed, try with products_replace
        if (!result.success && result.shouldRetry) {
          console.log('Second attempt failed, trying with products_replace...');
          
          // Get replacement product configuration
          const { data: replaceProduct, error: replaceError } = await supabase
            .from('products_replace')
            .select('*')
            .eq('id', product.id)
            .single();
            
          if (!replaceError && replaceProduct) {
            console.log('Found replacement product configuration, making request...');
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            result = await makeApiRequest(replaceProduct, 3);
            
            // If replacement also failed, return maintenance message
            if (!result.success) {
              console.log('All attempts failed, returning maintenance message');
              status = 'failed';
              apiResponse = {
                success: false,
                error: 'Server under maintenance, please try again later'
              };
              filteredResponse = apiResponse;
            } else {
              apiResponse = result.apiResponse;
              filteredResponse = result.filteredResponse;
              status = 'success';
            }
          } else {
            console.log('No replacement product found, returning maintenance message');
            status = 'failed';
            apiResponse = {
              success: false,
              error: 'Server under maintenance, please try again later'
            };
            filteredResponse = apiResponse;
          }
        } else {
          // Second attempt succeeded or failed for other reasons
          apiResponse = result.apiResponse;
          filteredResponse = result.filteredResponse;
          status = result.success ? 'success' : 'failed';
        }
      } else {
        // First attempt succeeded or failed for other reasons
        apiResponse = result.apiResponse;
        filteredResponse = result.filteredResponse;
        status = result.success ? 'success' : 'failed';
      }
    }

    // Create transaction record with product_name
    const { data: transactionData, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        token: token,
        product_id: product.id,
        product_name: product.name,
        qty: qty,
        status: status,
        response_data: apiResponse,
        output_result: Array.isArray(filteredResponse) ? filteredResponse : [filteredResponse]
      })
      .select('id')
      .single();

    if (transactionError) {
      console.error('Transaction creation error:', transactionError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Failed to create transaction record" 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update token credits only if successful
    if (status === 'success') {
      const tableName = isMasterToken ? 'tokens_master' : 'tokens';
      const newCredits = isMasterToken 
        ? (tokenData.credits as number) - requiredCredits  // Master tokens use numeric credits
        : tokenData.credits - requiredCredits;            // Regular tokens use integer credits
      
      console.log(`Updating credits in ${tableName}: ${tokenData.credits} - ${requiredCredits} = ${newCredits}`);
      
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ credits: newCredits })
        .eq('token', token);

      if (updateError) {
        console.error('Credit update error:', updateError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Failed to update credits" 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        success: status === 'success', 
        message: status === 'success' 
          ? `Successfully processed ${qty} units of ${product.name}. Remaining credits: ${isMasterToken ? (tokenData.credits as number) - requiredCredits : tokenData.credits - requiredCredits}${isMasterToken ? ' USD' : ''}`
          : "Request processed but failed",
        api_response: filteredResponse,
        transaction_id: transactionData?.id || null
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
