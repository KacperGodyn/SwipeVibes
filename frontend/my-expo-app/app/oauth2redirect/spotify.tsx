import { useEffect, useState } from 'react';
import { View, Text, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

export default function SpotifyRedirect() {
  const [status, setStatus] = useState("Finalizowanie...");

  useEffect(() => {
    if (Platform.OS === 'web') {
      try {
        WebBrowser.maybeCompleteAuthSession({ skipRedirectCheck: true });
      } catch (e) {}

      const currentUrl = window.location.href;
      if (currentUrl.includes('code=')) {
        setStatus("Redirecting...");
        localStorage.setItem('spotify-auth-signal', JSON.stringify({
            url: currentUrl,
            timestamp: Date.now()
        }));
        
        setTimeout(() => {
            window.close();
            setStatus("You can close this tab.");
        }, 1500);
      }
    }
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white', padding: 20 }}>
      <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>{status}</Text>
      <Text style={{ textAlign: 'center', color: '#666' }}>
        If this page does not close automatically, please close it manually.
      </Text>
    </View>
  );
}