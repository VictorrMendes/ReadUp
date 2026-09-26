import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";

import { colors } from "@/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

const TABS: { name: string; title: string; icon: IconName; iconOutline: IconName }[] = [
  { name: "index", title: "Início", icon: "home", iconOutline: "home-outline" },
  { name: "explore", title: "Explorar", icon: "compass", iconOutline: "compass-outline" },
  { name: "library", title: "Biblioteca", icon: "library", iconOutline: "library-outline" },
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
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? tab.icon : tab.iconOutline} color={color} size={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
