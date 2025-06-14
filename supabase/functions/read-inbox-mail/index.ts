
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
    const { transaction_ids, email_strings, token } = await req.json();
    console.log('Processing inbox request:', { transaction_ids, email_strings, token: token ? '[PROVIDED]' : '[NOT PROVIDED]' });

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
            errors.push(`Transaction ID not found: ${transactionId}`);
            console.log(`Transaction not found: ${transactionId}`);
            continue;
          }

          // Check if product is compatible with inbox reading
          if (!transaction.products.inbox_compatible) {
            errors.push(`Product not compatible with inbox reading: ${transaction.products.name} (Transaction: ${transactionId})`);
            console.log(`Product not compatible with inbox reading: ${transaction.products.name}`);
            continue;
          }

          // Extract email credentials from output_result
          const outputResult = transaction.output_result;
          let emailCredentials = '';
          
          if (Array.isArray(outputResult)) {
            emailCredentials = outputResult[0];
          } else if (typeof outputResult === 'string') {
            emailCredentials = outputResult;
          } else {
            errors.push(`Invalid output_result format for transaction: ${transactionId}`);
            console.log('Invalid output_result format');
            continue;
          }

          const emailData = await processEmailCredentials(emailCredentials, supabase);
          if (emailData.success) {
            results.push(...emailData.results);
          } else {
            errors.push(`Failed to process transaction ${transactionId}: ${emailData.error}`);
          }
        } catch (error) {
          errors.push(`Error processing transaction ${transactionId}: ${error.message}`);
          console.error(`Error processing transaction ${transactionId}:`, error);
        }
      }
    }

    // Process email strings
    if (email_strings && email_strings.length > 0) {
      if (!token) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Token required for email string processing. You need a token for the EMAIL-INBOX-READER product." 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify token for EMAIL-INBOX-READER product
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id')
        .eq('name', EMAIL_STRINGS_PRODUCT_NAME)
        .eq('product_type', 'digital')
        .single();

      if (productError || !product) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Product ${EMAIL_STRINGS_PRODUCT_NAME} not found or not configured as digital product` 
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: tokenData, error: tokenError } = await supabase
        .from('tokens')
        .select('*')
        .eq('token', token)
        .eq('product_id', product.id)
        .single();

      if (tokenError || !tokenData) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Invalid token or token not authorized for ${EMAIL_STRINGS_PRODUCT_NAME} product. Please create a token for the EMAIL-INBOX-READER product.` 
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const emailStringsCount = email_strings.length;
      if (tokenData.credits < emailStringsCount) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Insufficient credits for ${EMAIL_STRINGS_PRODUCT_NAME}. Available: ${tokenData.credits}, Required: ${emailStringsCount}` 
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
            errors.push(`Failed to process email credentials: ${emailData.error}`);
          }
        } catch (error) {
          errors.push(`Error processing email string: ${error.message}`);
          console.error(`Error processing email string:`, error);
        }
      }

      // Update credits only for successfully processed emails
      if (processedCount > 0) {
        const { error: updateError } = await supabase
          .from('tokens')
          .update({ credits: tokenData.credits - processedCount })
          .eq('token', token);

        if (updateError) {
          console.error('Failed to update credits:', updateError);
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

    // Return response with detailed error information
    if (results.length === 0 && errors.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "No emails could be processed",
          errors: errors,
          info: {
            transaction_ids_processed: transaction_ids ? transaction_ids.length : 0,
            email_strings_processed: email_strings ? email_strings.length : 0,
            compatible_products: "Only transactions from inbox-compatible products (HOTMAIL-NEW-LIVE-1-12H, OUTLOOK-NEW-LIVE-1-12H) can be used"
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results: results,
        message: `Processed ${results.length} emails successfully`,
        warnings: errors.length > 0 ? errors : undefined,
        info: {
          transaction_ids_processed: transaction_ids ? transaction_ids.length : 0,
          email_strings_processed: email_strings ? email_strings.length : 0,
          compatible_products: "Only transactions from inbox-compatible products (HOTMAIL-NEW-LIVE-1-12H, OUTLOOK-NEW-LIVE-1-12H) can be used"
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in read-inbox-mail function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: "Internal server error",
        error: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processEmailCredentials(credentials: string, supabase: any): Promise<{success: boolean, results: EmailResult[], error?: string}> {
  const parts = credentials.split('|');
  if (parts.length < 4) {
    return { success: false, results: [], error: 'Invalid credentials format' };
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
        return { 
          success: false, 
          results: [], 
          error: `Authentication failed: ${errorData.error_description || errorData.error || 'Invalid credentials'}` 
        };
      } catch {
        return { success: false, results: [], error: 'Authentication failed: Invalid response from Microsoft' };
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
      return { success: false, results: [], error: `Failed to fetch emails: ${errorText}` };
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
    return { success: false, results: [], error: error.message };
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
