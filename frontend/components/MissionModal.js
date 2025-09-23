import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Pressable,
  Alert,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePoints } from '../contexts/PointsContext';
import { useMission } from '../contexts/MissionContext';
import MissionCelebration from './MissionCelebration';
import AchievementDisplay from './AchievementDisplay';

const { width, height } = Dimensions.get('window');

// 디버깅: 화면 크기 확인 (개발 시에만 활성화)
// console.log('🔍 MissionModal - Screen dimensions:', { width, height, modalHeight: height * 0.9, missionListHeight: height * 0.6 });

const MissionModal = ({ visible, onClose, navigation, onMissionUpdate }) => {
  const [activeTab, setActiveTab] = useState('daily');
  const [missionStates, setMissionStates] = useState({});
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [celebrationData, setCelebrationData] = useState({ title: '', points: 0 });

  // missions를 상태로 관리 (초기값)
  const [missions, setMissions] = useState({
    daily: [
      { 
        id: 1, 
        title: '오늘의 첫 방문', 
        description: '오늘 앱에 처음 접속하기', 
        points: 10, 
        completed: true,
        claimed: false,
        progress: 1,
        total: 1,
        autoComplete: true,
        actionType: 'claim',
        targetScreen: null
      },
      { 
        id: 2, 
        title: '랜덤런치 참여', 
        description: '랜덤런치를 제안하거나 수락하기', 
        points: 30, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 1,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'RandomLunch'
      },
      { 
        id: 3, 
        title: '파티 참여하기', 
        description: '일반파티를 생성하거나 참여하기', 
        points: 40, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 1,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'PartiesScreen_General'
      },
      { 
        id: 4, 
        title: '새로운 맛집 방문', 
        description: '새로운 맛집에 방문해보기', 
        points: 50, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 1,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'RestaurantsList'
      },
      { 
        id: 5, 
        title: '리뷰 작성', 
        description: '방문한 식당에 리뷰 작성하기', 
        points: 25, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 1,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'RestaurantsList'
      },
      { 
        id: 6, 
        title: '친구와 식사', 
        description: '친구와 함께 점심 식사하기', 
        points: 35, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 1,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'HomeScreen_FriendLunch'
      },
      { 
        id: 7, 
        title: '소통의 시작', 
        description: '오늘 친구와 채팅하기', 
        points: 20, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 1,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'ChatList'
      },
      { 
        id: 8, 
        title: '새로운 인연', 
        description: '새로운 친구 한 명을 추가하기', 
        points: 30, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 1,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'SearchUsers'
      },
      { 
        id: 9, 
        title: '맛집 탐색가', 
        description: '맛집 상세 정보 페이지 방문하기', 
        points: 15, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 1,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'RestaurantsList'
      },
      { 
        id: 10, 
        title: '검색 마스터', 
        description: '맛집 검색 기능 사용하기', 
        points: 15, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 1,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'RestaurantsList'
      },
      { 
        id: 11, 
        title: '오찬 추천하기', 
        description: '맛집에 오찬 추천 하트를 누르기', 
        points: 20, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 1,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'RestaurantsList'
      },
      { 
        id: 12, 
        title: '친구 초대하기', 
        description: '새로운 친구를 앱으로 초대하기', 
        points: 25, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 1,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'FriendInvite'
      },
      { 
        id: 13, 
        title: '단골파티 참여', 
        description: '단골파티에 새롭게 참여하기', 
        points: 30, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 1,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'PartiesScreen_Dangol'
      },
      { 
        id: 14, 
        title: '식당 신청하기', 
        description: '식당 정보 추가/수정/삭제 요청하기', 
        points: 25, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 1,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'RestaurantsList_Request'
      }
    ],
    weekly: [
      { 
        id: 1, 
        title: '열성 사용자', 
        description: '5일 이상 앱에 접속하기', 
        points: 80, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 5,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'MyPageMain'
      },
      { 
        id: 2, 
        title: '랜덤런치 마스터', 
        description: '3회 이상 랜덤런치 참여하기', 
        points: 90, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 3,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'RandomLunch'
      },
      { 
        id: 3, 
        title: '파티 애호가', 
        description: '2회 이상 일반파티 참여하기', 
        points: 120, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 2,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'PartiesScreen_General'
      },
      { 
        id: 4, 
        title: '맛집 탐험가', 
        description: '2곳 이상 새로운 맛집 방문하기', 
        points: 150, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 2,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'RestaurantsList'
      },
      { 
        id: 5, 
        title: '리뷰 작가', 
        description: '3개 이상 리뷰 작성하기', 
        points: 75, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 3,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'RestaurantsList'
      },
      { 
        id: 6, 
        title: '친구 만남', 
        description: '3일 이상 친구와 식사하기', 
        points: 105, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 3,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'HomeScreen_FriendLunch'
      },
      { 
        id: 7, 
        title: '소통왕', 
        description: '5일 이상 채팅하기', 
        points: 60, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 5,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'ChatList'
      },
      { 
        id: 8, 
        title: '인맥 확장', 
        description: '2명 이상의 새로운 친구 추가하기', 
        points: 90, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 2,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'SearchUsers'
      },
      { 
        id: 9, 
        title: '맛집 탐색가', 
        description: '10곳 이상 맛집 상세 정보 확인하기', 
        points: 45, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 10,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'RestaurantsList'
      },
      { 
        id: 10, 
        title: '검색 마스터', 
        description: '8회 이상 검색 기능 사용하기', 
        points: 60, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 8,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'RestaurantsList'
      },
      { 
        id: 11, 
        title: '오찬 추천가', 
        description: '5곳 이상 맛집에 오찬 추천하기', 
        points: 60, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 5,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'RestaurantsList'
      },
      { 
        id: 12, 
        title: '친구초대 마스터', 
        description: '3회 이상 친구초대 기능 사용하기', 
        points: 75, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 3,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'FriendInvite'
      },
      { 
        id: 13, 
        title: '단골파티 애호가', 
        description: '2회 이상 단골파티 참여하기', 
        points: 90, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 2,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'PartiesScreen_Dangol'
      },
      { 
        id: 14, 
        title: '식당 신청가', 
        description: '2회 이상 식당 정보 추가/수정/삭제하기', 
        points: 75, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 2,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'RestaurantsList_Request'
      }
    ],
    monthly: [
      { 
        id: 1, 
        title: '열성 사용자', 
        description: '20일 이상 앱에 접속하기', 
        points: 300, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 20,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'MyPageMain'
      },
      { 
        id: 2, 
        title: '랜덤런치 마스터', 
        description: '12회 이상 랜덤런치 참여하기', 
        points: 270, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 12,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'RandomLunch'
      },
      { 
        id: 3, 
        title: '파티 애호가', 
        description: '8회 이상 일반파티 참여하기', 
        points: 360, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 8,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'PartiesScreen_General'
      },
      { 
        id: 4, 
        title: '맛집 탐험가', 
        description: '8곳 이상 새로운 맛집 방문하기', 
        points: 450, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 8,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'RestaurantsList'
      },
      { 
        id: 5, 
        title: '리뷰 작가', 
        description: '15개 이상 리뷰 작성하기', 
        points: 225, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 15,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'RestaurantsList'
      },
      { 
        id: 6, 
        title: '친구 만남', 
        description: '15일 이상 친구와 식사하기', 
        points: 315, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 15,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'HomeScreen_FriendLunch'
      },
      { 
        id: 7, 
        title: '소통왕', 
        description: '20일 이상 채팅하기', 
        points: 180, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 20,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'ChatList'
      },
      { 
        id: 8, 
        title: '인맥 확장', 
        description: '8명 이상의 새로운 친구 추가하기', 
        points: 270, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 8,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'SearchUsers'
      },
      { 
        id: 9, 
        title: '맛집 탐색가', 
        description: '50곳 이상 맛집 상세 정보 확인하기', 
        points: 135, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 50,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'RestaurantsList'
      },
      { 
        id: 10, 
        title: '검색 마스터', 
        description: '40회 이상 검색 기능 사용하기', 
        points: 135, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 40,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'RestaurantsList'
      },
      { 
        id: 11, 
        title: '오찬 추천가', 
        description: '25곳 이상 맛집에 오찬 추천하기', 
        points: 180, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 25,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'RestaurantsList'
      },
      { 
        id: 12, 
        title: '친구초대 마스터', 
        description: '12회 이상 친구초대 기능 사용하기', 
        points: 180, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 12,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'FriendInvite'
      },
      { 
        id: 13, 
        title: '단골파티 애호가', 
        description: '8회 이상 단골파티 참여하기', 
        points: 270, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 8,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'PartiesScreen_Dangol'
      },
      { 
        id: 14, 
        title: '식당 신청가', 
        description: '8회 이상 식당 정보 추가/수정/삭제하기', 
        points: 225, 
        completed: false,
        claimed: false,
        progress: 0,
        total: 8,
        autoComplete: false,
        actionType: 'navigate',
        targetScreen: 'RestaurantsList_Request'
      }
    ]
  });
  const { earnPoints, isMissionClaimed } = usePoints();
  const { getTabMissionProgress, getDailyCompletionRate, missionProgress, claimMission } = useMission();



  // MissionContext의 미션 진행도와 동기화
  useEffect(() => {
    if (missionProgress) {
      // console.log('🔍 MissionModal - 미션 진행도 업데이트 감지:', missionProgress);
      
      // 미션 상태 업데이트
      setMissions(prevMissions => {
        const updatedMissions = { ...prevMissions };
        
        // 각 탭의 미션들을 업데이트
        Object.keys(updatedMissions).forEach(tab => {
          if (missionProgress[tab]) {
            updatedMissions[tab] = updatedMissions[tab].map(mission => {
              const progress = missionProgress[tab][mission.id];
              if (progress) {
                return {
                  ...mission,
                  completed: progress.completed,
                  progress: progress.progress,
                  total: progress.total || mission.total
                };
              }
              return mission;
            });
          }
        });
        
        // console.log('🔍 MissionModal - 미션 상태 업데이트됨:', updatedMissions);
        return updatedMissions;
      });
    }
  }, [missionProgress]);



  // 현재 탭의 미션 진행도 계산 (8개 미션 달성 시 100%)
  const currentTabProgress = useMemo(() => {
    const currentMissions = missions[activeTab];
    const completedCount = currentMissions.filter(m => m.completed).length;
    const totalCount = currentMissions.length;
    
    // 8개 미션 달성 시 100%가 되도록 계산
    const percentage = Math.min((completedCount / 8) * 100, 100);
    
    // 디버깅 로그 추가 (개발 시에만 활성화)
    // console.log('🔍 MissionModal - currentTabProgress:', {
    //   activeTab,
    //   totalCount,
    //   completedCount,
    //   percentage: percentage
    // });
    
    return { completed: completedCount, total: totalCount, percentage: percentage };
  }, [activeTab, missions]);



  // 미션 목록 디버깅 (개발 시에만 활성화)
  // useEffect(() => {
  //   console.log('🔍 MissionModal - missions data:', {
  //     activeTab,
  //     missionsCount: missions[activeTab]?.length || 0,
  //     missions: missions[activeTab]
  //   });
  // }, [activeTab, missions]);

  // 카운트다운 실시간 업데이트
  useEffect(() => {
    const interval = setInterval(() => {
      // 카운트다운을 강제로 다시 렌더링하기 위해 상태 업데이트
      setMissions(prev => ({ ...prev }));
    }, 1000); // 1초마다 업데이트

    return () => clearInterval(interval);
  }, []);



  // 미션 액션 처리
  const handleMissionAction = useCallback((mission) => {
    // 미션이 완료되었지만 아직 수령하지 않은 경우 (수령 버튼)
    if (mission.completed && !getMissionState(mission.id).claimed) {
      // 포인트 수령
      earnPoints(mission.points);
      
      // 미션 상태 업데이트
      setMissionStates(prev => ({
        ...prev,
        [mission.id]: { ...prev[mission.id], claimed: true }
      }));
      
      // missions 상태 업데이트
      setMissions(prevMissions => {
        const updatedMissions = { ...prevMissions };
        const currentTabMissions = [...updatedMissions[activeTab]];
        const missionIndex = currentTabMissions.findIndex(m => m.id === mission.id);
        if (missionIndex !== -1) {
          currentTabMissions[missionIndex] = { ...currentTabMissions[missionIndex], claimed: true };
          updatedMissions[activeTab] = currentTabMissions;
        }
        return updatedMissions;
      });
      
      // 축하 모달 표시
      setCelebrationData({
        title: '미션 완료!',
        points: mission.points
      });
      setCelebrationVisible(true);
      
      // 전역 미션 진행도에 수령 상태 반영
      try {
        claimMission(activeTab, mission.id);
      } catch (e) {
        console.log('claimMission 호출 중 오류:', e);
      }
      
      // 미션 업데이트 콜백 호출
      if (onMissionUpdate) {
        onMissionUpdate();
      }
    } else if (mission.actionType === 'claim') {
      // 포인트 수령 (기존 로직 유지)
      earnPoints(mission.points);
      
      // 미션 상태 업데이트
      setMissionStates(prev => ({
        ...prev,
        [mission.id]: { ...prev[mission.id], claimed: true }
      }));
      
      // missions 상태 업데이트
      setMissions(prevMissions => {
        const updatedMissions = { ...prevMissions };
        const currentTabMissions = [...updatedMissions[activeTab]];
        const missionIndex = currentTabMissions.findIndex(m => m.id === mission.id);
        if (missionIndex !== -1) {
          currentTabMissions[missionIndex] = { ...currentTabMissions[missionIndex], claimed: true };
          updatedMissions[activeTab] = currentTabMissions;
        }
        return updatedMissions;
      });
      
      // 축하 모달 표시
      setCelebrationData({
        title: '미션 완료!',
        points: mission.points
      });
      setCelebrationVisible(true);
      
      // 전역 미션 진행도에 수령 상태 반영
      try {
        claimMission(activeTab, mission.id);
      } catch (e) {
        console.log('claimMission 호출 중 오류:', e);
      }
      
      // 미션 업데이트 콜백 호출
      if (onMissionUpdate) {
        onMissionUpdate();
      }
    } else if (mission.actionType === 'navigate' && mission.targetScreen) {
      // 해당 화면으로 이동 (자동 완료 없이)
      onClose();
      
      // 미션별 네비게이션 처리
      const targetScreen = mission.targetScreen;
      
      // 랜덤런치 관련 미션
      if (targetScreen === 'RandomLunch') {
        navigation.navigate('파티', { screen: 'RandomLunch' });
      }
      // 파티 참여하기 미션 (일반파티)
      else if (targetScreen === 'PartiesScreen_General') {
        // console.log('🔍 MissionModal - 일반파티 미션 클릭, 네비게이션 시작');
        navigation.navigate('파티', { screen: 'PartiesScreen', params: { switchToTab: 1 } });
        // console.log('🔍 MissionModal - 일반파티 미션 네비게이션 완료');
      }
      // 단골파티 참여 미션
      else if (targetScreen === 'PartiesScreen_Dangol') {
        // console.log('🔍 MissionModal - 단골파티 미션 클릭, 네비게이션 시작');
        navigation.navigate('파티', { screen: 'PartiesScreen', params: { switchToTab: 2 } });
        // console.log('🔍 MissionModal - 단골파티 미션 네비게이션 완료');
      }
      // 파티 참여하기 미션 (기본)
      else if (targetScreen === 'PartiesScreen') {
        navigation.navigate('파티', { screen: 'PartiesScreen' });
      }
      // 맛집 관련 미션들
      else if (targetScreen === 'RestaurantsList') {
        navigation.navigate('맛집', { screen: 'RestaurantsList' });
      }
      // 식당 신청하기 미션
      else if (targetScreen === 'RestaurantsList_Request') {
        navigation.navigate('맛집', { screen: 'RestaurantMap', params: { showRestaurantRequest: true } });
      }
      // 소통 관련 미션
      else if (targetScreen === 'ChatList') {
        navigation.navigate('소통', { screen: 'ChatList' });
      }
      // 친구 관련 미션들
      else if (targetScreen === 'FriendMain') {
        navigation.navigate('친구', { screen: 'FriendMain' });
      }
      else if (targetScreen === 'SearchUsers') {
        navigation.navigate('친구', { screen: 'SearchUsers' });
      }
      else if (targetScreen === 'FriendInvite') {
        navigation.navigate('친구', { screen: 'FriendInvite' });
      }
      // 친구와 함께 식사하기 미션
      else if (targetScreen === 'HomeScreen_FriendLunch') {
        navigation.navigate('홈', { screen: 'HomeScreen', params: { showFriendLunchModal: true } });
      }
      // 단골파티 관련 미션
      else if (targetScreen === 'DangolPotDetail') {
        navigation.navigate('파티', { screen: 'PartiesScreen' });
      }
      // 마이페이지 관련 미션
      else if (targetScreen === 'MyPageMain') {
        navigation.navigate('친구', { screen: 'MyPageMain' });
      }
      // 기본 네비게이션 (fallback)
      else {
        navigation.navigate(targetScreen);
      }
    }
  }, [activeTab, earnPoints, onMissionUpdate, navigation, onClose]);

  // 수령 가능한 미션이 있는지 확인
  const hasClaimableMissions = useMemo(() => {
    const currentMissions = missions[activeTab];
    return currentMissions.some(mission => 
      mission.completed && !mission.claimed
    );
  }, [activeTab, missions]);

  // 수령 가능한 미션이 있을 때마다 콜백 호출
  useEffect(() => {
    if (onMissionUpdate && hasClaimableMissions) {
      onMissionUpdate({ hasClaimableMissions: true });
    }
  }, [hasClaimableMissions, onMissionUpdate]);

  // 탭 변경 처리
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  // 제목 동적 변경
  const getModalTitle = useCallback(() => {
    switch (activeTab) {
      case 'daily': return '일일 미션';
      case 'weekly': return '주간 미션';
      case 'monthly': return '월간 미션';
      default: return '미션';
    }
  }, [activeTab]);

  // 카운트다운 텍스트 생성
  const getCountdownText = useCallback(() => {
    const now = new Date();
    let targetDate;
    
    switch (activeTab) {
      case 'daily':
        // 일일: 다음 자정까지
        targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + 1);
        targetDate.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        // 주간: 다음 주 월요일 자정까지
        targetDate = new Date(now);
        const daysUntilMonday = (8 - targetDate.getDay()) % 7; // 0=일요일, 1=월요일, ..., 6=토요일
        targetDate.setDate(targetDate.getDate() + daysUntilMonday);
        targetDate.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        // 월간: 다음 달 1일 자정까지
        targetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        targetDate.setHours(0, 0, 0, 0);
        break;
      default:
        targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + 1);
        targetDate.setHours(0, 0, 0, 0);
    }
    
    const timeLeft = targetDate - now;
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [activeTab]);



  // 미션 항목 렌더링
  const renderMissionItem = useCallback((mission) => {
    // console.log('🔍 MissionModal - rendering mission:', mission);
    
    const progressPercentage = (mission.progress / mission.total) * 100;
    const missionState = getMissionState(mission.id);
    const isClaimed = missionState.claimed;
    
    // 버튼 상태 결정
    let buttonConfig = null;
    if (mission.completed && !isClaimed) {
      buttonConfig = {
        text: '수령',
        style: 'claim',
        onPress: () => handleMissionAction(mission)
      };
    } else if (mission.completed && isClaimed) {
      buttonConfig = {
        text: '완료',
        style: 'completed',
        onPress: null
      };
    } else {
      buttonConfig = {
        text: '이동',
        style: 'move',
        onPress: () => handleMissionAction(mission)
      };
    }
    
    return (
      <View key={`mission-${mission.id}`} style={styles.missionItem}>
        <View style={styles.missionHeader}>
          <View style={styles.pointsContainer}>
            <View style={styles.pointsIcon}>
              <Ionicons name="star" size={16} color="#F59E0B" />
          </View>
            <Text style={styles.pointsText}>{mission.points}</Text>
          </View>
          
          <View style={styles.missionInfo}>
              <Text style={styles.missionTitle}>{mission.title}</Text>
            <Text style={styles.missionDescription}>{mission.description}</Text>
          </View>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${progressPercentage}%`,
                  backgroundColor: mission.completed ? '#10B981' : '#3B82F6'
                }
              ]} 
            />
          <Text style={styles.progressText}>
            {mission.progress}/{mission.total}
          </Text>
          </View>
        </View>
        
        {/* 액션 버튼 */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles[`actionButton_${buttonConfig.style}`],
              buttonConfig.onPress === null && styles.actionButton_disabled
            ]}
            onPress={buttonConfig.onPress}
            disabled={buttonConfig.onPress === null}
          >
            <Text style={[
              styles.actionButtonText,
              styles[`actionButtonText_${buttonConfig.style}`]
            ]}>
              {buttonConfig.text}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [handleMissionAction]);

  // 미션 상태 가져오기 (기존 함수 유지)
  const getMissionState = useCallback((missionId) => {
    return missionStates[missionId] || { claimed: false };
  }, [missionStates]);

  // 미션 목록 렌더링 전 디버깅 (개발 시에만 활성화)
  const renderMissionList = useCallback(() => {
    const currentMissions = missions[activeTab];
    // console.log('🔍 MissionModal - renderMissionList:', {
    //   activeTab,
    //   missionsCount: currentMissions?.length || 0,
    //   missions: currentMissions
    // });
    
    if (!currentMissions || currentMissions.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>미션을 불러오는 중...</Text>
        </View>
      );
    }
    
    return currentMissions.map(renderMissionItem);
  }, [activeTab, missions, renderMissionItem]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* 헤더 */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.modalTitle}>{getModalTitle()}</Text>
                  </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* 카운트다운 표시 */}
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownText}>
              새로고침 카운트다운: {getCountdownText()}
            </Text>
          </View>

          {/* 미션 목록 */}
          <ScrollView 
            style={styles.missionList}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.scrollContent}
            nestedScrollEnabled={true}
          >
            {missions[activeTab].map((mission) => (
              <View key={`mission-${mission.id}`} style={styles.missionItem}>
                <View style={styles.missionHeader}>
                  {/* 포인트 표시를 과녁 아래에 배치하고 경계선 추가 */}
                  <View style={styles.pointsContainer}>
                    <Text style={styles.pointsEmoji}>🎯</Text>
                    <Text style={styles.pointsText}>{mission.points}P</Text>
                  </View>
                  
                  <View style={styles.missionInfo}>
                    <Text style={styles.missionTitle}>{mission.title}</Text>
                    <Text style={styles.missionDescription}>{mission.description}</Text>
                    
                    {/* 진행도 막대를 미션 내용 아래에 배치 */}
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                    <View 
                      style={[
                            styles.progressFill, 
                            { 
                              width: `${(mission.progress / mission.total) * 100}%`,
                              backgroundColor: mission.completed ? '#10B981' : '#3B82F6'
                            }
                          ]} 
                        />
                        {/* 진행도 막대 안에 {진행}/{목표} 표시 */}
                        <Text style={styles.progressText}>
                          {mission.progress}/{mission.total}
                  </Text>
                </View>
              </View>
            </View>
                  
                  {/* 액션 버튼을 미션 제목과 같은 줄 오른쪽에 배치 */}
                  <View style={styles.actionContainer}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        mission.completed && !mission.claimed ? styles.actionButton_claim : 
                        mission.completed && mission.claimed ? styles.actionButton_completed : 
                        styles.actionButton_move
                      ]}
                      onPress={() => handleMissionAction(mission)}
                      disabled={mission.completed && mission.claimed}
                    >
                      <Text style={styles.actionButtonText}>
                        {mission.completed && !mission.claimed ? '수령' : 
                         mission.completed && mission.claimed ? '완료' : '이동'}
                      </Text>
            </TouchableOpacity>
          </View>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* 카테고리 탭 */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'daily' && styles.tabButtonActive]}
              onPress={() => handleTabChange('daily')}
            >
              <Text style={[styles.tabText, activeTab === 'daily' && styles.tabTextActive]}>
                일일
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'weekly' && styles.tabButtonActive]}
              onPress={() => handleTabChange('weekly')}
            >
              <Text style={[styles.tabText, activeTab === 'weekly' && styles.tabTextActive]}>
                주간
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'monthly' && styles.tabButtonActive]}
              onPress={() => handleTabChange('monthly')}
            >
              <Text style={[styles.tabText, activeTab === 'monthly' && styles.tabTextActive]}>
                월간
              </Text>
            </TouchableOpacity>
          </View>
          </View>

        {/* 축하 모달 */}
        <MissionCelebration
          visible={celebrationVisible}
          missionTitle={celebrationData.title}
          points={celebrationData.points}
          onComplete={() => {
            setCelebrationVisible(false);
            setCelebrationData({ title: '', points: 0 });
          }}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.95,
    height: height * 0.7, // 실제 높이 설정 추가
    maxHeight: height * 2, // 95%에서 98%로 증가하여 더 넓게
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  closeButton: {
    padding: 8,
  },
  
  // 마일스톤 스타일
  milestoneContainer: {
    marginBottom: 20, // 5에서 20으로 늘려서 카운트다운과 미션 목록 사이 여백 늘림
  },
  milestoneBar: {
    flexDirection: 'row',
    justifyContent: 'space-between', // flex-end에서 space-between으로 변경하여 균등 배치
    alignItems: 'center', // 세로 중앙 정렬
    marginBottom: 4, // 16에서 8로 줄여서 여백 줄임
    position: 'relative', // 진행 막대 위치 조정을 위해
    paddingHorizontal: 0, // 좌우 패딩 제거
  },
  milestoneItem: {
    alignItems: 'center',
    position: 'relative',
    flex: 0, // 고정 크기 사용
    zIndex: 2, // 진행 막대 위에 표시
    marginLeft: 0, // 왼쪽 여백 제거
  },
  milestoneIcon: {
    width: 40, // 48에서 40으로 줄임
    height: 40, // 48에서 40으로 줄임
    borderRadius: 20, // 24에서 20으로 줄임
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  milestoneCompleted: {
    backgroundColor: '#FEF3C7',
  },
  milestoneClaimed: {
    backgroundColor: '#ECFDF5',
  },
  milestoneGlow: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  milestoneText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  milestoneTextCompleted: {
    color: '#F59E0B',
  },
  milestoneTextClaimed: {
    color: '#10B981',
  },
  milestoneSparkle: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  sparkleText: {
    fontSize: 16,
  },
  milestoneTransparent: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    marginBottom: 0, // 투명 상자는 아래 여백 없음
  },
  
  // 진행도 바 스타일
  milestoneProgress: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  
  // 미션 목록 스타일
  missionList: {
    flex: 1,
    marginBottom: 20,
    minHeight: 200,
    maxHeight: height * 0.6, // 1.5에서 0.6으로 조정하여 적절한 비율로 설정
  },
  scrollContent: {
    paddingBottom: 20,
  },
  missionItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start', // center에서 flex-start로 변경하여 제목이 잘리지 않도록
    marginBottom: 12,
    justifyContent: 'space-between', // 요소들을 양쪽 끝으로 분산
    minHeight: 60, // 40에서 50으로 늘려서 제목이 확실히 보이도록
  },
  pointsContainer: {
    alignItems: 'center',
    backgroundColor: '#3B82F6', // 파란색 배경
    paddingHorizontal: 12,
    paddingVertical: 17,
    borderRadius: 12,
    marginRight: 16,
    borderRightWidth: 2, // 오른쪽 경계선 추가
    borderRightColor: '#E2E8F0', // 경계선 색상
    paddingRight: 16, // 경계선과 텍스트 사이 여백
    minWidth: 60, // 최소 너비 설정
    justifyContent: 'center', // 중앙 정렬
  },
  pointsIcon: {
    marginRight: 4,
  },
  pointsText: {
    fontSize: 12, // 포인트 텍스트 크기 조정
    fontWeight: 'bold',
    color: '#FFFFFF', // 흰색 텍스트
  },
  missionInfo: {
    flex: 1, // 남은 공간을 모두 차지
    marginRight: 0, // 오른쪽 여백 제거하여 진행도 막대가 버튼까지 확장
    flexWrap: 'wrap', // 텍스트가 줄바꿈되도록 추가
  },
  missionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 0, // 12에서 6으로 줄여서 제목과 내용 사이 여백 축소
    lineHeight: 28, // 24에서 28로 더 늘려서 텍스트가 확실히 잘리지 않도록
    paddingVertical: 4.3, // 위아래 패딩 추가하여 텍스트가 잘리지 않도록
  },
  missionDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 18, // 20에서 18로 줄여서 더 컴팩트하게
    flex: 1, // 남은 공간을 모두 사용
    flexWrap: 'wrap', // 텍스트 줄바꿈
    marginBottom: 0, // 진행도 막대와의 여백을 최소화
  },
  
  // 진행도 컨테이너
  progressContainer: {
    marginTop: -8, // -4에서 -8로 변경하여 더 위쪽으로 당겨서 여백 최소화
    marginRight: 0, // 오른쪽 여백 제거하여 진행도 막대가 버튼까지 확장
    width: 218, // 절대값으로 진행도 막대 길이 설정 (조정 가능)
  },
  progressBar: {
    height: 20, // 높이를 늘려서 텍스트가 잘 보이도록
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative', // 텍스트 위치 조정을 위해
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 10,
  },
  progressText: {
    position: 'absolute', // 절대 위치로 설정
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF', // 흰색 텍스트로 변경하여 진행도 막대 안에서 잘 보이도록
    textAlign: 'center', // 중앙 정렬
    lineHeight: 20, // 높이와 동일하게 설정
    zIndex: 1, // 진행도 막대 위에 표시
  },
  
  // 액션 버튼 스타일
  actionContainer: {
    // 버튼 컨테이너는 필요한 만큼만 차지
    alignSelf: 'flex-start', // 위쪽 정렬을 위해 추가
  },
  actionButton: {
    paddingVertical: 6, // 8에서 6으로 줄임
    paddingHorizontal: 12, // 16에서 12로 줄임
    borderRadius: 10, // 12에서 10으로 줄임
    minWidth: 70, // 80에서 70으로 줄임
    alignItems: 'center',
  },
  actionButton_claim: {
    backgroundColor: '#10B981',
  },
  actionButton_move: {
    backgroundColor: '#3B82F6',
  },
  actionButton_completed: {
    backgroundColor: '#6B7280',
  },
  actionButton_disabled: {
    opacity: 0.7,
  },
  actionButtonText: {
    fontSize: 12, // 14에서 12로 줄임
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // 탭 스타일
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#1E293B',
  },
  
  // 빈 상태 스타일
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748B',
  },
  pointsEmoji: {
    fontSize: 24, // 과녁 크기 증가
    marginBottom: 4, // 아래 여백 추가
  },
  // 마일스톤 진행 막대 스타일
  milestoneProgressBar: {
    position: 'absolute',
    top: '35%', // 25%에서 20%로 더 조정하여 아이콘 중앙에 정확히 맞춤
    left: 0,
    right: 0,
    height: 8, // 진행 막대 높이
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    zIndex: 1, // 선물 상자 아래에 배치
    transform: [{ translateY: -4 }], // 중앙 정렬을 위해 위로 4px 이동
  },
  milestoneProgressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  // 카운트다운 스타일
  countdownContainer: {
    alignItems: 'center',
    marginTop: 2, // 8에서 4로 줄여서 헤더와의 여백 줄임
    marginBottom: 16, // 16 추가하여 미션 목록과의 여백 늘림
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  countdownText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
});

export default MissionModal;
