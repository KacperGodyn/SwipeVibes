import React from 'react';
import ButtonLogInVia from '../components/buttons/ButtonLogInVia';
import ButtonSignUpClassic from '../components/buttons/ButtonSignUpClassic';
import ContainerFlexColumn from '../components/containers/ContainerFlexColumn';
import SubContainerFlexRow from '../components/containers/SubContainerFlexRow';

import { useSpotifyLogin } from '../services/auth/gRPC/user/services/useSpotifyLogin';
import { loginWithSpotify, loginWithGoogle } from '../services/auth/api';
import { setSavedUser, setSavedAvatar } from '../services/auth/userInfo';
import { loadAccessToken } from '../services/auth/token';

import { useGoogleLogin } from '../services/auth/gRPC/user/services/useGoogleLogin';

import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

import { useSession } from '../services/auth/ctx';

import Constants from 'expo-constants';

const config = Constants.expoConfig?.extra;

export default function SignUpScreen() {
  const { signIn } = useSession();

  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');

  const spotify = useSpotifyLogin({
    onSuccess: async (spotifyIdToken) => {
      const res = await loginWithSpotify(spotifyIdToken);
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

      const token = loadAccessToken();
      if (token) {
        signIn(token);
      }
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

      const res = await loginWithGoogle(firebaseIdToken);
      setSavedUser(res.username, (res as any).role);
      const photo = userCred.user?.photoURL ?? null;
      setSavedAvatar(photo);

      const token = loadAccessToken();
      if (token) {
        signIn(token);
      }
    },
    onError: (err) => {
      console.error(err);
      alert('Google sign-in failed');
    },
  });

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
        <ButtonLogInVia
          provider="google"
          onPress={() => {
            void google.promptAsync();
          }}
          disabled={!google.ready}
          loading={google.loading}
        />
      </SubContainerFlexRow>
    </ContainerFlexColumn>
  );
}