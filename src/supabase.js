import { createClient } from '@supabase/supabase-js'
const SUPABASE_URL = 'https://jskxmcgslbablilroxen.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impza3htY2dzbGJhYmxpbHJveGVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTQ1OTcsImV4cCI6MjA5MDAzMDU5N30.gVbKxsMI7zUjR7B2M8-faWE1uy8vFoe-T4Q0Qh3hy4Q'
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
