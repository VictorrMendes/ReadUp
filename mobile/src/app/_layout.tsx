// imports por peso: o índice do pacote empacotaria as 18 variações da Inter (~6 MB)
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { Literata_400Regular } from "@expo-google-fonts/literata/400Regular";
import { Literata_600SemiBold } from "@expo-google-fonts/literata/600SemiBold";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useReduceMotion } from "@/lib/use-reduce-motion";
import { colors, spacing } from "@/theme";

void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { token, user, userError, isLoading, refreshUser } = useAuth();
  const reduceMotion = useReduceMotion();
  const authAnimation = reduceMotion ? "none" : "fade";
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Literata_400Regular,
    Literata_600SemiBold,
  });
  // se a fonte falhar, segue com a fonte do sistema em vez de travar no splash
  const ready = !isLoading && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  // splash continua visível até token, usuário e fontes carregarem (evita piscar a tela de login)
  if (!ready) return null;

  if (token && !user && userError) {
    return (
      <View style={styles.center}>
        <AppText color="errorText" style={styles.centerText}>
          {userError}
        </AppText>
        <Button title="Tentar novamente" onPress={refreshUser} />
      </View>
    );
  }

  // nível ou meta ainda não escolhidos: só o onboarding
  const onboarded = !!user && !!user.english_level && user.daily_goal !== null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!user && onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="article/[id]" />
        <Stack.Screen name="book/[id]" />
        <Stack.Screen name="review" />
      </Stack.Protected>
      <Stack.Protected guard={!!user && !onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      {/* login ↔ cadastro: fade nativo (a arte é a mesma, só o cartão parece trocar) */}
      <Stack.Protected guard={!token}>
        <Stack.Screen name="login" options={{ animation: authAnimation }} />
        <Stack.Screen name="register" options={{ animation: authAnimation }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  centerText: { textAlign: "center" },
});
