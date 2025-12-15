import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, Alert, ActivityIndicator, View, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { getSavedUserId } from '../../services/auth/userInfo';
import { userClient } from '../../services/auth/gRPC/user/connectClient'; 
import { Empty, SpotifyCallbackRequest, UserRequest } from '../../services/auth/gRPC/user/users_pb'; 
import SpotifyIcon from '../../assets/Provider/spotify_logo_colour.svg';

WebBrowser.maybeCompleteAuthSession();

export const SpotifyConnectButton = () => {
    const [loading, setLoading] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(true);
    const [isConnected, setIsConnected] = useState(false);

    const CURRENT_REDIRECT_URI = makeRedirectUri({
        path: 'oauth2redirect/spotify',
        scheme: 'swipevibes'
    });

    useEffect(() => {
        checkSpotifyStatus();
    }, []);

    const checkSpotifyStatus = async () => {
        const userId = getSavedUserId();
        if (!userId) {
            setCheckingStatus(false);
            return;
        }
        try {
            const request = new UserRequest({ id: userId });
            const response = await userClient.getUser(request, {});
            if (response.isSpotifyConnected) setIsConnected(true);
        } catch (error) {
            console.log("Status check failed", error);
        } finally {
            setCheckingStatus(false);
        }
    };

    const handleConnect = async () => {
        const userId = getSavedUserId();
        if (!userId) return;

        setLoading(true);
        console.log("Using Redirect URI:", CURRENT_REDIRECT_URI);

        try {
            const authResponse = await userClient.getSpotifyAuthUrl(new Empty(), {});
            let authUrl = authResponse.url;

            try {
                const urlObj = new URL(authUrl);
                urlObj.searchParams.set("redirect_uri", CURRENT_REDIRECT_URI);
                authUrl = urlObj.toString();
            } catch (e) {
                console.error("URL parse error", e);
            }

            const result = await WebBrowser.openAuthSessionAsync(authUrl, CURRENT_REDIRECT_URI);

            if (result.type === 'success' && result.url) {
                const urlObj = new URL(result.url);
                const code = urlObj.searchParams.get("code");

                if (code) {
                    const request = new SpotifyCallbackRequest();
                    request.code = code;
                    request.userId = userId;
                    request.redirectUri = CURRENT_REDIRECT_URI; 

                    const callbackResponse = await userClient.handleSpotifyCallback(request, {});

                    if (callbackResponse.success) {
                        Alert.alert("Success", "Connected to Spotify!");
                        setIsConnected(true);
                    } else {
                        Alert.alert("Error", callbackResponse.message);
                    }
                }
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Connection failed.");
        } finally {
            setLoading(false);
        }
    };

    if (checkingStatus) return <ActivityIndicator color="#1DB954" />;

    if (isConnected) {
        return (
            <TouchableOpacity className="bg-[#1DB954] px-4 py-3 rounded-full opacity-90" disabled>
                <Text className="text-white font-bold">Spotify Connected</Text>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity onPress={handleConnect} disabled={loading} className="h-20 w-20 items-center justify-center rounded-full bg-white/30 backdrop-blur-md">
            {loading ? <ActivityIndicator color="white" /> : <SpotifyIcon width={40} height={40} />}
        </TouchableOpacity>
    );
};