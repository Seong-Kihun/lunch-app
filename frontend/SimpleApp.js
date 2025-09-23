import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 간단한 색상 정의
const COLORS = {
  light: {
    primary: '#3B82F6',
    background: '#F1F5F9',
    surface: '#FFFFFF',
    text: '#1E293B',
    textSecondary: '#64748B',
    gray: '#64748B',
    lightGray: '#E2E8F0',
  },
  dark: {
    primary: '#60A5FA',
    background: '#0F172A',
    surface: '#1E293B',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    gray: '#94A3B8',
    lightGray: '#334155',
  }
};

const Tab = createBottomTabNavigator();

// 간단한 홈 화면
function HomeScreen() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>점심 앱</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.timeCard}>
          <Text style={styles.timeText}>
            {currentTime.toLocaleTimeString('ko-KR', { 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit' 
            })}
          </Text>
          <Text style={styles.dateText}>
            {currentTime.toLocaleDateString('ko-KR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              weekday: 'long'
            })}
          </Text>
        </View>
        
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>맛집 찾기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>파티 만들기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// 간단한 맛집 화면
function RestaurantScreen() {
  const [restaurants, setRestaurants] = useState([
    { id: 1, name: '맛있는 한식당', rating: 4.5, category: '한식', distance: '0.2km' },
    { id: 2, name: '신선한 중식당', rating: 4.3, category: '중식', distance: '0.5km' },
    { id: 3, name: '고급 일식당', rating: 4.7, category: '일식', distance: '0.8km' },
    { id: 4, name: '분식집', rating: 4.1, category: '분식', distance: '0.1km' },
  ]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>맛집</Text>
      </View>
      <View style={styles.content}>
        {restaurants.map((restaurant) => (
          <View key={restaurant.id} style={styles.restaurantCard}>
            <Text style={styles.restaurantName}>{restaurant.name}</Text>
            <View style={styles.restaurantInfo}>
              <Text style={styles.restaurantRating}>⭐ {restaurant.rating}</Text>
              <Text style={styles.restaurantCategory}>{restaurant.category}</Text>
              <Text style={styles.restaurantDistance}>{restaurant.distance}</Text>
            </View>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

// 간단한 파티 화면
function PartyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>파티</Text>
        <Text style={styles.subtitle}>파티 기능이 로드되었습니다.</Text>
      </View>
    </SafeAreaView>
  );
}

// 간단한 소통 화면
function CommunicationScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>소통</Text>
        <Text style={styles.subtitle}>소통 기능이 로드되었습니다.</Text>
      </View>
    </SafeAreaView>
  );
}

// 간단한 친구 화면
function FriendScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>친구</Text>
        <Text style={styles.subtitle}>친구 기능이 로드되었습니다.</Text>
      </View>
    </SafeAreaView>
  );
}

export default function SimpleApp() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const colors = isDarkMode ? COLORS.dark : COLORS.light;

  // 전역 변수 사용 제거 - Context 기반으로 변경

  return (
    <NavigationContainer>
      <Tab.Navigator 
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            const icons = { 
              '홈': 'home', 
              '맛집': 'restaurant', 
              '파티': 'people', 
              '소통': 'chatbubbles', 
              '친구': 'people-circle' 
            };
            const iconName = focused ? icons[route.name] : `${icons[route.name]}-outline`;
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.gray,
          headerShown: false,
          tabBarStyle: { 
            backgroundColor: colors.surface, 
            borderTopColor: colors.lightGray,
            height: 85,
            paddingBottom: 18,
            paddingTop: 10,
          },
          tabBarLabelStyle: { fontWeight: '600', fontSize: 12, marginTop: 2 },
          tabBarIconStyle: { marginBottom: 4 }
        })}
      >
        <Tab.Screen name="홈" component={HomeScreen} />
        <Tab.Screen name="맛집" component={RestaurantScreen} />
        <Tab.Screen name="파티" component={PartyScreen} />
        <Tab.Screen name="소통" component={CommunicationScreen} />
        <Tab.Screen name="친구" component={FriendScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  header: {
    backgroundColor: '#3B82F6',
    paddingTop: 50,
    paddingBottom: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  timeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timeText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  dateText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 5,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  actionButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 25,
    alignItems: 'center',
    width: '45%',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  restaurantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 5,
  },
  restaurantInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  restaurantRating: {
    fontSize: 14,
    color: '#FFD700', // Gold color for rating
  },
  restaurantCategory: {
    fontSize: 14,
    color: '#64748B',
    marginHorizontal: 10,
  },
  restaurantDistance: {
    fontSize: 14,
    color: '#64748B',
  },
}); 