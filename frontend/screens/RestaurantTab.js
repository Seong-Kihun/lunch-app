import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import RestaurantMap from '../components/RestaurantMap';
import RestaurantDetail from './RestaurantDetail';
import WriteReview from './WriteReview';
import PhotoGallery from './PhotoGallery';
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();
const RestaurantTab = ({ route }) => {
  const currentColors = global.currentColors || {
    background: '#F1F5F9',
  };
  
  return (
    <Stack.Navigator 
      screenOptions={{
        headerStyle: { backgroundColor: '#3B82F6' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' }
      }}
      initialRouteName="RestaurantMap"
    >
      <Stack.Screen 
        name="RestaurantMap"
        options={{ headerShown: false }}
      >
        {props => (
          <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}> 
            <RestaurantMap {...props} currentColors={currentColors} />
          </SafeAreaView>
        )}
      </Stack.Screen>
      <Stack.Screen 
        name="RestaurantDetail" 
        component={RestaurantDetail}
        options={{ title: '맛집 상세정보' }}
      />
      <Stack.Screen 
        name="WriteReview" 
        component={WriteReview} 
        options={{ title: '리뷰 작성' }}
      />
      <Stack.Screen 
        name="PhotoGallery" 
        component={PhotoGallery} 
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default RestaurantTab; 