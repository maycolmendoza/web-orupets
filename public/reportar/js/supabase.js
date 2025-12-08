// Conexión a Supabase para subir archivos y guardar registros
const SUPABASE_URL = window.SUPABASE_URL || 'https://YOUR_SUPABASE_URL';
const SUPABASE_KEY = window.SUPABASE_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY);

export async function uploadToSupabase(file, path) {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { data, error } = await supabase.storage.from('lost_pets').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: publicUrl } = supabase.storage.from('lost_pets').getPublicUrl(data.path);
  return publicUrl?.publicUrl;
}

export async function saveReportToSupabase(payload) {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { error } = await supabase.from('lost_pets').insert(payload);
  if (error) throw error;
  return true;
}
