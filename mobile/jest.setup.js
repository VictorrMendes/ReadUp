// Reanimated 4 / Worklets / Gesture Handler não têm módulo nativo no Jest: usa os mocks oficiais
jest.mock("react-native-worklets", () => require("react-native-worklets/src/mock"));
jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));
require("react-native-gesture-handler/jestSetup");
