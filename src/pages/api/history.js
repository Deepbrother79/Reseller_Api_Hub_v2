// pages/api/history.js
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
    let token

    if (req.method === 'GET') {
      // Estrai token dalla query string
      token = req.query.token
    } else if (req.method === 'POST') {
      // Estrai token dal body
      const body = req.body
      token = body.token
    }

    if (!token) {
      return res.status(400).json({ 
        error: 'Bad request',
        message: 'Missing required parameter: token'
      })
    }

    // Chiamata alla funzione Supabase
    const response = await fetch(`${supabaseUrl}/functions/v1/storico`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: token
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch history')
    }

    res.status(200).json(data)
  } catch (error) {
    console.error('Error fetching history:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
}
