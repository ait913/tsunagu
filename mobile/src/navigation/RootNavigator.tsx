import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAppStore } from "@/stores/appStore";
import { colors } from "@/theme/colors";
import type { RootStackParamList } from "@/navigation/types";
import WelcomeScreen from "@/screens/onboarding/WelcomeScreen";
import AgreeScreen from "@/screens/onboarding/AgreeScreen";
import RoleSelectScreen from "@/screens/onboarding/RoleSelectScreen";
import PermissionScreen from "@/screens/permission/PermissionScreen";
import HomeScreen from "@/screens/home/HomeScreen";
import TierRegistrationScreen from "@/screens/profile/TierRegistrationScreen";
import ProfileScreen from "@/screens/profile/ProfileScreen";
import CountdownScreen from "@/screens/sos/CountdownScreen";
import SymptomScreen from "@/screens/sos/SymptomScreen";
import RescueModeFinderScreen from "@/screens/rescue/RescueModeFinderScreen";
import RescueModeResponderScreen from "@/screens/rescue/RescueModeResponderScreen";
import AedGuideScreen from "@/screens/rescue/AedGuideScreen";
import HandoffScreen from "@/screens/rescue/HandoffScreen";
import EndScreen from "@/screens/rescue/EndScreen";
import NotificationResponderScreen from "@/screens/responder/NotificationResponderScreen";
import NavResponderScreen from "@/screens/responder/NavResponderScreen";
import AbandonScreen from "@/screens/responder/AbandonScreen";
import NotificationAedScreen from "@/screens/aedCarrier/NotificationAedScreen";
import NavAedScreen from "@/screens/aedCarrier/NavAedScreen";
import AedPickScreen from "@/screens/aedCarrier/AedPickScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator(): JSX.Element {
  const hasOnboarded = useAppStore((state) => state.hasOnboarded);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={hasOnboarded ? "Home" : "Welcome"}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bgBlack },
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Agree" component={AgreeScreen} />
        <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
        <Stack.Screen name="Permission" component={PermissionScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="TierRegistration"
          component={TierRegistrationScreen}
        />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Countdown" component={CountdownScreen} />
        <Stack.Screen name="Symptom" component={SymptomScreen} />
        <Stack.Screen
          name="RescueModeFinder"
          component={RescueModeFinderScreen}
        />
        <Stack.Screen
          name="RescueModeResponder"
          component={RescueModeResponderScreen}
        />
        <Stack.Screen name="AedGuide" component={AedGuideScreen} />
        <Stack.Screen name="Handoff" component={HandoffScreen} />
        <Stack.Screen name="End" component={EndScreen} />
        <Stack.Screen
          name="NotificationResponder"
          component={NotificationResponderScreen}
        />
        <Stack.Screen name="NavResponder" component={NavResponderScreen} />
        <Stack.Screen name="Abandon" component={AbandonScreen} />
        <Stack.Screen
          name="NotificationAed"
          component={NotificationAedScreen}
        />
        <Stack.Screen name="NavAed" component={NavAedScreen} />
        <Stack.Screen name="AedPick" component={AedPickScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
