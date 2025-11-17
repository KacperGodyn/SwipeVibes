import React, { useEffect, useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View, Platform } from "react-native";
import { AudioPlayer } from "expo-audio";
import { RandomTrackResponse } from "../services/recommendation/provideRecommendation";
import { useAudioPrefs } from "../services/audio/useAudioPrefs";
import CardNavigationContainer from "./containers/CardNavigationContainer";
import MutedIcon from "../assets/HomeCard/muted.svg"
import UnMutedIcon from "../assets/HomeCard/unmuted.svg"

type Props = {
  track: RandomTrackResponse;
  player: AudioPlayer;
  muted: boolean;
  onUndo: () => void;
  undoDisabled: boolean;
  onDislike: () => void;
  onLike: () => void;
};

export default function MainCardDisplayedContent({
  track,
  player,
  muted,
  onUndo,
  undoDisabled,
  onDislike,
  onLike
}: Props) {
  const { setMuted } = useAudioPrefs();
  const source = useMemo(() => track?.preview ?? null, [track?.preview]);

  const tryPlay = () => {
    if (!source) return;
    player.muted = muted;
    const p: any = player.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {});
    }
  };

  useEffect(() => {
    if (source) tryPlay();
  }, [player, muted, source]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const resumeFromGesture = () => { if (!source) return; tryPlay(); };
    window.addEventListener("pointerdown", resumeFromGesture, { passive: true, once: true });
    window.addEventListener("keydown", resumeFromGesture, { passive: true, once: true });
    window.addEventListener("touchstart", resumeFromGesture, { passive: true, once: true });
    const onVis = () => { if (document.visibilityState === "visible") tryPlay(); };
    document.addEventListener("visibilitychange", onVis);
    let tries = 0;
    const id = setInterval(() => {
      if (!source || muted) return;
      tries++;
      if (tries > 12) { clearInterval(id); return; }
      tryPlay();
    }, 5000);
    return () => {
      window.removeEventListener("pointerdown", resumeFromGesture as any);
      window.removeEventListener("keydown", resumeFromGesture as any);
      window.removeEventListener("touchstart", resumeFromGesture as any);
      document.removeEventListener("visibilitychange", onVis as any);
      clearInterval(id);
    };
  }, [source, muted, player]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    player.muted = next;
    if (!next && source) tryPlay();
    else { try { player.pause(); } catch {} }
  };

  const artistPic =
    track?.artists?.[0]?.pictureXl ??
    track?.artists?.[0]?.pictureBig ??
    track?.album?.coverXl ??
    track?.album?.coverBig;

  const artistNames =
    (track?.artists?.map(a => a?.name).filter(Boolean).join(", ")) || "Unknown artist";
  const title = track?.title || "Unknown title";

  return (
    <View style={{ alignItems: "center", gap: 16 }}>
      <View style={styles.square}>
        {artistPic ? (
          <Image source={{ uri: artistPic }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.fallback]}>
            <Text style={styles.fallbackText}>{track.title ?? "No Art"}</Text>
          </View>
        )}

        <Pressable onPress={toggleMute} style={styles.muteBtn} className="rounded-3xl px-2 py-2 bg-white shadow-md flex-row items-center justify-around gap-5 border border-white/20 bg-white/30 backdrop-blur-xl">
          <View>
            <Text style={styles.muteText} >{muted ? 
              <MutedIcon style={styles.Icon}  /> 
            : <UnMutedIcon style={styles.Icon} /> }</Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>
        <Text style={styles.artist} numberOfLines={1} ellipsizeMode="tail">
          {artistNames}
        </Text>
      </View>
      
      <CardNavigationContainer
        onUndo={onUndo}
        undoDisabled={undoDisabled}
        onDislike={onDislike}
        onSuper={onLike}
        onLike={onLike}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  square: {
    width: 302,
    aspectRatio: 1,
    overflow: "hidden",
    backgroundColor: "transparent",
    borderRadius: 16,
    position: "relative",
  },
  image: { width: "100%", height: "100%" },
  fallback: { alignItems: "center", justifyContent: "center", padding: 12, backgroundColor: "transparent" },
  fallbackText: { color: "#fff", textAlign: "center" },

  meta: { width: 302, alignItems: "center", gap: 2 },
  title: { fontSize: 16, fontWeight: "700", color: "#fff", textAlign: "center" },
  artist: { fontSize: 13, fontWeight: "500", color: "#ddd", textAlign: "center" },

  muteBtn: { position: "absolute", top: 10, right: 10 },
  muteText: { color: "#000", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },

  Icon: { height: 30, width: 30 }
});