import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import ButtonLogInVia from '../components/buttons/ButtonLogInVia';
import ContainerFlexColumn from '../components/containers/ContainerFlexColumn';
import SubContainerFlexRow from '../components/containers/SubContainerFlexRow';
import InputField from '../components/InputField';

import { useSpotifyLogin } from '../services/auth/gRPC/user/services/useSpotifyLogin';
import {
  loginWithSpotify,
  loginWithGoogle,
  loginWithPassword,
  registerUser,
} from '../services/auth/api';
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

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleStandardAuth = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      if (isLoginMode) {
        const res = await loginWithPassword(username, password);
        setSavedUser(res.username, (res as any).role);
        setSavedAvatar(null);

        const token = loadAccessToken();
        if (token) signIn(token);
      } else {
        await registerUser(username, password);

        const res = await loginWithPassword(username, password);
        setSavedUser(res.username, (res as any).role);
        setSavedAvatar(null);

        const token = loadAccessToken();
        if (token) signIn(token);
      }
    } catch (error: any) {
      console.error(error);
      const msg = error.message || (isLoginMode ? 'Login failed' : 'Registration failed');
      Alert.alert('Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

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
      Alert.alert('Spotify sign-in failed');
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
      Alert.alert('Google sign-in failed');
    },
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#121212' }} >
      <ContainerFlexColumn style={{ width: '95%', height: '90%', borderRadius: 20 }}>
        <View style={{ width: '80%', marginBottom: 20, gap: 15, maxWidth: 360 }} >
          <Text
            style={{
              color: 'white',
              fontSize: 24,
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: 10,
            }}>
            {isLoginMode ? 'Welcome Back!' : 'Create an Account'}
          </Text>

          <InputField
            placeholder="Username"
            placeholderTextColor="#ccc"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            className="h-12 px-4 text-white"
          />

          <InputField
            placeholder="Password"
            placeholderTextColor="#ccc"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            className="h-12 px-4 text-white"
          />

          <TouchableOpacity
            onPress={handleStandardAuth}
            disabled={isLoading}
            className="mt-2 h-12 items-center justify-center rounded-full border border-[#0F0F0F]/40 bg-[#0F0F0F] shadow-lg active:bg-white/30">
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                {isLoginMode ? 'Log In' : 'Sign Up'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsLoginMode(!isLoginMode)}>
            <Text
              style={{
                color: '#ddd',
                textAlign: 'center',
                marginTop: 5,
                textDecorationLine: 'underline',
              }}>
              {isLoginMode ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={{ flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 20 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#F05454' }} />
          <Text style={{ width: 50, textAlign: 'center', color: '#F05454' }}>OR</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#F05454' }} />
        </View>

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
    </View>
  );
}
