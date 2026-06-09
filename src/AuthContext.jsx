import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { dealLimit } from './lib/tiers'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    return { data, error }
  }
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }
  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/analyze' }
    })
    return { data, error }
  }
  const signOut = async () => { await supabase.auth.signOut() }

  // Returns the current session's JWT (or null) for Authorization headers
  // when hitting protected /api routes. Reads from the live session rather
  // than the cached `user` so it survives token refresh.
  const getAccessToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  }

  const getSubscription = async () => {
    if (!user) return { data: null, error: null }
    const { data, error } = await supabase.from('subscriptions').select('*').eq('user_id', user.id).single()
    return { data, error }
  }

  // Cached user tier: resolves to "free" | "pro" | "scale". Updated whenever
  // user signs in / out. Components read this via useUserTier() below.
  const [userTier, setUserTier] = useState('free')
  useEffect(() => {
    let cancelled = false
    async function resolve() {
      if (!user) { setUserTier('free'); return }
      try {
        const { data } = await supabase
          .from('subscriptions')
          .select('plan, status')
          .eq('user_id', user.id)
          .single()
        if (cancelled) return
        if (data?.status === 'active' && (data?.plan === 'pro' || data?.plan === 'scale')) {
          setUserTier(data.plan)
        } else {
          setUserTier('free')
        }
      } catch {
        if (!cancelled) setUserTier('free')
      }
    }
    resolve()
    return () => { cancelled = true }
  }, [user])

  const saveDeal = async (deal) => {
    if (!user) return { error: 'Not logged in' }

    // Tier-aware cap. FREE=3, PRO=10, SCALE=∞ (per src/lib/tiers.js).
    // Counts the user's existing saved_deals and refuses the insert if the
    // tier limit is reached.
    const limit = dealLimit(userTier)
    if (Number.isFinite(limit)) {
      const { count } = await supabase.from('saved_deals').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      if ((count ?? 0) >= limit) {
        return { error: 'SAVE_LIMIT_REACHED', count, limit, tier: userTier }
      }
    }

    const { data, error } = await supabase.from('saved_deals').insert([{ ...deal, user_id: user.id }]).select().single()
    return { data, error }
  }

  // Used by Portfolio / nav badges: "5 / 10 used". Returns { count, limit }
  // where limit is Infinity for SCALE.
  const getDealUsage = async () => {
    if (!user) return { count: 0, limit: dealLimit('free') }
    const { count } = await supabase.from('saved_deals').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
    return { count: count ?? 0, limit: dealLimit(userTier), tier: userTier }
  }
  const getDeals = async () => {
    if (!user) return { data: [], error: null }
    const { data, error } = await supabase.from('saved_deals').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    return { data, error }
  }
  const deleteDeal = async (id) => {
    const { error } = await supabase.from('saved_deals').delete().eq('id', id).eq('user_id', user.id)
    return { error }
  }
  const getDealByShareId = async (shareId) => {
    const { data, error } = await supabase.from('saved_deals').select('*').eq('share_id', shareId).single()
    return { data, error }
  }

  return (
    <AuthContext.Provider value={{ user, loading, userTier, signUp, signIn, signInWithGoogle, signOut, getAccessToken, saveDeal, getDeals, deleteDeal, getDealByShareId, getSubscription, getDealUsage }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
