import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { haptic } from "@/lib/haptics";
import { colors, compactFontScale, fontFamily, motion } from "@/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

const TABS: { name: string; title: string; icon: IconName; iconOutline: IconName }[] = [
  { name: "index", title: "Início", icon: "home", iconOutline: "home-outline" },
  // textos e livros juntos (design-ajust): app/(tabs)/read.tsx
  { name: "read", title: "Ler", icon: "book", iconOutline: "book-outline" },
  { name: "vocabulary", title: "Vocabulário", icon: "language", iconOutline: "language-outline" },
  { name: "profile", title: "Perfil", icon: "person", iconOutline: "person-outline" },
];

// Ícone da aba dá um salto curto quando ela passa a ser a ativa (não ao abrir o app).
function BouncyIcon({ focused, children }: { focused: boolean; children: ReactNode }) {
  const scale = useSharedValue(1);
  const wasFocused = useRef(focused);
  useEffect(() => {
    if (focused && !wasFocused.current) {
      scale.set(
        withSequence(withTiming(1.18, { duration: 110 }), withSpring(1, motion.release)),
      );
    }
    wasFocused.current = focused;
  }, [focused, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenListeners={{ tabPress: haptic.select }}
      screenOptions={{
        tabBarActiveTintColor: colors.primary500,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        headerStyle: {
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerShadowVisible: false,
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontFamily: fontFamily.semibold, fontSize: 18 },
        // rótulo próprio: Inter + limite de escala da fonte (quebrava em 200%)
        tabBarLabel: ({ color, children }) => (
          <Text
            maxFontSizeMultiplier={compactFontScale}
            style={{ color, fontFamily: fontFamily.semibold, fontSize: 12 }}
          >
            {children}
          </Text>
        ),
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            // Início tem o título grande dentro da própria tela
            headerShown: tab.name !== "index",
            tabBarIcon: ({ color, size, focused }) => (
              <BouncyIcon focused={focused}>
                <Ionicons name={focused ? tab.icon : tab.iconOutline} color={color} size={size} />
              </BouncyIcon>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
