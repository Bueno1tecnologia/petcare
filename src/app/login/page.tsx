'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'; import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter(); const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) setMessage(error.message)
      else if (!data.session)
        setMessage('Conta criada! Confira seu e-mail para confirmar o cadastro.')
      else router.push('/pets')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
      else router.push('/pets')
    }

    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">
          {mode === 'login' ? 'Entrar' : 'Criar conta'}
        </h1>

        {mode === 'signup' && (
          <input
            className="w-full rounded border p-3 text-black"
            placeholder="Seu nome"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        )}

        <input
          className="w-full rounded border p-3 text-black"
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          className="w-full rounded border p-3 text-black"
          type="password"
          placeholder="Senha (mínimo 6 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-teal-600 p-3 font-semibold text-white disabled:opacity-50"
        >
          {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>

        {message && <p className="text-sm">{message}</p>}

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login')
            setMessage('')
          }}
          className="w-full text-sm underline"
        >
          {mode === 'login'
            ? 'Não tem conta? Criar conta'
            : 'Já tem conta? Entrar'}
        </button>
      </form>
    </main>
  )
}

