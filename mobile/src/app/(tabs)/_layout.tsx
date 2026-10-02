import type Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Text } from "react-native";

import { TabIcon } from "@/components/tab-icon";
import { colors, compactFontScale, fontFamily } from "@/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

const TABS: { name: string; title: string; icon: IconName; iconOutline: IconName }[] = [
  { name: "index", title: "Início", icon: "home", iconOutline: "home-outline" },
  { name: "read", title: "Ler", icon: "book", iconOutline: "book-outline" },
  { name: "vocabulary", title: "Vocabulário", icon: "language", iconOutline: "language-outline" },
  { name: "profile", title: "Perfil", icon: "person", iconOutline: "person-outline" },
];

export default function TabsLayout() {
  return (
    <Tabs
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
              <TabIcon
                name={focused ? tab.icon : tab.iconOutline}
                color={color}
                size={size}
                focused={focused}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
