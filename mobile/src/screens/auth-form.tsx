import { Link } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, fontSize, radius, spacing, touchTarget } from "@/theme";

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
          <Text style={styles.title}>{isRegister ? "Criar conta" : "Entrar"}</Text>
          <Text style={styles.subtitle}>
            {isRegister ? "Comece seu hábito diário de leitura." : "Continue sua leitura em inglês."}
          </Text>

          {isRegister && (
            <TextInput
              style={styles.input}
              placeholder="Nome"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              maxLength={100}
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
          />
          <TextInput
            style={styles.input}
            placeholder="Senha (mínimo 8 caracteres)"
            placeholderTextColor={colors.textSecondary}
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

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              submitting && styles.buttonDisabled,
            ]}
            onPress={submit}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityState={{ disabled: submitting, busy: submitting }}
          >
            {submitting ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.buttonText}>{isRegister ? "Criar conta" : "Entrar"}</Text>
            )}
          </Pressable>

          <Link href={isRegister ? "/login" : "/register"} replace asChild>
            <Pressable style={styles.link} accessibilityRole="link">
              <Text style={styles.linkText}>
                {isRegister ? "Já tem conta? Entrar" : "Não tem conta? Criar conta"}
              </Text>
            </Pressable>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  title: { fontSize: fontSize.h1, fontWeight: "700", color: colors.textPrimary },
  subtitle: { fontSize: fontSize.body, color: colors.textSecondary, marginBottom: spacing.md },
  input: {
    minHeight: touchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  error: { fontSize: fontSize.small, color: colors.error },
  button: {
    minHeight: touchTarget,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary500,
  },
  buttonPressed: { backgroundColor: colors.primary600 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontSize: fontSize.body, fontWeight: "600", color: colors.surface },
  link: { minHeight: touchTarget, alignItems: "center", justifyContent: "center" },
  linkText: { fontSize: fontSize.body, color: colors.primary500, fontWeight: "600" },
});
