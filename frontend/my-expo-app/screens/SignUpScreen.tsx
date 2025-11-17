import React from 'react';
import { router } from 'expo-router';
import ButtonLogInVia from '../components/buttons/ButtonLogInVia';
import ButtonSignUpClassic from '../components/buttons/ButtonSignUpClassic';
import ContainerFlexColumn from '../components/containers/ContainerFlexColumn';
import SubContainerFlexRow from '../components/containers/SubContainerFlexRow';

import { useSpotifyLogin } from 'services/auth/gRPC/user/services/useSpotifyLogin';
import { loginWithSpotify } from '../services/auth/api';
import { setSavedUser } from '../services/auth/userInfo';
import { setSavedAvatar } from '../services/auth/userInfo';

import { useGoogleLogin } from '../services/auth/gRPC/user/services/useGoogleLogin';
import { loginWithGoogle } from '../services/auth/api';

import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

export default function SignUpScreen() {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');

  const spotify = useSpotifyLogin({
    onSuccess: async (spotifyIdToken) => {
      const res = await loginWithSpotify(spotifyIdToken); // sets access token internally
      setSavedUser(res.username, (res as any).role);

      try {
        const meRes = await fetch('https://api.spotify.com/v1/me', {
          headers: { Authorization: `Bearer ${spotifyIdToken}` },
        });
        if (meRes.ok) {
          const me = await meRes.json();
          const avatar =
            (Array.isArray(me.images) && me.images.length > 0 && me.images[0]?.url) || null;
          setSavedAvatar(avatar);
        } else {
          setSavedAvatar(null);
        }
      } catch {
        setSavedAvatar(null);
      }

      console.log('Logged in as:', res.username);
      router.replace('/home');
    },
    onError: (err) => {
      console.error(err);
      alert('Spotify sign-in failed');
    },
  });

  const google = useGoogleLogin({
    onSuccess: async (googleIdToken) => {
      const cred = GoogleAuthProvider.credential(googleIdToken);
      const userCred = await signInWithCredential(auth, cred);

      const firebaseIdToken = await userCred.user.getIdToken();

      const res = await loginWithGoogle(firebaseIdToken); // sets access token internally
      setSavedUser(res.username, (res as any).role);
      const photo = userCred.user?.photoURL ?? null;
      setSavedAvatar(photo);
      console.log('Logged in as:', res.username);
      router.replace('/home');
    },
    onError: (err) => {
      console.error(err);
      alert('Google sign-in failed');
    },
  });

  const doSoundCloud = React.useCallback(() => alert('SoundCloud login TBD'), []);
  const doSteam = React.useCallback(() => alert('Steam login TBD'), []);
  const doGitHub = React.useCallback(() => alert('GitHub login TBD'), []);

  return (
    <ContainerFlexColumn style={{ width: '85%', height: '90%' }}>
      <SubContainerFlexRow>
        <ButtonSignUpClassic title="Sign up with an e-mail" />
      </SubContainerFlexRow>

      <SubContainerFlexRow>
        <ButtonLogInVia
          provider="spotify"
          onPress={() => {
            void spotify.promptAsync();
          }}
          disabled={!spotify.ready}
          loading={spotify.loading}
        />
        <ButtonLogInVia provider="soundcloud" onPress={doSoundCloud} />
        <ButtonLogInVia provider="steam" onPress={doSteam} />
      </SubContainerFlexRow>

      <SubContainerFlexRow>
        <ButtonLogInVia
          provider="google"
          onPress={() => {
            void google.promptAsync();
          }}
          disabled={!google.ready}
          loading={google.loading}
        />
        <ButtonLogInVia provider="github" onPress={doGitHub} />
      </SubContainerFlexRow>
    </ContainerFlexColumn>
  );
}
