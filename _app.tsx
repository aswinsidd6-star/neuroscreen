import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

export default function DoctorLogin() {
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const login = async () => {
    setLoading(true); setError('')
    const res = await fetch('/api/doctor-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) })
    const data = await res.json()
    if (data.success) {
      sessionStorage.setItem('doctor_auth', '1')
      router.push('/doctor/dashboard')
    } else {
      setError('Incorrect password. Please try again.')
    }
    setLoading(false)
  }

  return (
    <>
      <Head><title>Doctor Login — NeuroScreen</title></Head>
      <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 400, animation: 'slideUp 0.4s ease both' }}>
          <div className="text-center mb-8">
            <div style={{ fontSize: 48, marginBottom: 12 }}>🩺</div>
            <h1 className="font-lora text-3xl text-white mb-2">Doctor Login</h1>
            <p className="text-gray-400 text-sm">Access the patient results dashboard</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: 28 }}>
            <label className="block text-xs font-mono text-gray-400 tracking-widest mb-3 uppercase">Password</label>
            <input className="inp mb-4" type="password" placeholder="Enter doctor password…" value={pw}
              onChange={e => setPw(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') login() }} />
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <button className="btn-green w-full" onClick={login} disabled={loading || !pw}>
              {loading ? 'Checking…' : 'Enter Dashboard →'}
            </button>
          </div>
          <p className="text-center text-gray-600 text-xs mt-4">
            Default password: <span className="text-gray-400 font-mono">doctor123</span><br />
            <span className="text-gray-600">(Change this in your Vercel environment variables)</span>
          </p>
        </div>
      </div>
    </>
  )
}
