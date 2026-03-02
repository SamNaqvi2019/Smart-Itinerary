import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppProvider } from '../src/context/AppContext';
import SplashScreen from '../screens/splash';
import LoginScreen from '../screens/login';
import SignupScreen from '../screens/signup';
import DashboardScreen from '../screens/dashboard';
import GenerateItineraryScreen from '../screens/generate-itinerary';
import SavedItinerariesScreen from '../screens/saved-itineraries';
import ItineraryDetailScreen from '../screens/itinerary-detail';
import FareCalculatorScreen from '../screens/fare-calculator';
import FeedbackScreen from '../screens/feedback';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <AppProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Splash"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="GenerateItinerary" component={GenerateItineraryScreen} />
          <Stack.Screen name="SavedItineraries" component={SavedItinerariesScreen} />
          <Stack.Screen name="ItineraryDetail" component={ItineraryDetailScreen} />
          <Stack.Screen name="FareCalculator" component={FareCalculatorScreen} />
          <Stack.Screen name="Feedback" component={FeedbackScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </AppProvider>
  );
}
