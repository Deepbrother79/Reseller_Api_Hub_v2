import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all products with their basic info
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, fornitore_url, payload_template, http_method, product_type, quantity');

    if (error) {
      throw error;
    }

    // For products where quantity is null or we want fresh data, 
    // calculate the quantity based on product type
    const updatedProducts = await Promise.all(
      (products || []).map(async (product) => {
        let actualQuantity = product.quantity;

        // If quantity is null or 0, try to get fresh count
        if (actualQuantity === null || actualQuantity === 0) {
          if (product.product_type === 'digital') {
            // Count available digital products
            const { count, error: countError } = await supabase
              .from('digital_products')
              .select('*', { count: 'exact', head: true })
              .eq('product_id', product.id)
              .eq('is_used', false);

            if (!countError) {
              actualQuantity = count || 0;
            }
          }
          // For API products, we keep the existing quantity from the database
          // as it should be updated by the update-products-quantity function
        }

        return {
          ...product,
          quantity: actualQuantity
        };
      })
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        products: updatedProducts
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching products:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to fetch products' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
