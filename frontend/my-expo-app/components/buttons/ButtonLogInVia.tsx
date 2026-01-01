import { Pressable, View, ActivityIndicator } from 'react-native';
import React from 'react';
import SpotifyIcon from '../../assets/Provider/spotify_logo_colour.svg';
import SoundCloudIcon from '../../assets/Provider/soundcloud_logo_colour.svg';
import SteamIcon from '../../assets/Provider/steam_logo_black.svg';
import GoogleIcon from '../../assets/Provider/google_logo_colour.svg';
import GitHubIcon from '../../assets/Provider/github_logo_black.svg';

type Provider = 'spotify' | 'soundcloud' | 'steam' | 'google' | 'github';

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
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-lg backdrop-blur-xl active:bg-white/10 active:shadow-[0_0_15px_rgba(255,255,255,0.1)] ${
        isDisabled ? 'opacity-50' : ''
      }`}>
      {loading ? <ActivityIndicator color="#F05454" /> : <Icon width={32} height={32} />}
    </Pressable>
  );
}
