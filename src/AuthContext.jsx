import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

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

  const saveDeal = async (deal) => {
    if (!user) return { error: 'Not logged in' }

    // Check subscription status
    const { data: sub } = await getSubscription()
    const isPro = sub?.status === 'active' && sub?.plan === 'pro'

    if (!isPro) {
      // Count existing saves
      const { count } = await supabase.from('saved_deals').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      if (count >= 3) {
        return { error: 'SAVE_LIMIT_REACHED', count }
      }
    }

    const { data, error } = await supabase.from('saved_deals').insert([{ ...deal, user_id: user.id }]).select().single()
    return { data, error }
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
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signInWithGoogle, signOut, getAccessToken, saveDeal, getDeals, deleteDeal, getDealByShareId, getSubscription }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
