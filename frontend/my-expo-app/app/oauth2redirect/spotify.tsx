import { useEffect, useState } from 'react';
import { View, Text, Platform } from 'react-native';

export default function SpotifyRedirect() {
  const [status, setStatus] = useState("Inicjalizacja...");

  useEffect(() => {
    if (Platform.OS === 'web') {
      const url = window.location.href;
      
      // Sprawdzamy czy okno, które nas otworzyło, nadal istnieje
      if (window.opener) {
        setStatus("Wysyłanie tokena do aplikacji...");
        
        // "Ręczne" wysłanie wiadomości w formacie, którego oczekuje Expo Auth Session
        // TargetOrigin '*' pozwala ominąć niektóre restrykcje, ale COOP może to nadal blokować
        window.opener.postMessage({ type: "org.expo.auth_session", url }, "*");
        
        setTimeout(() => {
            window.close();
        }, 1000); // Dajemy sekundę na dojście wiadomości
      } else {
        setStatus("BŁĄD: Utracono połączenie z głównym oknem. (Zabezpieczenie COOP)");
        console.error("Window.opener is null. This is likely a Cross-Origin-Opener-Policy issue.");
      }
    }
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white', padding: 20 }}>
      <Text style={{ marginBottom: 10, fontWeight: 'bold' }}>Stan logowania:</Text>
      <Text>{status}</Text>
    </View>
  );
}