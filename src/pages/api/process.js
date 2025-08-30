// pages/api/process.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req, res) {
  // Imposta headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    let product_id, product_name, token, qty, use_master_token

    if (req.method === 'GET') {
      // Estrai parametri dalla query string
      product_name = req.query.product || req.query.product_name
      product_id = req.query.product_id
      token = req.query.token
      qty = parseInt(req.query.qty) || 0
      use_master_token = req.query.use_master_token === 'true'
    } else if (req.method === 'POST') {
      // Estrai parametri dal body
      const body = req.body
      console.log('process.js - POST body received:', JSON.stringify(body))
      product_name = body.product || body.product_name
      product_id = body.product_id
      token = body.token
      qty = parseInt(body.qty) || 0
      use_master_token = Boolean(body.use_master_token)
    }

    if ((!product_name && !product_id) || !token || qty <= 0) {
      return res.status(400).json({ 
        error: 'Bad request',
        message: 'Missing required parameters: (product_name OR product_id), token, qty'
      })
    }

    // Chiamata alla funzione Supabase
    const response = await fetch(`${supabaseUrl}/functions/v1/processa-richiesta`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: product_id,
        product_name: product_name,
        token: token,
        qty: qty,
        use_master_token: use_master_token
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to process request')
    }

    res.status(200).json(data)
  } catch (error) {
    console.error('Error processing request:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
}
