
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { invite_code, days, token } = await req.json()

    console.log('CapCut Pro request received:', { invite_code, days, token })

    if (!invite_code || !days || !token) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Missing required fields: invite_code, days, or token' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate token and check credits
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get product info
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('name', 'INVITE-CAPCUT-PRO')
      .single()

    if (productError || !product) {
      console.error('Product not found:', productError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Service not available' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check token validity and credits
    const { data: tokenData, error: tokenError } = await supabase
      .from('tokens')
      .select('*')
      .eq('token', token)
      .eq('product_id', product.id)
      .single()

    if (tokenError || !tokenData) {
      console.error('Invalid token:', tokenError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Invalid token for INVITE-CAPCUT-PRO service' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Calculate required credits (every 7 days = 1 credit)
    const requiredCredits = Math.ceil(days / 7)

    if (tokenData.credits < requiredCredits) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Insufficient credits. Required: ${requiredCredits}, Available: ${tokenData.credits}` 
        }),
        { 
          status: 402, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Make request to CapCut API
    const capcutResponse = await fetch(product.fornitore_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ "invite_code": invite_code }])
    })

    const capcutData = await capcutResponse.text()
    console.log('CapCut API response:', capcutData)

    if (!capcutResponse.ok) {
      throw new Error(`CapCut API error: ${capcutResponse.status} - ${capcutData}`)
    }

    // Deduct credits
    const { error: updateError } = await supabase
      .from('tokens')
      .update({ credits: tokenData.credits - requiredCredits })
      .eq('token', token)
      .eq('product_id', product.id)

    if (updateError) {
      console.error('Error updating credits:', updateError)
    }

    // Log transaction
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        product_id: product.id,
        product_name: product.name,
        token: token,
        qty: requiredCredits,
        status: 'completed',
        response_data: { capcut_response: capcutData },
        output_result: { invite_code, days, credits_used: requiredCredits }
      })

    if (transactionError) {
      console.error('Error logging transaction:', transactionError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `CapCut Pro activated successfully for ${days} days`,
        data: {
          invite_code,
          days,
          credits_used: requiredCredits,
          remaining_credits: tokenData.credits - requiredCredits,
          capcut_response: capcutData
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('CapCut Pro service error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
