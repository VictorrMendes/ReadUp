import {
  Easing,
  FadeInDown,
  FadeOut,
  LinearTransition,
  ReduceMotion,
  type WithSpringConfig,
} from "react-native-reanimated";

// Linguagem de movimento do app (docs: pesquisa-motion-mobile.md, tabela 1.5). Tudo em
// transform/opacity, curto e com "reduzir movimento" do sistema respeitado (ReduceMotion.System:
// a animação vira instantânea, o significado continua).

export const durations = {
  press: 100, // encolher ao tocar
  select: 160, // chip, check, destaque de palavra
  enter: 280, // conteúdo entrando na tela
  progress: 600, // barra/anel enchendo
  count: 900, // número subindo (XP, palavras)
  celebrate: 1500, // confete, robô comemorando
} as const;

export const easings = {
  // entrar desacelerando (Material "emphasized decelerate")
  enter: Easing.bezier(0.05, 0.7, 0.1, 1),
  // sair acelerando
  exit: Easing.bezier(0.3, 0, 0.8, 0.15),
  // mudança de estado que fica na tela
  standard: Easing.bezier(0.2, 0, 0, 1),
};

export const springs = {
  // volta do toque: rápida, quase sem sobra
  press: { damping: 18, stiffness: 320, mass: 0.6, reduceMotion: ReduceMotion.System },
  // "pop" de recompensa (ícone salvo, chama): um pouco de sobra
  pop: { damping: 9, stiffness: 260, mass: 0.7, reduceMotion: ReduceMotion.System },
  // painel subindo
  sheet: { damping: 20, stiffness: 220, reduceMotion: ReduceMotion.System },
} satisfies Record<string, WithSpringConfig>;

// passo da entrada em cascata e teto (listas longas não esperam o 20º item)
const STAGGER_MS = 45;
const STAGGER_MAX = 6;

/** Entrada em cascata para cards e itens de lista: sobe 12 px e aparece. */
export function enterFrom(index = 0) {
  return FadeInDown.duration(durations.enter)
    .delay(Math.min(index, STAGGER_MAX) * STAGGER_MS)
    .easing(easings.enter)
    .withInitialValues({ transform: [{ translateY: 12 }] })
    .reduceMotion(ReduceMotion.System);
}

/**
 * Entrada de item de lista: só a primeira tela entra em cascata; o que aparece rolando depois
 * já chega pronto (nada de esperar animação a cada rolagem).
 */
export function listEnter(index: number) {
  return index <= STAGGER_MAX + 2 ? enterFrom(index) : undefined;
}

/** Item removido some rápido e os vizinhos fecham o buraco deslizando. */
export const listExit = FadeOut.duration(durations.select).reduceMotion(ReduceMotion.System);
export const listLayout = LinearTransition.duration(durations.enter)
  .easing(easings.standard)
  .reduceMotion(ReduceMotion.System);
