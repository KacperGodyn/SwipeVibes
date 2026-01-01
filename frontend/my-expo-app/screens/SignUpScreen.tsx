import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import ButtonLogInVia from '../components/buttons/ButtonLogInVia';
import ScreenLayout from 'components/ScreenLayout';
import InputField from '../components/InputField';
import { useTheme } from '../services/theme/ThemeContext';

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

  const { colors } = useTheme();

  return (
    <ScreenLayout className="items-center justify-center" showVolumeControl={false}>
      <View
        style={{
          width: '90%',
          maxWidth: 400,
          backgroundColor: colors.card,
          borderRadius: 32,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          paddingHorizontal: 32,
          paddingVertical: 40,
        }}>
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <Text
            style={{
              fontSize: 32,
              fontWeight: '900',
              fontStyle: 'italic',
              letterSpacing: -1,
              color: colors.text,
            }}>
            SWIPE<Text style={{ color: colors.accent }}>VIBES</Text>
          </Text>
          <Text
            style={{
              marginTop: 12,
              fontSize: 11,
              letterSpacing: 3,
              color: colors.textSecondary,
              textTransform: 'uppercase',
            }}>
            {isLoginMode ? 'Welcome back' : 'Find your sound'}
          </Text>
        </View>

        <View style={{ gap: 16 }}>
          <InputField
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <InputField
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            onPress={handleStandardAuth}
            disabled={isLoading}
            style={{
              marginTop: 24,
              height: 56,
              backgroundColor: '#F05454',
              borderRadius: 28,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#F05454',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 20,
            }}>
            {isLoading ? (
              <ActivityIndicator color="black" />
            ) : (
              <Text style={{ fontSize: 16, fontWeight: '900', color: 'black', letterSpacing: 1 }}>
                {isLoginMode ? 'LOG IN' : 'SIGN UP'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 32, gap: 16 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
          <Text
            style={{
              fontSize: 10,
              fontWeight: '700',
              color: colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: 2,
            }}>
            or
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24 }}>
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
        </View>

        <TouchableOpacity onPress={() => setIsLoginMode(!isLoginMode)} style={{ marginTop: 32 }}>
          <Text style={{ textAlign: 'center', fontSize: 14, color: colors.textSecondary }}>
            {isLoginMode ? "Don't have an account? " : 'Already have an account? '}
            <Text style={{ fontWeight: '700', color: colors.accent }}>
              {isLoginMode ? 'Sign up' : 'Log in'}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenLayout>
  );
}
