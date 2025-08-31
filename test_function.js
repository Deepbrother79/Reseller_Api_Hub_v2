// Test script per verificare la funzione deployata vs locale
const testDeployedFunction = async () => {
  console.log('=== TEST FUNZIONE DEPLOYATA ===');
  
  // Test 1: Invio parametri mancanti per vedere il messaggio di errore
  try {
    const response = await fetch('https://vvtnzixsxfjzwhjetrfm.supabase.co/functions/v1/api-process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Parametri intenzionalmente mancanti per testare l'errore
      })
    });
    
    const data = await response.json();
    console.log('Risposta con parametri mancanti:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Errore durante la chiamata:', error);
  }
  
  // Test 2: Invio parametri corretti
  try {
    const response = await fetch('https://vvtnzixsxfjzwhjetrfm.supabase.co/functions/v1/api-process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: '2ab279e8-714f-434e-92e9-875f734c0eed',
        token: 'kUzT-1-nVizFYyXST0pIGY',
        qty: 1,
        use_master_token: false
      })
    });
    
    const data = await response.json();
    console.log('Risposta con parametri corretti:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Errore durante la chiamata:', error);
  }
};

// Test per Node.js
if (typeof require !== 'undefined') {
  const fetch = require('node-fetch');
  testDeployedFunction();
} else {
  // Test per browser
  testDeployedFunction();
}