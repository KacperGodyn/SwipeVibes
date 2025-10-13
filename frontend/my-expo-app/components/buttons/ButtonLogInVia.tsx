import React, { useState } from 'react';
import { Pressable, Text, PressableProps, View } from 'react-native';

type ButtonLogInViaProps = {
  provider: 'spotify' | 'soundcloud' | 'steam' | 'google' | 'github';
};

import SpotifyIcon from '../../assets/spotify_logo_colour.svg';
import SoundCloudIcon from '../../assets/soundcloud_logo_colour.svg';
import SteamIcon from '../../assets/steam_logo_black.svg';
import GoogleIcon from '../../assets/google_logo_colour.svg';
import GitHubIcon from '../../assets/github_logo_black.svg';

const ICONS = {
  spotify: SpotifyIcon,
  soundcloud: SoundCloudIcon,
  steam: SteamIcon,
  google: GoogleIcon,
  github: GitHubIcon,
};

export default function ButtonLogInVia({ provider }: ButtonLogInViaProps) {
  const Icon = ICONS[provider];

  return (
    <View>
      <Pressable
        onPress={handleProviderLogIn}
        className="mx-2 my-2 h-24 w-24 items-center justify-center rounded-full border border-white/20 bg-white/30 shadow-md backdrop-blur-xl active:bg-white/40">
        <Icon width={40} height={40} />
      </Pressable>
    </View>
  );
}

function handleProviderLogIn() {
  // Logic for handling login via the specified provider
}
