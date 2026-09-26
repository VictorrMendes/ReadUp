import { Link } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { TextInput } from "@/components/text-input";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, spacing } from "@/theme";

// Tela única para login e cadastro: os dois fluxos só diferem no campo nome e na ação.
export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { signIn, signUp } = useAuth();
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if ((isRegister && !name.trim()) || !email.trim() || !password) {
      setError("Preencha todos os campos.");
      return;
    }
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      if (isRegister) await signUp(name.trim(), email.trim(), password);
      else await signIn(email.trim(), password);
      // sucesso: o guard do _layout troca para as abas
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Não foi possível conectar. Tente novamente.");
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <AppText variant="h1">{isRegister ? "Criar conta" : "Entrar"}</AppText>
          <AppText color="textSecondary" style={styles.subtitle}>
            {isRegister ? "Comece seu hábito diário de leitura." : "Continue sua leitura em inglês."}
          </AppText>

          {isRegister && (
            <TextInput
              label="Nome"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              maxLength={100}
            />
          )}
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
          />
          <TextInput
            label="Senha"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={isRegister ? "new-password" : "current-password"}
            textContentType={isRegister ? "newPassword" : "password"}
            maxLength={128}
            onSubmitEditing={submit}
          />

          {error && (
            <AppText variant="small" color="error" accessibilityLiveRegion="polite">
              {error}
            </AppText>
          )}

          <Button
            title={isRegister ? "Criar conta" : "Entrar"}
            onPress={submit}
            loading={submitting}
            style={styles.submit}
          />

          <Link href={isRegister ? "/login" : "/register"} replace asChild>
            <Button
              variant="ghost"
              accessibilityRole="link"
              title={isRegister ? "Já tem conta? Entrar" : "Não tem conta? Criar conta"}
            />
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  subtitle: { marginBottom: spacing.md },
  submit: { marginTop: spacing.sm },
});
