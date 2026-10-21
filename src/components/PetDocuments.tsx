'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'

type Doc = {
  id: string
  file_path: string
  file_name: string
  mime_type: string
  size_bytes: number
}

const MAX_SIZE = 10 * 1024 * 1024
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png']

export default function PetDocuments({ petId }: { petId: string }) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  const loadDocs = useCallback(async () => {
    const { data, error } = await supabase
      .from('pet_documents')
      .select('id, file_path, file_name, mime_type, size_bytes')
      .eq('pet_id', petId)
      .order('created_at', { ascending: false })
    if (error) setMessage(error.message)
    else setDocs(data ?? [])
  }, [petId])

  useEffect(() => {
    loadDocs()
  }, [loadDocs])

  async function handleUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    if (!file) return
    setMessage('')

    if (!ALLOWED.includes(file.type)) {
      setMessage('Tipo não permitido. Use PDF, JPG ou PNG.')
      return
    }
    if (file.size > MAX_SIZE) {
      setMessage('Arquivo maior que 10 MB.')
      return
    }

    setUploading(true)

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
      setMessage('Sessão expirada. Entre novamente.')
      setUploading(false)
      return
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${userData.user.id}/${petId}/${Date.now()}-${safeName}`

    const { error: uploadError } = await supabase.storage
      .from('pet-documents')
      .upload(path, file, { contentType: file.type })

    if (uploadError) {
      setMessage(uploadError.message)
      setUploading(false)
      return
    }

    const { error: insertError } = await supabase.from('pet_documents').insert({
      pet_id: petId,
      file_path: path,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
    })

    if (insertError) {
      await supabase.storage.from('pet-documents').remove([path])
      setMessage(insertError.message)
      setUploading(false)
      return
    }

    form.reset()
    setFile(null)
    await loadDocs()
    setUploading(false)
  }

  async function openDoc(path: string) {
    const { data, error } = await supabase.storage
      .from('pet-documents')
      .createSignedUrl(path, 60)
    if (error || !data) {
      setMessage(error?.message ?? 'Não foi possível abrir o arquivo.')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Documentos</h2>

      <form onSubmit={handleUpload} className="space-y-3 rounded border p-4">
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm"
          required
        />
        <p className="text-xs">PDF, JPG ou PNG, até 10 MB.</p>
        <button
          type="submit"
          disabled={uploading || !file}
          className="w-full rounded bg-teal-600 p-3 font-semibold text-white disabled:opacity-50"
        >
          {uploading ? 'Enviando...' : 'Enviar documento'}
        </button>
      </form>

      {message && <p className="text-sm text-red-600">{message}</p>}

      <ul className="space-y-3">
        {docs.length === 0 && (
          <li className="text-sm">Nenhum documento ainda.</li>
        )}
        {docs.map((d) => (
          <li
            key={d.id}
            className="flex items-center justify-between gap-3 rounded border p-4"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold">{d.file_name}</p>
              <p className="text-xs">
                {(d.size_bytes / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={() => openDoc(d.file_path)}
              className="text-sm underline"
            >
              Abrir
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
