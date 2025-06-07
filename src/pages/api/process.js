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
    let product, token, qty

    if (req.method === 'GET') {
      // Estrai parametri dalla query string
      product = req.query.product
      token = req.query.token
      qty = parseInt(req.query.qty)
    } else if (req.method === 'POST') {
      // Estrai parametri dal body
      const body = req.body
      product = body.product
      token = body.token
      qty = parseInt(body.qty)
    }

    if (!product || !token || !qty) {
      return res.status(400).json({ 
        error: 'Bad request',
        message: 'Missing required parameters: product, token, qty'
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
        product_name: product,
        token: token,
        qty: qty
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
