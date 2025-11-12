import { Pressable, View, ActivityIndicator } from "react-native";
import React from "react";
import SpotifyIcon from "../../assets/Provider/spotify_logo_colour.svg";
import SoundCloudIcon from "../../assets/Provider/soundcloud_logo_colour.svg";
import SteamIcon from "../../assets/Provider/steam_logo_black.svg";
import GoogleIcon from "../../assets/Provider/google_logo_colour.svg";
import GitHubIcon from "../../assets/Provider/github_logo_black.svg";

type Provider = "spotify" | "soundcloud" | "steam" | "google" | "github";

const ICONS: Record<Provider, React.ComponentType<{ width?: number; height?: number }>> = {
  spotify: SpotifyIcon,
  soundcloud: SoundCloudIcon,
  steam: SteamIcon,
  google: GoogleIcon,
  github: GitHubIcon,
};

type Props = {
  provider: Provider;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
};

export default function ButtonLogInVia({ provider, onPress, disabled, loading }: Props) {
  const Icon = ICONS[provider];
  const isDisabled = disabled || loading;

  return (
    <View>
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        className={`mx-2 my-2 h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-white/30 shadow-md backdrop-blur-xl active:bg-white/40 ${
          isDisabled ? "opacity-60" : ""
        }`}
      >
        {loading ? <ActivityIndicator /> : <Icon width={40} height={40} />}
      </Pressable>
    </View>
  );
}
