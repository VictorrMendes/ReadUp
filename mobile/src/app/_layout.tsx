import { Stack } from "expo-router";

import { AuthProvider, useAuth } from "@/lib/auth";

function RootNavigator() {
  const { token, isLoading } = useAuth();

  // não renderiza rotas até ler o token (evita piscar a tela de login)
  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!token}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!token}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
