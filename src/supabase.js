import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || 'https://nejjocgplgbgmdornurw.supabase.co'
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lampvY2dwbGdiZ21kb3JudXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MTk4MzEsImV4cCI6MjA5OTE5NTgzMX0.dJ_xMqV4Qp-1gZKifYJ-qTW6p9GhoMdfxlr_zIJx7Ko'

export const supabase = createClient(url, key)
