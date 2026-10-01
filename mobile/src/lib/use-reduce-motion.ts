import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * "Reduzir movimento" do sistema. null enquanto não se sabe: quem anima espera o valor para não
 * começar uma animação que teria de ser cortada. Acompanha a troca com o app aberto.
 */
export function useReduceMotion(): boolean | null {
  const [reduce, setReduce] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((enabled) => {
        if (active) setReduce(enabled);
      });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) =>
      setReduce(enabled),
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduce;
}
