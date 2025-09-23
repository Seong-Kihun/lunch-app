import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';

// 화면 컴포넌트
import RestaurantHome from './RestaurantHome';
import RestaurantMap from './RestaurantMap';
import RestaurantDetail from '../RestaurantDetail';

const Stack = createStackNavigator();

const RestaurantTabNew = ({ route }) => {
  const currentColors = global.currentColors || {
    background: '#F1F5F9',
    primary: '#3B82F6',
    surface: '#FFFFFF',
    text: '#1E293B',
  };
  
  return (
    <Stack.Navigator 
      screenOptions={{
        headerStyle: { 
          backgroundColor: currentColors.primary,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#fff',
        headerTitleStyle: { 
          fontWeight: 'bold',
          fontSize: 18,
        },
        headerBackTitleVisible: false,
      }}
      initialRouteName="RestaurantHome"
    >
      <Stack.Screen 
        name="RestaurantHome"
        component={RestaurantHome}
        options={{ 
          headerShown: true,
          title: '맛집'
        }}
      />
      
      <Stack.Screen 
        name="RestaurantMap"
        component={RestaurantMap}
        options={{ 
          headerShown: true,
          title: '맛집 지도'
        }}
      />
      
      <Stack.Screen 
        name="RestaurantDetail"
        component={RestaurantDetail}
        options={{ 
          title: '맛집',
          headerShown: true
        }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default RestaurantTabNew;
