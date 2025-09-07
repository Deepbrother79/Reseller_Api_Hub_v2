import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed. Use POST.'
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }

  try {
    const { token_string } = await req.json();

    if (!token_string) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required parameter: token_string'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Get external PAY_HUB credentials from secrets
    const PAY_HUB_URL = Deno.env.get('PAY_HUB_URL');
    const PAY_HUB_ANON_KEY = Deno.env.get('PAY_HUB_ANON_KEY');
    const PAY_HUB_SERVICE_ROLE = Deno.env.get('PAY_HUB_SERVICE_ROLE');

    if (!PAY_HUB_URL || !PAY_HUB_ANON_KEY || !PAY_HUB_SERVICE_ROLE) {
      console.error('Missing PAY_HUB configuration');
      return new Response(JSON.stringify({
        success: false,
        error: 'Server configuration error: Missing PAY_HUB credentials'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Initialize clients
    const payHubSupabase = createClient(PAY_HUB_URL, PAY_HUB_SERVICE_ROLE);
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const localSupabase = createClient(supabaseUrl, supabaseKey);

    console.log('Looking for token in PAY_HUB:', token_string);

    // 1. Find token in PAY_HUB.tokens with required conditions
    const { data: payHubToken, error: tokenError } = await payHubSupabase
      .from('tokens')
      .select('*')
      .eq('token_string', token_string)
      .eq('token_type', 'product')
      .eq('activated', false)
      .eq('locked', false)
      .single();

    if (tokenError || !payHubToken) {
      console.log('Token not found or conditions not met:', tokenError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Token not found or not eligible for activation. Token must be: type=product, activated=false, locked=false'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // 2. Check if token already exists in token_activations
    const { data: existingActivation, error: activationCheckError } = await payHubSupabase
      .from('token_activations')
      .select('uid')
      .eq('token_string', token_string)
      .maybeSingle();

    if (existingActivation) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Token activation already exists for this token'
      }), {
        status: 409,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const userId = payHubToken.user_id;
    const productId = payHubToken.product_id;
    const credits = payHubToken.credits;
    const totalUsdDue = payHubToken.total_usd_due || 0;
    const autoActivation = payHubToken.auto_activation;

    console.log('Token details:', {
      userId,
      productId,
      credits,
      totalUsdDue,
      autoActivation
    });

    let activationStatus = 'Pending';
    let finalTotalUsdDue = totalUsdDue;

    // 3. Handle auto_activation logic
    if (autoActivation) {
      // Get user balance
      const { data: userProfile, error: profileError } = await payHubSupabase
        .from('profiles')
        .select('balance')
        .eq('id', userId)
        .single();

      if (profileError || !userProfile) {
        console.error('User profile not found:', profileError);
        return new Response(JSON.stringify({
          success: false,
          error: 'User profile not found'
        }), {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      const userBalance = userProfile.balance || 0;
      console.log('User balance:', userBalance, 'Required:', totalUsdDue);

      if (userBalance >= totalUsdDue) {
        // User has sufficient balance - process activation
        try {
          // Start transaction by creating transaction record
          const { data: transaction, error: transactionError } = await payHubSupabase
            .from('transactions')
            .insert({
              user_id: userId,
              product_id: productId,
              token_type: 'product',
              token_string: token_string,
              credits: credits,
              usd_spent: totalUsdDue,
              value_credits_usd_label: `Token Activation - ${credits} credits`,
              token_count: 1,
              mode: 'usd',
              fee_usd: 0,
              credits_per_token: credits,
              total_credits: credits,
              activated: true,
              total_usd_due: totalUsdDue
            })
            .select('id')
            .single();

          if (transactionError) {
            console.error('Failed to create transaction:', transactionError);
            throw new Error('Failed to create transaction record');
          }

          // Update user balance (subtract the amount)
          const { error: balanceError } = await payHubSupabase
            .from('profiles')
            .update({
              balance: userBalance - totalUsdDue
            })
            .eq('id', userId);

          if (balanceError) {
            console.error('Failed to update user balance:', balanceError);
            throw new Error('Failed to update user balance');
          }

          activationStatus = 'Activated';
          finalTotalUsdDue = 0;
          console.log('Auto-activation completed successfully');
        } catch (error) {
          console.error('Auto-activation failed:', error);
          activationStatus = 'Pending';
          finalTotalUsdDue = totalUsdDue;
        }
      } else {
        // Insufficient balance
        console.log('Insufficient balance for auto-activation');
        activationStatus = 'Pending';
        finalTotalUsdDue = totalUsdDue;
      }
    } else {
      // auto_activation = false, create pending activation
      console.log('Auto-activation disabled, creating pending activation');
      activationStatus = 'Pending';
      finalTotalUsdDue = totalUsdDue;
    }

    // 4. Create token_activation record
    const { data: tokenActivation, error: insertError } = await payHubSupabase
      .from('token_activations')
      .insert({
        user_id: userId,
        product_id: productId,
        token_string: token_string,
        credits: credits,
        token_type: 'product',
        total_usd_due: finalTotalUsdDue,
        status: activationStatus
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Failed to create token activation:', insertError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to create token activation record'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // 5. Update activation_status in PAY_HUB tokens table
    const { error: payHubUpdateError } = await payHubSupabase
      .from('tokens')
      .update({
        activation_status: activationStatus,
        ...(activationStatus === 'Activated' && { activated: true })
      })
      .eq('token_string', token_string);

    if (payHubUpdateError) {
      console.error('Failed to update PAY_HUB token activation_status:', payHubUpdateError);
      // Non-critical error, continue execution
    } else {
      console.log('PAY_HUB token activation_status updated successfully');
    }

    // 6. Update local token with activation status
    const localTokenUpdate = {
      activation_status: activationStatus,
      ...(activationStatus === 'Activated' && { activated: true })
    };

    const { error: localUpdateError } = await localSupabase
      .from('tokens')
      .update(localTokenUpdate)
      .eq('token', token_string);

    if (localUpdateError) {
      console.error('Failed to update local token:', localUpdateError);
      // Non-critical error, continue execution
    } else {
      console.log('Local token activation_status updated successfully');
    }

    return new Response(JSON.stringify({
      success: true,
      status: activationStatus,
      message: activationStatus === 'Activated' 
        ? 'Token activated successfully and balance deducted' 
        : `Token activation created with status: ${activationStatus}. ${finalTotalUsdDue > 0 ? `Amount due: $${finalTotalUsdDue}` : ''}`,
      activation_id: tokenActivation.uid,
      total_usd_due: finalTotalUsdDue
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error in activate-token function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: `Server error: ${error.message}`
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});