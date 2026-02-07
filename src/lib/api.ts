import axios from 'axios';
import { supabase } from './supabase';

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000',
});

let sessionCache: any = null;
let lastFetch = 0;

// Interceptor to add Supabase token to requests
api.interceptors.request.use(async (config) => {
  const now = Date.now();
  // Cache session for 10 seconds to avoid redundant calls during parallel requests
  if (!sessionCache || (now - lastFetch > 10000)) {
    sessionCache = await supabase.auth.getSession();
    lastFetch = now;
  }
  
  const session = sessionCache.data?.session;
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

export default api;
