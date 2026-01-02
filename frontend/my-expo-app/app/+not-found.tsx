import { Stack, useRouter } from 'expo-router';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useTheme } from '../services/theme/ThemeContext';
import ScreenLayout from '../components/ScreenLayout';

export default function NotFoundScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <ScreenLayout showVolumeControl={false}>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={[styles.errorCode, { color: colors.accent }]}>404</Text>
        <Text style={[styles.title, { color: colors.text }]}>Page Not Found</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          The vibe you are looking for doesn't exist here.
        </Text>

        <Pressable
          onPress={() => router.replace('/home')}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 },
          ]}>
          <Text style={styles.buttonText}>Go to Home</Text>
        </Pressable>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: -80,
  },
  errorCode: {
    fontSize: 80,
    fontWeight: '900',
    marginBottom: 0,
    opacity: 0.8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 300,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 999,
    shadowColor: '#F05454',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
