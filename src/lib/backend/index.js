import { localBackend } from './local'
import { cloudBackend, supabase } from './cloud'

// Cloud mode turns on automatically when the two Supabase variables are present at build time.
export const backend = supabase ? cloudBackend : localBackend
export const isCloud = backend.mode === 'cloud'
