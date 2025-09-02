import { Text, View } from "react-native";
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from "./Navigation/RootNavigator";
import '@expo/metro-runtime';
import "./global.css"
 
export default function App() {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}