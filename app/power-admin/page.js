'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PowerAdmin() {
  const router = useRouter()

  useEffect(() => {
    router.push('/power-admin/companii')
  }, [])

  return null
}