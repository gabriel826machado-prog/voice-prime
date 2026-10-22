import { supabase } from "./supabase.js";

const MAX_HISTORY = 200;

// Entra na sala: cria o registro, assina o realtime e carrega o histórico.
// Retorna o canal para ser removido ao sair.
export async function joinChat(roomId, onMessage) {
  if (!supabase) throw new Error("Supabase não configurado.");

  const { error: roomError } = await supabase
    .from("rooms")
    .upsert({ id: roomId }, { onConflict: "id", ignoreDuplicates: true });
  if (roomError) throw roomError;

  // Assina antes de carregar o histórico, para não perder mensagens no intervalo.
  const channel = supabase
    .channel(`room-${roomId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
      ({ new: message }) => onMessage(message)
    )
    .subscribe();

  // Pega as últimas N mensagens (descendente) e inverte para exibir em ordem.
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORY);
  if (error) {
    supabase.removeChannel(channel);
    throw error;
  }
  data.reverse().forEach(onMessage);

  return channel;
}

export async function sendChatMessage(roomId, author, content) {
  if (!supabase) throw new Error("Supabase não configurado.");
  const { error } = await supabase
    .from("messages")
    .insert({ room_id: roomId, author, content });
  if (error) throw error;
}

export function leaveChat(channel) {
  if (supabase && channel) supabase.removeChannel(channel);
}