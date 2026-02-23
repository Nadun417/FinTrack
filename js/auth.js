import { supabase } from "./supabaseClient.js";

const NO_CLIENT_ERROR = { message: "Supabase is not configured. Check your .env file." };

function _requireClient() {
  if (!supabase) throw new Error(NO_CLIENT_ERROR.message);
}

export async function getSession() {
  if (!supabase) return { session: null, error: null };
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error };
}

export async function signIn(email, password) {
  _requireClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email, password) {
  _requireClient();
  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });
}

export async function signOut() {
  _requireClient();
  return supabase.auth.signOut();
}

export async function resetPassword(email) {
  _requireClient();
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
}

export function onAuthStateChange(callback) {
  if (!supabase) return { data: { subscription: { unsubscribe() {} } } };
  return supabase.auth.onAuthStateChange(callback);
}

export async function deleteAccount() {
  _requireClient();
  // Calls a SECURITY DEFINER RPC that deletes the calling user from auth.users.
  // All related data cascades automatically.
  const { error } = await supabase.rpc("delete_own_account");
  if (error) return { error };
  await supabase.auth.signOut();
  return { error: null };
}
