'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (event.nativeEvent instanceof SubmitEvent && event.nativeEvent.submitter === null) return
    setPending(true); setError('')
    const data = new FormData(event.currentTarget)
    const result = mode === 'sign-up'
      ? await authClient.signUp.email({ name: String(data.get('name')), email: String(data.get('email')), password: String(data.get('password')) })
      : await authClient.signIn.email({ email: String(data.get('email')), password: String(data.get('password')) })
    if (result.error) setError('Unable to authenticate. Check your details and try again.')
    else { router.replace('/dashboard'); router.refresh() }
    setPending(false)
  }
  return <form onSubmit={submit} className="w-full rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.35)]">
    <div className="flex flex-col gap-5">
      {mode === 'sign-up' && <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">Full name<input name="name" required placeholder="Your name" autoComplete="name" className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#4668e8] focus:ring-4 focus:ring-[#4668e8]/10" /></label>}
      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">Email address<input name="email" type="email" required placeholder="you@example.com" autoComplete="email" className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#4668e8] focus:ring-4 focus:ring-[#4668e8]/10" /></label>
      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">Password<input name="password" type="password" minLength={8} required placeholder="At least 8 characters" autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'} className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#4668e8] focus:ring-4 focus:ring-[#4668e8]/10" /></label>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">{error}</p>}
      <button disabled={pending} className="h-12 rounded-xl bg-[#17213a] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#263452] disabled:cursor-not-allowed disabled:opacity-60">{pending ? 'Please wait…' : mode === 'sign-up' ? 'Create account' : 'Sign in'}</button>
    </div>
  </form>
}
