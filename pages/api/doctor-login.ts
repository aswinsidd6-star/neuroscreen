import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { password } = req.body
  const correct = process.env.DOCTOR_PASSWORD || 'doctor123'
  if (password === correct) {
    res.json({ success: true })
  } else {
    res.status(401).json({ success: false, error: 'Incorrect password' })
  }
}
