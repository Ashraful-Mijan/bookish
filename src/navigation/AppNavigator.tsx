import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ReadingNowScreen } from '../screens/ReadingNowScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { BookDetailsScreen } from '../screens/BookDetailsScreen';
import { ReaderScreen } from '../screens/ReaderScreen';
import { BookmarksScreen } from '../screens/BookmarksScreen';
import { AppColors } from '../theme';
import { useSettings } from '../store/settingsStore';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: AppColors.tabIconActive,
        tabBarInactiveTintColor: AppColors.tabIcon,
        tabBarStyle: {
          backgroundColor: AppColors.tabBarBg,
          borderTopColor: AppColors.separator,
        },
      }}>
      <Tab.Screen name="ReadingNow" component={ReadingNowScreen} options={{ title: 'Reading Now' }} />
      <Tab.Screen name="Library" component={LibraryScreen} options={{ title: 'Library' }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ title: 'Search' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const loadSettings = useSettings((s) => s.load);
  React.useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="BookDetails"
          component={BookDetailsScreen}
          options={{ title: 'Details' }}
        />
        <Stack.Screen name="Bookmarks" component={BookmarksScreen} options={{ title: 'Bookmarks' }} />
        <Stack.Screen
          name="Reader"
          component={ReaderScreen}
          options={{ headerShown: false, presentation: 'fullScreenModal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
