import { Link } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { IconButton } from "@/components/icon-button";
import { TextInput } from "@/components/text-input";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useReduceMotion } from "@/lib/use-reduce-motion";
import { colors, fontFamily, motion, radius, spacing, touchTarget } from "@/theme";

// arte do topo: 390×400 (escala pela largura); a marca ocupa a zona livre à esquerda
const ART_RATIO = 400 / 390;

// Tela única para login e cadastro (design-v3 seção 4): a mesma arte, só a altura do topo muda.
// Sem login social, "esqueci a senha" ou "lembrar de mim" (decisão do usuário).
export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { signIn, signUp } = useAuth();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [art] = useState(() => new Animated.Value(0));
  const [card] = useState(() => new Animated.Value(0));

  // entrada: a arte aparece e o formulário sobe (sem animação com "reduzir movimento")
  useEffect(() => {
    if (reduceMotion === null) return;
    if (reduceMotion) {
      art.setValue(1);
      card.setValue(1);
      return;
    }
    const entrance = Animated.parallel([
      Animated.timing(art, {
        toValue: 1,
        duration: motion.base,
        easing: motion.easing,
        useNativeDriver: true,
      }),
      Animated.timing(card, {
        toValue: 1,
        duration: motion.slow,
        delay: 60,
        easing: motion.easing,
        useNativeDriver: true,
      }),
    ]);
    entrance.start();
    return () => entrance.stop();
  }, [art, card, reduceMotion]);

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
    <View style={styles.screen}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <Animated.Image
            source={require("@/assets/images/auth-hero.png")}
            style={[styles.art, { width, height: width * ART_RATIO, opacity: art }]}
            resizeMode="cover"
            accessible={false}
            accessibilityIgnoresInvertColors
          />
          {/* fonte 200%: o bloco cresce para cima e empurra o cartão; o fundo primary600 cobre */}
          <View
            style={[
              styles.brand,
              {
                minHeight: height * (isRegister ? 0.26 : 0.38),
                paddingTop: insets.top + spacing.xl,
              },
            ]}
          >
            <AppText variant="display" color="surface" accessibilityRole="header">
              ReadUp
            </AppText>
            <AppText color="surface">Inglês, uma leitura por dia</AppText>
          </View>

          <Animated.View
            style={[
              styles.card,
              { paddingBottom: insets.bottom + spacing.xl },
              {
                opacity: card,
                transform: [
                  { translateY: card.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
                ],
              },
            ]}
          >
            <View style={styles.titleBlock}>
              <AppText variant="h2" color="primary600">
                {isRegister ? "Criar conta" : "Bem-vindo de volta"}
              </AppText>
              <AppText color="textSecondary">
                {isRegister
                  ? "Comece seu hábito diário de leitura."
                  : "Continue sua leitura em inglês."}
              </AppText>
            </View>

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

            <View style={styles.footer}>
              <Link href={isRegister ? "/login" : "/register"} replace asChild>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={isRegister ? "Já tem conta? Entrar" : "Não tem conta? Criar conta"}
                  style={styles.link}
                >
                  <AppText color="textSecondary">
                    {isRegister ? "Já tem conta? " : "Não tem conta? "}
                    <AppText color="primary600" style={styles.semibold}>
                      {isRegister ? "Entrar" : "Criar conta"}
                    </AppText>
                  </AppText>
                </Pressable>
              </Link>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.primary600 },
  scroll: { flexGrow: 1 },
  art: { position: "absolute", top: 0, left: 0 },
  brand: {
    justifyContent: "flex-end",
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
    maxWidth: "64%", // zona livre da arte
    gap: spacing.xs,
  },
  card: {
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    gap: spacing.lg,
  },
  titleBlock: { gap: spacing.xs, marginBottom: spacing.sm },
  submit: { minHeight: 52, marginTop: spacing.sm },
  footer: { marginTop: "auto" },
  link: { minHeight: touchTarget, alignItems: "center", justifyContent: "center" },
  semibold: { fontFamily: fontFamily.semibold },
});
