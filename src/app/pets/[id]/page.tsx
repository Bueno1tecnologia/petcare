'use client'

import { Suspense, useCallback, useEffect, useState, type FormEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import PetDocuments from '@/components/PetDocuments'

type PetInfo = { name: string; species: string }
type HealthRecord = {
  id: string
  record_type: string
  title: string
  record_date: string
  next_due_date: string | null
  notes: string | null
}

const TYPES = [
  { value: 'vacina', label: 'Vacina' },
  { value: 'consulta', label: 'Consulta' },
  { value: 'exame', label: 'Exame' },
  { value: 'medicamento', label: 'Medicamento' },
  { value: 'procedimento', label: 'Procedimento' },
]

const formatDate = (d: string) => d.split('-').reverse().join('/')

function PetHealthContent() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const petId = params.id

  const [pet, setPet] = useState<PetInfo | null>(null)
  const [records, setRecords] = useState<HealthRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [recordType, setRecordType] = useState('vacina')
  const [title, setTitle] = useState('')
  const [recordDate, setRecordDate] = useState('')
  const [nextDue, setNextDue] = useState('')
  const [notes, setNotes] = useState('')

  const loadRecords = useCallback(async () => {
    const { data, error } = await supabase
      .from('health_records')
      .select('id, record_type, title, record_date, next_due_date, notes')
      .eq('pet_id', petId)
      .order('record_date', { ascending: false })
    if (error) setMessage(error.message)
    else setRecords(data ?? [])
  }, [petId])

  useEffect(() => {
    async function init() {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        router.replace('/login')
        return
      }
      const { data: petData, error } = await supabase
        .from('pets')
        .select('name, species')
        .eq('id', petId)
        .single()
      if (error) {
        setMessage('Pet não encontrado.')
        setLoading(false)
        return
      }
      setPet(petData)
      await loadRecords()
      setLoading(false)
    }
    init()
  }, [petId, router, loadRecords])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const { error } = await supabase.from('health_records').insert({
      pet_id: petId,
      record_type: recordType,
      title,
      record_date: recordDate,
      next_due_date: nextDue || null,
      notes: notes || null,
    })

    if (error) {
      setMessage(error.message)
    } else {
      setTitle('')
      setRecordDate('')
      setNextDue('')
      setNotes('')
      await loadRecords()
    }
    setSaving(false)
  }

  if (loading) return <main className="p-6">Carregando...</main>

  return (
    <main className="mx-auto max-w-md space-y-6 p-4">
      <Link href="/pets" className="text-sm underline">
        ← Meus pets
      </Link>

      <h1 className="text-2xl font-bold">
        {pet ? `Carteirinha de ${pet.name}` : 'Carteirinha'}
      </h1>

      {pet && (
        <>
          <form onSubmit={handleSubmit} className="space-y-3 rounded border p-4">
            <h2 className="font-semibold">Novo registro</h2>

            <select
              className="w-full rounded border p-3 text-black"
              value={recordType}
              onChange={(e) => setRecordType(e.target.value)}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <input
              className="w-full rounded border p-3 text-black"
              placeholder="Título (ex.: V10, Consulta de rotina)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <label className="block text-sm">
              Data do registro
              <input
                className="mt-1 w-full rounded border p-3 text-black"
                type="date"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                required
              />
            </label>

            <label className="block text-sm">
              Próxima data / retorno (opcional)
              <input
                className="mt-1 w-full rounded border p-3 text-black"
                type="date"
                value={nextDue}
                onChange={(e) => setNextDue(e.target.value)}
              />
            </label>

            <textarea
              className="w-full rounded border p-3 text-black"
              placeholder="Observações (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded bg-teal-600 p-3 font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar registro'}
            </button>
          </form>

          <ul className="space-y-3">
            {records.length === 0 && (
              <li className="text-sm">Nenhum registro ainda.</li>
            )}
            {records.map((r) => (
              <li key={r.id} className="rounded border p-4">
                <p className="text-xs uppercase">{r.record_type}</p>
                <p className="font-semibold">{r.title}</p>
                <p className="text-sm">Data: {formatDate(r.record_date)}</p>
                {r.next_due_date && (
                  <p className="text-sm">
                    Próxima: {formatDate(r.next_due_date)}
                  </p>
                )}
                {r.notes && <p className="text-sm">{r.notes}</p>}
              </li>
            ))}
          </ul>
        </>
      )}

      {pet && <PetDocuments petId={petId} />}
      {message && <p className="text-sm text-red-600">{message}</p>}
    </main>
  )
}


export default function PetHealthPage() {
  return (
    <Suspense fallback={<main className="p-6">Carregando...</main>}>
      <PetHealthContent />
    </Suspense>
  )
}

