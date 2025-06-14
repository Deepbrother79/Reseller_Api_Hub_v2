
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
    const allowedProducts = ['HOTMAIL-NEW-LIVE-1-12H', 'OUTLOOK-NEW-LIVE-1-12H'];
    const EMAIL_STRINGS_PRODUCT_NAME = 'EMAIL-INBOX-READER'; // Prodotto digitale specifico per email strings

    // Process transaction IDs
    if (transaction_ids && transaction_ids.length > 0) {
      const limitedTransactionIds = transaction_ids.slice(0, 10);
      
      for (const transactionId of limitedTransactionIds) {
        try {
          // Get transaction
          const { data: transaction, error: transactionError } = await supabase
            .from('transactions')
            .select(`
              *,
              products (name, product_type)
            `)
            .eq('id', transactionId.trim())
            .single();

          if (transactionError || !transaction) {
            console.log(`Transaction not found: ${transactionId}`);
            continue;
          }

          // Check if product is allowed
          if (!allowedProducts.includes(transaction.products.name)) {
            console.log(`Product not allowed: ${transaction.products.name}`);
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
            console.log('Invalid output_result format');
            continue;
          }

          const emailData = await processEmailCredentials(emailCredentials, supabase);
          if (emailData.length > 0) {
            results.push(...emailData);
          }
        } catch (error) {
          console.error(`Error processing transaction ${transactionId}:`, error);
        }
      }
    }

    // Process email strings - ora richiede un token specifico per un prodotto digitale
    if (email_strings && email_strings.length > 0) {
      if (!token) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Token required for email string processing" 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verifica che il token sia valido per il prodotto EMAIL-INBOX-READER
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

      // Verifica il token e i crediti per il prodotto specifico
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
            message: `Invalid token or token not authorized for ${EMAIL_STRINGS_PRODUCT_NAME} product` 
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
          if (emailData.length > 0) {
            results.push(...emailData);
            processedCount++;
          }
        } catch (error) {
          console.error(`Error processing email string:`, error);
        }
      }

      // Decrementa i crediti solo per le email effettivamente processate
      if (processedCount > 0) {
        const { error: updateError } = await supabase
          .from('tokens')
          .update({ credits: tokenData.credits - processedCount })
          .eq('token', token);

        if (updateError) {
          console.error('Failed to update credits:', updateError);
        }

        // Crea una transazione per tracciare l'uso del servizio
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
        message: "Internal server error" 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processEmailCredentials(credentials: string, supabase: any): Promise<EmailResult[]> {
  const parts = credentials.split('|');
  if (parts.length < 4) {
    console.log('Invalid credentials format');
    return [];
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
      console.error('Failed to get access token:', await tokenResponse.text());
      return [];
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
      console.error('Failed to get emails:', await inboxResponse.text());
      return [];
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

    return results;
  } catch (error) {
    console.error('Error processing email credentials:', error);
    return [];
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
