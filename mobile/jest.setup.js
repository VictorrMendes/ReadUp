// Reanimated 4 / Worklets / Gesture Handler não rodam no Node: usam os mocks oficiais (animações
// viram instantâneas). O mock do Reanimated não traz useReducedMotion nem cubicBezier (API de
// transições CSS): completamos.
jest.mock("react-native-worklets", () => require("react-native-worklets/src/mock"));
jest.mock("react-native-reanimated", () => {
  const mock = require("react-native-reanimated/mock");
  return {
    ...mock,
    useReducedMotion: () => false,
    cubicBezier: (x1, y1, x2, y2) => `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`,
  };
});
require("react-native-gesture-handler/jestSetup");
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  performAndroidHapticsAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
  AndroidHaptics: { Confirm: "confirm", Long_Press: "long-press", Segment_Tick: "segment-tick" },
}));
