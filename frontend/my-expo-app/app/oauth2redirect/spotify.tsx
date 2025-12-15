import { useEffect, useState } from 'react';
import { View, Text, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

export default function SpotifyRedirect() {
  const [status, setStatus] = useState("Finalizing...");

  try {
    if (Platform.OS === 'web') {
        WebBrowser.maybeCompleteAuthSession();
    }
  } catch (e) {
      console.error("Auth session error", e);
  }

  useEffect(() => {
    if (Platform.OS === 'web') {
      const currentUrl = window.location.href;
      
      if (currentUrl.includes('code=')) {
        setStatus("Redirecting...");
        
        localStorage.setItem('spotify-auth-signal', JSON.stringify({
            url: currentUrl,
            timestamp: Date.now()
        }));
        
        setTimeout(() => {
             window.close(); 
             setStatus("You can close this window now.");
        }, 1500);
      }
    }
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212', padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#1DB954' }}>Spotify Connected</Text>
      <Text style={{ fontSize: 16, textAlign: 'center', color: '#fff', marginBottom: 10 }}>{status}</Text>
      <Text style={{ textAlign: 'center', color: '#888', fontSize: 12 }}>
        If this window does not close automatically, please close it manually.
      </Text>
    </View>
  );
}