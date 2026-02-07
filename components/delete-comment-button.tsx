'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'

export default function DeleteCommentButton({ commentId }: { commentId: string }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Yorumu silmek istediğinizden emin misiniz?')) {
      return
    }

    setDeleting(true)

    try {
      const response = await fetch(`/api/admin/comments/${commentId}`, {
        method: 'DELETE',
      })

      if (response?.ok) {
        router?.refresh?.()
      } else {
        alert('Silme işlemi başarısız oldu')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Bir hata oluştu')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="inline-flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 font-inter text-sm font-medium text-red-600 transition-colors hover:bg-red-500/20 disabled:opacity-50"
    >
      {deleting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
      Sil
    </button>
  )
}