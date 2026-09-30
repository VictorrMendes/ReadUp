import { Link } from "expo-router";
import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { IconButton } from "@/components/icon-button";
import { TextInput } from "@/components/text-input";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, radius, spacing } from "@/theme";

// Tela única para login e cadastro: os dois fluxos só diferem no campo nome e na ação.
export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { signIn, signUp } = useAuth();
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
            accessibilityIgnoresInvertColors
            accessibilityLabel="ReadUp"
          />
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
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={isRegister ? "new-password" : "current-password"}
            textContentType={isRegister ? "newPassword" : "password"}
            maxLength={128}
            onSubmitEditing={submit}
            accessory={
              <IconButton
                icon={showPassword ? "eye-off-outline" : "eye-outline"}
                color="textSecondary"
                accessibilityLabel={showPassword ? "Ocultar senha" : "Mostrar senha"}
                onPress={() => setShowPassword((v) => !v)}
              />
            }
          />

          {error && (
            <AppText variant="small" color="errorText" accessibilityLiveRegion="polite">
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
  // alinhado ao topo: centralizado, o bloco "pula" quando o teclado abre
  container: { flexGrow: 1, padding: spacing.xl, paddingTop: spacing.xxxl, gap: spacing.md },
  logo: { width: 72, height: 72, borderRadius: radius.lg, marginBottom: spacing.xl },
  subtitle: { marginBottom: spacing.md },
  submit: { marginTop: spacing.sm },
});
