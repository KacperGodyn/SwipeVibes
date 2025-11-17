import http from "./api/http";

export type InteractionDecision = "like" | "dislike" | "skip";

export async function logInteraction(payload: {
  isrc: string;
  decision: InteractionDecision;
  deezerTrackId?: number;
  source?: string;
  previewUrl?: string;
  artist?: string;
  title?: string;
  album?: string;
  bpm?: number | null;
  gain?: number | null;
}) {
  await http.post("/api/interactions", {
    Isrc: payload.isrc,
    Decision: payload.decision,
    DeezerTrackId: payload.deezerTrackId,
    Source: payload.source,
    PreviewUrl: payload.previewUrl,
    Artist: payload.artist,
    Title: payload.title,
    Album: payload.album,
    Bpm: payload.bpm ?? undefined,
    Gain: payload.gain ?? undefined,
  });
}
