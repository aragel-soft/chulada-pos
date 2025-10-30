// Valida que las variables de Supabase existan
if (!import.meta.env.VITE_SUPABASE_URL) {
  throw new Error("VITE_SUPABASE_URL is not set in .env");
}
if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
  throw new Error("VITE_SUPABASE_ANON_KEY is not set in .env");
}

export const ENV = {
  // Supabase
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,

  // App
  APP_NAME: import.meta.env.VITE_APP_NAME || 'Chulada POS',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '0.1.0',
} as const;