'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Pet = {
  id: string
  name: string
  species: string
  breed: string | null
  birth_date: string | null
  weight_kg: number | null
}

const formatDate = (d: string) => d.split('-').reverse().join('/')

export default function PetsPage() {
  const router = useRouter()
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [species, setSpecies] = useState('cachorro')
  const [breed, setBreed] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [weight, setWeight] = useState('')

  const loadPets = useCallback(async () => {
    const { data, error } = await supabase
      .from('pets')
      .select('id, name, species, breed, birth_date, weight_kg')
      .order('created_at', { ascending: false })
    if (error) setMessage(error.message)
    else setPets(data ?? [])
  }, [])

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.replace('/login')
        return
      }
      await loadPets()
      setLoading(false)
    }
    init()
  }, [router, loadPets])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const { error } = await supabase.from('pets').insert({
      name,
      species,
      breed: breed || null,
      birth_date: birthDate || null,
      weight_kg: weight ? Number(weight) : null,
    })

    if (error) {
      setMessage(error.message)
    } else {
      setName('')
      setBreed('')
      setBirthDate('')
      setWeight('')
      await loadPets()
    }
    setSaving(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) return <main className="p-6">Carregando...</main>

  return (
    <main className="mx-auto max-w-md space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Meus pets</h1>
        <button onClick={handleSignOut} className="text-sm underline">
          Sair
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 rounded border p-4">
        <h2 className="font-semibold">Cadastrar pet</h2>

        <input
          className="w-full rounded border p-3 text-black"
          placeholder="Nome do pet"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <select
          className="w-full rounded border p-3 text-black"
          value={species}
          onChange={(e) => setSpecies(e.target.value)}
        >
          <option value="cachorro">Cachorro</option>
          <option value="gato">Gato</option>
          <option value="outro">Outro</option>
        </select>

        <input
          className="w-full rounded border p-3 text-black"
          placeholder="Raça (opcional)"
          value={breed}
          onChange={(e) => setBreed(e.target.value)}
        />

        <input
          className="w-full rounded border p-3 text-black"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
        />

        <input
          className="w-full rounded border p-3 text-black"
          type="number"
          step="0.1"
          min="0"
          max="999"
          placeholder="Peso em kg (opcional)"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded bg-teal-600 p-3 font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar pet'}
        </button>

        {message && <p className="text-sm text-red-600">{message}</p>}
      </form>

      <ul className="space-y-3">
        {pets.length === 0 && (
          <li className="text-sm">Você ainda não cadastrou nenhum pet.</li>
        )}
        {pets.map((pet) => (
          <li key={pet.id} className="rounded border p-4">
            <Link href={`/pets/${pet.id}`} className="font-semibold underline">{pet.name}</Link>
            <p className="text-sm">
              {pet.species}
              {pet.breed ? ` · ${pet.breed}` : ''}
            </p>
            {pet.birth_date && (
              <p className="text-sm">Nascimento: {formatDate(pet.birth_date)}</p>
            )}
            {pet.weight_kg !== null && (
              <p className="text-sm">Peso: {pet.weight_kg} kg</p>
            )}
          </li>
        ))}
      </ul>
    </main>
  )
}

