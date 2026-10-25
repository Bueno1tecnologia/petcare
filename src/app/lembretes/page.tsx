'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type RawRow = {
  id: string
  title: string
  record_type: string
  next_due_date: string
  pet_id: string
  pets: { name: string } | { name: string }[] | null
}

type Reminder = {
  id: string
  title: string
  record_type: string
  next_due_date: string
  pet_id: string
  petName: string
}

const formatDate = (d: string) => d.split('-').reverse().join('/')
const todayStr = () => new Date().toLocaleDateString('en-CA')

export default function RemindersPage() {
  const router = useRouter()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function init() {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        router.replace('/login')
        return
      }

      const { data, error } = await supabase
        .from('health_records')
        .select('id, title, record_type, next_due_date, pet_id, pets(name)')
        .not('next_due_date', 'is', null)
        .is('done_at', null)
        .order('next_due_date', { ascending: true })

      if (error) {
        setMessage(error.message)
      } else {
        const rows = (data ?? []) as unknown as RawRow[]
        setReminders(
          rows.map((r) => ({
            id: r.id,
            title: r.title,
            record_type: r.record_type,
            next_due_date: r.next_due_date,
            pet_id: r.pet_id,
            petName: Array.isArray(r.pets)
              ? (r.pets[0]?.name ?? 'Pet')
              : (r.pets?.name ?? 'Pet'),
          }))
        )
      }
      setLoading(false)
    }
    init()
  }, [router])

  async function markDone(id: string) {
    const { error } = await supabase
      .from('health_records')
      .update({ done_at: new Date().toISOString() })
      .eq('id', id)
    if (error) setMessage(error.message)
    else setReminders((prev) => prev.filter((r) => r.id !== id))
  }

  if (loading) return <main className="p-6">Carregando...</main>

  const today = todayStr()
  const overdue = reminders.filter((r) => r.next_due_date < today)
  const upcoming = reminders.filter((r) => r.next_due_date >= today)

  const renderItem = (r: Reminder, late: boolean) => (
    <li
      key={r.id}
      className={`rounded border p-4 ${late ? 'border-red-500' : ''}`}
    >
      <p className="text-xs uppercase">{r.record_type}</p>
      <p className="font-semibold">{r.title}</p>
      <p className="text-sm">
        {r.petName} · {formatDate(r.next_due_date)}
        {late ? ' (atrasado)' : ''}
      </p>
      <button type="button" onClick={() => markDone(r.id)} className="mr-4 text-sm underline">Marcar como feito</button>
      <Link href={`/pets/${r.pet_id}`} className="text-sm underline">
        Ver carteirinha
      </Link>
    </li>
  )

  return (
    <main className="mx-auto max-w-md space-y-6 p-4">
      <Link href="/pets" className="text-sm underline">
        ← Meus pets
      </Link>
      <h1 className="text-2xl font-bold">Lembretes</h1>

      {message && <p className="text-sm text-red-600">{message}</p>}

      {reminders.length === 0 && (
        <p className="text-sm">
          Nenhum lembrete. Cadastre uma vacina ou consulta com a data da
          próxima dose ou retorno.
        </p>
      )}

      {overdue.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Atrasados</h2>
          <ul className="space-y-3">{overdue.map((r) => renderItem(r, true))}</ul>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Próximos</h2>
          <ul className="space-y-3">
            {upcoming.map((r) => renderItem(r, false))}
          </ul>
        </section>
      )}
    </main>
  )
}

