'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'

export default function ApproveCommentButton({ commentId }: { commentId: string }) {
  const router = useRouter()
  const [approving, setApproving] = useState(false)

  const handleApprove = async () => {
    setApproving(true)

    try {
      const response = await fetch(`/api/admin/comments/${commentId}/approve`, {
        method: 'POST',
      })

      if (response?.ok) {
        router?.refresh?.()
      } else {
        alert('Onaylama başarısız oldu')
      }
    } catch (error) {
      console.error('Approve error:', error)
      alert('Bir hata oluştu')
    } finally {
      setApproving(false)
    }
  }

  return (
    <button
      onClick={handleApprove}
      disabled={approving}
      className="inline-flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-2 font-inter text-sm font-medium text-green-600 transition-colors hover:bg-green-500/20 disabled:opacity-50"
    >
      {approving ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Check className="h-4 w-4" />
      )}
      Onayla
    </button>
  )
}