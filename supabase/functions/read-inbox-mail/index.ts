import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailResult {
  mail: string;
  from: string;
  time: string;
  content: string;
  code: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transaction_ids, email_strings, token, use_master_token } = await req.json();
    console.log('Processing inbox request:', { transaction_ids, email_strings, token: token ? '[PROVIDED]' : '[NOT PROVIDED]', use_master_token });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results: EmailResult[] = [];
    const errors: string[] = [];
    const EMAIL_STRINGS_PRODUCT_NAME = 'EMAIL-INBOX-READER';

    // Process transaction IDs
    if (transaction_ids && transaction_ids.length > 0) {
      const limitedTransactionIds = transaction_ids.slice(0, 10);
      
      for (const transactionId of limitedTransactionIds) {
        try {
          // Get transaction with product compatibility check
          const { data: transaction, error: transactionError } = await supabase
            .from('transactions')
            .select(`
              *,
              products (name, product_type, inbox_compatible)
            `)
            .eq('id', transactionId.trim())
            .single();

          if (transactionError || !transaction) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                message: `Invalid Transaction ID: ${transactionId}. Transaction not found in database.`,
                error_type: "invalid_transaction_id"
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Check if product is compatible with inbox reading
          if (!transaction.products.inbox_compatible) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                message: `Product not compatible with inbox reading: ${transaction.products.name} (Transaction: ${transactionId}). Only HOTMAIL-NEW-LIVE-1-12H and OUTLOOK-NEW-LIVE-1-12H are supported.`,
                error_type: "incompatible_product"
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Extract email credentials from output_result
          const outputResult = transaction.output_result;
          let emailCredentials = '';
          
          if (Array.isArray(outputResult)) {
            emailCredentials = outputResult[0];
          } else if (typeof outputResult === 'string') {
            emailCredentials = outputResult;
          } else {
            return new Response(
              JSON.stringify({ 
                success: false, 
                message: `Invalid output format for transaction: ${transactionId}`,
                error_type: "invalid_output_format"
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const emailData = await processEmailCredentials(emailCredentials, supabase);
          if (emailData.success) {
            results.push(...emailData.results);
          } else {
            return new Response(
              JSON.stringify({ 
                success: false, 
                message: emailData.error,
                error_type: "email_processing_error"
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (error) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: `Server error processing transaction ${transactionId}: ${error.message}`,
              error_type: "server_error"
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Process email strings
    if (email_strings && email_strings.length > 0) {
      if (!token) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Invalid Token: Authorization token is required for email string processing. You need a valid token for the EMAIL-INBOX-READER product.",
            error_type: "missing_token"
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify token for EMAIL-INBOX-READER product
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, value')
        .eq('name', EMAIL_STRINGS_PRODUCT_NAME)
        .eq('product_type', 'digital')
        .single();

      if (productError || !product) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Product ${EMAIL_STRINGS_PRODUCT_NAME} not found or not configured as digital product`,
            error_type: "product_not_found"
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate token based on master token flag
      let tokenData;
      let isMasterToken = false;
      const emailStringsCount = email_strings.length;
      let requiredCredits = emailStringsCount;

      if (use_master_token) {
        // Try master token table
        const { data: masterToken, error: masterTokenError } = await supabase
          .from('tokens_master')
          .select('*')
          .eq('token', token)
          .single();

        if (masterToken) {
          tokenData = masterToken;
          isMasterToken = true;
          requiredCredits = emailStringsCount * (product.value || 1);
          console.log('Using master token, required credits:', requiredCredits);
        } else {
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: 'Master token not found. Please verify your token is correct.',
              error_type: 'invalid_token'
            }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        // Try regular token table
        const { data: regularToken, error: regularTokenError } = await supabase
          .from('tokens')
          .select('*')
          .eq('token', token)
          .eq('product_id', product.id)
          .single();

        if (regularToken) {
          tokenData = regularToken;
        } else {
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: `Invalid Token: Token not found or not authorized for ${EMAIL_STRINGS_PRODUCT_NAME} product. Please verify your token is correct and valid.`,
              error_type: 'invalid_token'
            }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      if (tokenData.credits < requiredCredits) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Insufficient credits for ${EMAIL_STRINGS_PRODUCT_NAME}. Available: ${tokenData.credits}, Required: ${requiredCredits}`,
            error_type: "insufficient_credits"
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const limitedEmailStrings = email_strings.slice(0, 10);
      let processedCount = 0;
      
      for (const emailString of limitedEmailStrings) {
        try {
          const emailData = await processEmailCredentials(emailString, supabase);
          if (emailData.success) {
            results.push(...emailData.results);
            processedCount++;
          } else {
            return new Response(
              JSON.stringify({ 
                success: false, 
                message: emailData.error,
                error_type: "email_credentials_error"
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (error) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: `Server error processing email credentials: ${error.message}`,
              error_type: "server_error"
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Update credits only for successfully processed emails
      if (processedCount > 0) {
        const tableName = isMasterToken ? 'tokens_master' : 'tokens';
        const finalRequiredCredits = isMasterToken ? processedCount * (product.value || 1) : processedCount;
        
        const { error: updateError } = await supabase
          .from(tableName)
          .update({ credits: tokenData.credits - finalRequiredCredits })
          .eq('token', token);

        if (updateError) {
          console.error('Failed to update credits:', updateError);
        }

        // Create a shadow token in tokens table when using master token to satisfy FK
        if (isMasterToken) {
          const { data: existingTok } = await supabase
            .from('tokens')
            .select('token')
            .eq('token', token)
            .maybeSingle();
          if (!existingTok) {
            const { error: insertShadowErr } = await supabase
              .from('tokens')
              .insert({ token, product_id: product.id, name: 'MASTER-LINK', credits: 0 });
            if (insertShadowErr) console.error('Failed to insert shadow token for FK:', insertShadowErr);
          }
        }

        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            token: token,
            product_id: product.id,
            product_name: EMAIL_STRINGS_PRODUCT_NAME,
            qty: processedCount,
            status: 'success',
            response_data: { processed_emails: processedCount, total_results: results.length },
            output_result: [`Processed ${processedCount} email strings successfully`]
          });

        if (transactionError) {
          console.error('Failed to create transaction record:', transactionError);
        }
      }
    }

    // Check if we have results
    if (results.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "No emails found. Please verify your credentials and try again.",
          error_type: "no_results"
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results: results,
        message: `Processed ${results.length} emails successfully`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in read-inbox-mail function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Server response error: ${error.message}`,
        error_type: "server_error"
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processEmailCredentials(credentials: string, supabase: any): Promise<{success: boolean, results: EmailResult[], error?: string}> {
  const parts = credentials.split('|');
  if (parts.length < 4) {
    return { success: false, results: [], error: 'Invalid email credentials format. Expected format: email|password|refresh_token|client_id' };
  }

  const [email, password, refreshToken, clientId] = parts;
  
  try {
    // Get access token
    const tokenData = {
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: "https://graph.microsoft.com/.default offline_access"
    };

    const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(tokenData)
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Failed to get access token:', errorText);
      
      // Try to parse error response
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error === 'invalid_grant') {
          return { 
            success: false, 
            results: [], 
            error: 'Authentication failed: Invalid or expired email credentials. Please verify the email string format and credentials are correct.' 
          };
        } else {
          return { 
            success: false, 
            results: [], 
            error: `Authentication failed: ${errorData.error_description || errorData.error || 'Invalid credentials'}` 
          };
        }
      } catch {
        return { success: false, results: [], error: 'Authentication failed: Invalid response from Microsoft authentication server' };
      }
    }

    const tokenResult = await tokenResponse.json();
    const accessToken = tokenResult.access_token;

    // Get emails from inbox
    const inboxResponse = await fetch(
      "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=50&$orderby=receivedDateTime desc",
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!inboxResponse.ok) {
      const errorText = await inboxResponse.text();
      console.error('Failed to get emails:', errorText);
      return { success: false, results: [], error: `Failed to fetch emails: Microsoft API error - ${errorText}` };
    }

    const emailsData = await inboxResponse.json();
    const emails = emailsData.value || [];

    const results: EmailResult[] = [];

    for (const emailMsg of emails) {
      const subject = emailMsg.subject || "(no subject)";
      const fromEmail = emailMsg.from?.emailAddress?.address || "(unknown sender)";
      const preview = emailMsg.bodyPreview || "";
      const receivedDateTime = new Date(emailMsg.receivedDateTime);
      
      // Format time as HH:MM - DD/MM/YYYY
      const timeString = `${receivedDateTime.getHours().toString().padStart(2, '0')}:${receivedDateTime.getMinutes().toString().padStart(2, '0')} - ${receivedDateTime.getDate().toString().padStart(2, '0')}/${(receivedDateTime.getMonth() + 1).toString().padStart(2, '0')}/${receivedDateTime.getFullYear()}`;
      
      // Extract code
      const extractedCode = await extractCodeFromEmail(fromEmail, preview, supabase);
      
      const content = `Subject: ${subject}\nFrom: ${fromEmail}\nPreview: ${preview}`;
      
      results.push({
        mail: email,
        from: fromEmail,
        time: timeString,
        content: content,
        code: extractedCode
      });
    }

    return { success: true, results };
  } catch (error) {
    console.error('Error processing email credentials:', error);
    return { success: false, results: [], error: `Server error processing email credentials: ${error.message}` };
  }
}

async function extractCodeFromEmail(fromEmail: string, content: string, supabase: any): Promise<string> {
  try {
    // Try to get pattern from database
    const { data: pattern, error } = await supabase
      .from('email_extraction_patterns')
      .select('regex_pattern')
      .eq('from_email', fromEmail)
      .single();

    let regexPattern = '';
    
    if (!error && pattern) {
      regexPattern = pattern.regex_pattern;
    } else {
      // Use default pattern for common numeric codes
      regexPattern = '\\b\\d{4,8}\\b';
    }

    const regex = new RegExp(regexPattern);
    const match = content.match(regex);
    
    return match ? match[0] : '';
  } catch (error) {
    console.error('Error extracting code:', error);
    return '';
  }
}
