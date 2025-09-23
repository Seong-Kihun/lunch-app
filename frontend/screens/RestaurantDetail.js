import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Dimensions, Alert, Share, ActivityIndicator, Linking, TextInput } from 'react-native';
import { Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RestaurantRequestModal from '../components/RestaurantRequestModal';
import { useMission } from '../contexts/MissionContext';
import { useFocusEffect } from '@react-navigation/native';
import { RENDER_SERVER_URL } from '../config';

const RestaurantDetail = ({ route, navigation }) => {
  const { restaurant } = route.params || {};
  const { colors: currentColors } = useTheme();
  
  // MissionContext 사용
  const { handleActionCompletion } = useMission();
  
  // restaurant 객체가 없으면 오류 화면 표시
  if (!restaurant) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, color: '#666' }}>식당 정보를 찾을 수 없습니다.</Text>
        <TouchableOpacity 
          style={{ marginTop: 20, padding: 10, backgroundColor: '#007AFF', borderRadius: 8 }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: 'white' }}>뒤로 가기</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // 상태 관리
  const [isSaved, setIsSaved] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [recommendCount, setRecommendCount] = useState(0);
  const [selectedSort, setSelectedSort] = useState('추천순');
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [chatRooms, setChatRooms] = useState([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [myReview, setMyReview] = useState(null);
  const [sortedReviews, setSortedReviews] = useState([]);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  
  // 저장 및 오찬 추천 상태 불러오기 (백엔드 API 사용)
  const loadUserActions = async () => {
    try {
      // 오찬 추천 상태 불러오기
      const recommendResponse = await fetch(`${RENDER_SERVER_URL}/dev/api/v2/restaurants/${restaurant.id}/recommend/status?user_id=KOICA001`);
      if (recommendResponse.ok) {
        const recommendResult = await recommendResponse.json();
        if (recommendResult.success) {
          setIsLiked(recommendResult.data.is_recommended);
          setRecommendCount(recommendResult.data.recommend_count);
        }
      }
      
      // 저장 상태 불러오기
      const savedResponse = await fetch(`${RENDER_SERVER_URL}/dev/api/v2/restaurants/${restaurant.id}/save/status?user_id=KOICA001`);
      if (savedResponse.ok) {
        const savedResult = await savedResponse.json();
        if (savedResult.success) {
          setIsSaved(savedResult.data.is_saved);
        }
      }
    } catch (error) {
      console.error('사용자 액션 로드 오류:', error);
    }
  };

  // 맛집 상세 페이지 방문 시 미션 달성 체크
  useEffect(() => {
    if (restaurant && restaurant.id) {
      // 맛집 탐색가 미션 달성
      handleActionCompletion('restaurant_detail_view');
    }
  }, [restaurant, handleActionCompletion]);

  // 화면 포커스 시 뒤로가기 처리 (스와이프 제스처 포함)
  useFocusEffect(
    React.useCallback(() => {
      // 화면이 포커스를 잃을 때 실행 (뒤로가기/스와이프)
      return () => {
        if (route.params?.fromPersonalSchedule) {
          // 개인 점심 약속 추가 화면으로 이동
          setTimeout(() => {
            navigation.navigate('기타 일정 추가', {
              ...route.params.personalScheduleParams,
              showRestaurantModal: true
            });
          }, 100);
        }
      };
    }, [navigation, route.params])
  );
  
  // 리뷰에서 사진 가져오기
  const getRestaurantImages = () => {
    const allImages = [];
    reviews.forEach(review => {
      if (review.images && review.images.length > 0) {
        allImages.push(...review.images);
      }
    });
    return allImages;
  };

  // 가장 많이 선택된 음식 종류들 계산 (동점 포함)
  const getMostSelectedFoodTypes = () => {
    const foodTypeCount = {};
    
    reviews.forEach(review => {
      if (review.food_types && review.food_types.length > 0) {
        review.food_types.forEach(foodType => {
          foodTypeCount[foodType] = (foodTypeCount[foodType] || 0) + 1;
        });
      }
    });
    
    let maxCount = 0;
    const mostSelectedTypes = [];
    
    // 최대 선택 횟수 찾기
    Object.keys(foodTypeCount).forEach(foodType => {
      if (foodTypeCount[foodType] > maxCount) {
        maxCount = foodTypeCount[foodType];
      }
    });
    
    // 최대 선택 횟수와 같은 모든 음식 종류 찾기
    Object.keys(foodTypeCount).forEach(foodType => {
      if (foodTypeCount[foodType] === maxCount && maxCount > 0) {
        mostSelectedTypes.push(foodType);
      }
    });
    
    return mostSelectedTypes;
  };

  // 리뷰에서 가장 많이 언급된 키워드 5개 추출
  const getTopKeywords = () => {
    const keywordCount = {};
    
    reviews.forEach(review => {
      // 분위기 태그 카운트
      if (review.atmosphere && review.atmosphere.length > 0) {
        review.atmosphere.forEach(keyword => {
          keywordCount[keyword] = (keywordCount[keyword] || 0) + 1;
        });
      }
      
      // 특징 태그 카운트
      if (review.features && review.features.length > 0) {
        review.features.forEach(keyword => {
          keywordCount[keyword] = (keywordCount[keyword] || 0) + 1;
        });
      }
      
      // 리뷰 텍스트에서 키워드 추출 (간단한 키워드 매칭)
      if (review.review_text) {
        const text = review.review_text.toLowerCase();
        const keywords = [
          '맛있', '맛나', '맛있어', '맛있었', '맛있고', '맛있는',
          '매운', '매워', '매운맛', '매운맛이',
          '가성비', '가성비가', '가성비좋', '가성비가좋',
          '분위기', '분위기가', '분위기좋', '분위기가좋',
          '깔끔', '깔끔한', '깔끔해',
          '친절', '친절한', '친절해',
          '혼밥', '혼밥하기', '혼밥하기좋',
          '데이트', '데이트하기', '데이트하기좋',
          '단체', '단체모임', '단체로',
          '가족', '가족모임', '가족과',
          '고급', '고급스러운', '고급스러',
          '힙한', '힙해',
          '전통', '전통적인', '전통적',
          '신선', '신선한', '신선해',
          '정갈', '정갈한', '정갈해',
          '푸짐', '푸짐한', '푸짐해',
          '특별', '특별한', '특별해',
          '유명', '유명한', '유명해',
          '숨겨진', '숨겨진맛집',
          '배달', '배달가능', '배달가능한',
          '포장', '포장가능', '포장가능한',
          '주차', '주차가능', '주차가능한',
          '와이파이', 'wifi', 'wifi가',
          '콘센트', '콘센트가',
          '반려동물', '반려동물동반',
          '무료리필', '무료리필이',
          '양념', '양념추가', '양념이',
          '사이드', '사이드메뉴',
          '디저트', '디저트가',
          '음료', '음료가',
          '조용', '조용한', '조용해',
          '시끄러', '시끄러운', '시끄러워',
          '밝은', '밝아',
          '어두운', '어두워',
          '넓은', '넓어',
          '좁은', '좁아',
          '깨끗', '깨끗한', '깨끗해',
          '위생', '위생적인', '위생적',
          '빠른', '빠른서비스',
          '느린', '느린서비스',
          '서비스', '서비스가',
          '예약', '예약필수', '예약가능',
          '대기', '대기시간',
          '즉시', '즉시입장'
        ];
        
        keywords.forEach(keyword => {
          if (text.includes(keyword)) {
            // 키워드를 원래 형태로 변환
            let originalKeyword = keyword;
            if (keyword.includes('맛있')) originalKeyword = '맛있는';
            else if (keyword.includes('매운')) originalKeyword = '매운맛';
            else if (keyword.includes('가성비')) originalKeyword = '가성비';
            else if (keyword.includes('분위기')) originalKeyword = '분위기좋은';
            else if (keyword.includes('깔끔')) originalKeyword = '깔끔한';
            else if (keyword.includes('친절')) originalKeyword = '친절한';
            else if (keyword.includes('혼밥')) originalKeyword = '혼밥하기좋아요';
            else if (keyword.includes('데이트')) originalKeyword = '데이트하기좋아요';
            else if (keyword.includes('단체')) originalKeyword = '단체모임';
            else if (keyword.includes('가족')) originalKeyword = '가족모임';
            else if (keyword.includes('고급')) originalKeyword = '고급스러운';
            else if (keyword.includes('힙한')) originalKeyword = '힙한';
            else if (keyword.includes('전통')) originalKeyword = '전통적인';
            else if (keyword.includes('신선')) originalKeyword = '신선한재료';
            else if (keyword.includes('정갈')) originalKeyword = '정갈한';
            else if (keyword.includes('푸짐')) originalKeyword = '푸짐한';
            else if (keyword.includes('특별')) originalKeyword = '특별한';
            else if (keyword.includes('유명')) originalKeyword = '유명한';
            else if (keyword.includes('숨겨진')) originalKeyword = '숨겨진맛집';
            else if (keyword.includes('배달')) originalKeyword = '배달가능';
            else if (keyword.includes('포장')) originalKeyword = '포장가능';
            else if (keyword.includes('주차')) originalKeyword = '주차가능';
            else if (keyword.includes('와이파이') || keyword.includes('wifi')) originalKeyword = '와이파이';
            else if (keyword.includes('콘센트')) originalKeyword = '콘센트';
            else if (keyword.includes('반려동물')) originalKeyword = '반려동물동반';
            else if (keyword.includes('무료리필')) originalKeyword = '무료리필';
            else if (keyword.includes('양념')) originalKeyword = '양념추가';
            else if (keyword.includes('사이드')) originalKeyword = '사이드메뉴';
            else if (keyword.includes('디저트')) originalKeyword = '디저트';
            else if (keyword.includes('음료')) originalKeyword = '음료';
            else if (keyword.includes('조용')) originalKeyword = '조용한';
            else if (keyword.includes('시끄러')) originalKeyword = '시끄러운';
            else if (keyword.includes('밝은')) originalKeyword = '밝은';
            else if (keyword.includes('어두운')) originalKeyword = '어두운';
            else if (keyword.includes('넓은')) originalKeyword = '넓은';
            else if (keyword.includes('좁은')) originalKeyword = '좁은';
            else if (keyword.includes('깨끗')) originalKeyword = '깨끗한';
            else if (keyword.includes('위생')) originalKeyword = '위생적인';
            else if (keyword.includes('빠른')) originalKeyword = '빠른서비스';
            else if (keyword.includes('느린')) originalKeyword = '느린서비스';
            else if (keyword.includes('서비스')) originalKeyword = '친절한서비스';
            else if (keyword.includes('예약')) originalKeyword = '예약가능';
            else if (keyword.includes('대기')) originalKeyword = '대기시간';
            else if (keyword.includes('즉시')) originalKeyword = '즉시입장';
            
            keywordCount[originalKeyword] = (keywordCount[originalKeyword] || 0) + 1;
          }
        });
      }
    });
    
    // 가장 많이 언급된 키워드 5개 추출
    const sortedKeywords = Object.keys(keywordCount)
      .sort((a, b) => keywordCount[b] - keywordCount[a])
      .slice(0, 5);
    
    return sortedKeywords;
  };
  
  // 실제 채팅방 목록 가져오기
  const fetchChatRooms = async () => {
    try {
      setIsLoadingChats(true);
      const response = await fetch(`https://lunch-app-backend-ra12.onrender.com/chats/KOICA001`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setChatRooms(data);
      }
    } catch (error) {
      console.error('채팅방 목록 조회 오류:', error);
      // 오류 시 샘플 데이터 사용
      setChatRooms([
        { id: 1, type: 'party', title: '건강한 점심 모임', subtitle: '스타벅스 | 1/4명' },
        { id: 2, type: 'party', title: '랜덤 런치', subtitle: '일식당 | 2/2명' },
        { id: 3, type: 'party', title: '랜덤 런치', subtitle: '분당 맛집 | 4/4명' },
        { id: 4, type: 'party', title: '랜덤 런치', subtitle: '판교역 맛집 | 3/3명' },
        { id: 5, type: 'dangolpot', title: '마라탕웨이', subtitle: '#매운맛, #마라마라' }
      ]);
    } finally {
      setIsLoadingChats(false);
    }
  };
  
  // 저장 기능
  const handleSave = async () => {
    try {
      const newIsSaved = !isSaved;
      setIsSaved(newIsSaved);
      
      // 저장 상태를 AsyncStorage에 저장
      const saveData = {
        isSaved: newIsSaved,
        savedAt: new Date().toISOString()
      };
      
      await AsyncStorage.setItem(`saved_restaurant_${restaurant.id}`, JSON.stringify(saveData));
      
      if (newIsSaved) {
        Alert.alert('저장 완료', '맛집이 저장되었습니다!');
      } else {
        Alert.alert('저장 취소', '맛집 저장이 취소되었습니다.');
      }
    } catch (error) {
      console.error('저장 오류:', error);
      Alert.alert('오류', '저장 처리 중 오류가 발생했습니다.');
    }
  };
  
  // 리뷰 작성 기능
  const handleWriteReview = () => {
    navigation.navigate('WriteReview', { 
      restaurant,
      onReviewSubmitted: () => {
        // 리뷰 작성 완료 후 리뷰 목록 새로고침
        fetchReviews();
        // 리뷰 추가 후 현재 선택된 정렬 방식으로 다시 정렬
        setTimeout(() => {
          handleSortChange(selectedSort);
        }, 100);
      }
    });
  };
  
  // 공유 모달 열기
  const handleShare = () => {
    fetchChatRooms(); // 채팅방 목록 새로고침
    setShareModalVisible(true);
  };
  
  // 앱 내 채팅방으로 공유
  const handleShareToChat = async (chatRoom) => {
    setShareModalVisible(false);
    
    try {
      // 채팅방에 식당 공유 메시지 보내기
      // 식당 정보를 JSON 형태로 포함하여 메시지 클릭 시 상세 페이지로 이동 가능하도록 함
      const restaurantData = {
        id: restaurant.id || 1,
        name: restaurant.name,
        rating: restaurant.rating || '4.5',
        address: restaurant.address || '',
        tags: restaurant.tags || ['한식', '오찬하기 좋아요'],
        image: getRestaurantImages()[0] || '',
        shared_at: new Date().toISOString()
      };
      
      const shareMessage = `🍽️ 맛집 공유\n\n📍 ${restaurant.name}\n⭐ ${restaurant.rating || '4.5'}점\n${restaurant.address ? `📍 ${restaurant.address}\n` : ''}🏷️ ${(restaurant.tags || ['한식', '오찬하기 좋아요']).join(', ')}\n\n이 맛집 어떠세요? 함께 가볼까요? 😊\n\n[식당정보:${JSON.stringify(restaurantData)}]`;
      
      const messageData = {
        chat_id: chatRoom.id,
        chat_type: chatRoom.type,
        sender_employee_id: 'KOICA001',
        message: shareMessage
      };
      
      const response = await fetch(`https://lunch-app-backend-ra12.onrender.com/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });
      
      if (response.ok) {
        Alert.alert(
          '공유 완료',
          `${chatRoom.title}에 ${restaurant.name}을 공유했습니다.`
        );
      } else {
        throw new Error('메시지 전송 실패');
      }
    } catch (error) {
      console.error('채팅방 공유 오류:', error);
      Alert.alert(
        '공유 완료',
        `${chatRoom.title}에 ${restaurant.name}을 공유했습니다.`
      );
    }
  };
  
  // 외부로 공유
  const handleShareExternal = async () => {
    setShareModalVisible(false);
    try {
      // 공유할 내용 구성
      const shareMessage = `🍽️ 맛집 공유\n\n📍 ${restaurant.name}\n⭐ ${restaurant.rating || '4.5'}점\n${restaurant.address ? `📍 ${restaurant.address}\n` : ''}🏷️ ${(restaurant.tags || ['한식', '오찬하기 좋아요']).join(', ')}\n\n이 맛집 어떠세요? 함께 가볼까요? 😊`;
      
      const result = await Share.share({
        message: shareMessage,
        title: `${restaurant.name} - 맛집 공유`
      });
      
      if (result.action === Share.sharedAction) {
        // 공유 완료
      } else if (result.action === Share.dismissedAction) {
        // 공유 취소됨
      }
      
    } catch (error) {
      console.error('외부 공유 오류:', error);
      Alert.alert('공유 실패', '공유 기능을 사용할 수 없습니다.');
    }
  };
  
  // 오찬 추천 기능 (백엔드 API 사용)
  const handleLunchRecommend = async () => {
    try {
      const response = await fetch(`${RENDER_SERVER_URL}/api/v2/restaurants/${restaurant.id}/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: 'KOICA001'
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setIsLiked(result.action === 'added');
          setRecommendCount(result.recommend_count);
          
          if (result.action === 'added') {
            Alert.alert('추천 완료', result.message);
            // 미션 달성 체크: 오찬 추천하기
            handleActionCompletion('restaurant_like');
          } else {
            Alert.alert('추천 취소', result.message);
          }
        } else {
          Alert.alert('오류', result.error || '오찬 추천 처리 중 오류가 발생했습니다.');
        }
      } else {
        Alert.alert('오류', '서버와의 통신 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('오찬 추천 오류:', error);
      Alert.alert('오류', '오찬 추천 처리 중 오류가 발생했습니다.');
    }
  };

  // 파티 생성 기능
  const handleCreateParty = () => {
    // 파티탭으로 이동하고 CreateParty 화면으로 이동
    navigation.navigate('파티', {
      screen: 'CreateParty',
      params: {
        prefilledRestaurant: restaurant.name
      }
    });
  };

  // 전화걸기
  const handleCall = () => {
    if (restaurant.phone) {
      const phoneNumber = restaurant.phone.replace(/[^0-9]/g, ''); // 숫자만 추출
      const phoneUrl = `tel:${phoneNumber}`;
      
      Linking.canOpenURL(phoneUrl)
        .then((supported) => {
          if (supported) {
            Linking.openURL(phoneUrl);
          } else {
            Alert.alert('오류', '전화걸기를 지원하지 않는 기기입니다.');
          }
        })
        .catch((error) => {
          console.error('전화걸기 오류:', error);
          Alert.alert('오류', '전화걸기에 실패했습니다.');
        });
    } else {
      Alert.alert('정보 없음', '전화번호 정보가 없습니다.');
    }
  };

  // 식당 정보 수정/삭제 신청 처리
  const handleRestaurantRequest = async (requestType) => {
    try {
      const requestData = {
        request_type: requestType,
        requester_id: 'KOICA001', // 현재 사용자 ID
        requester_nickname: '테스트 사용자', // 현재 사용자 닉네임
        restaurant_name: restaurant.name,
        restaurant_address: restaurant.address,
        restaurant_id: restaurant.id,
        reason: `${requestType === 'update' ? '수정' : '삭제'} 신청: ${restaurant.name}`,
      };

      const response = await fetch(`https://lunch-app-backend-ra12.onrender.com/restaurants/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert(
          '신청 완료',
          result.message,
          [{ text: '확인' }]
        );
      } else {
        Alert.alert('신청 실패', result.error || '신청 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('식당 신청 오류:', error);
      Alert.alert('오류', '네트워크 오류가 발생했습니다.');
    }
  };

  // 리뷰 수정 기능
  const handleEditReview = (review) => {
    navigation.navigate('WriteReview', { 
      restaurant: restaurant,
      editReview: review,
      onReviewSubmitted: () => {
        fetchReviews();
        setTimeout(() => {
          handleSortChange(selectedSort);
        }, 100);
      }
    });
  };

  // 리뷰 삭제 기능
  const handleDeleteReview = (review) => {
    Alert.alert(
      '리뷰 삭제',
      '정말로 이 리뷰를 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: async () => {
            try {
              const existingReviews = await AsyncStorage.getItem(`reviews_${restaurant.id}`);
              if (existingReviews) {
                const parsedReviews = JSON.parse(existingReviews);
                const updatedReviews = parsedReviews.filter(r => r.id !== review.id);
                await AsyncStorage.setItem(`reviews_${restaurant.id}`, JSON.stringify(updatedReviews));
                
                // 상태 즉시 업데이트
                setReviews(updatedReviews);
                
                // 내 리뷰들 찾기 (여러 개일 수 있음)
                const myReviews = updatedReviews.filter(review => review.userId === 'KOICA001');
                setMyReview(myReviews.length > 0 ? myReviews[0] : null);
                
                // 정렬된 리뷰 업데이트
                let sorted = [...updatedReviews];
                switch (selectedSort) {
                  case '최신순':
                    sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    break;
                  case '평점 높은순':
                    sorted.sort((a, b) => b.rating - a.rating);
                    break;
                  case '평점 낮은순':
                    sorted.sort((a, b) => a.rating - b.rating);
                    break;
                  case '추천순':
                  default:
                    sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    break;
                }
                setSortedReviews(sorted);
                
                Alert.alert('삭제 완료', '리뷰가 삭제되었습니다.');
              }
            } catch (error) {
              console.error('리뷰 삭제 오류:', error);
              Alert.alert('오류', '리뷰 삭제 중 오류가 발생했습니다.');
            }
          }
        }
      ]
    );
  };
  
  // 전체 사진 보기 기능
  const handleViewAllPhotos = () => {
    const restaurantImages = getRestaurantImages();
    if (restaurantImages.length > 0) {
      navigation.navigate('PhotoGallery', { 
        restaurant: restaurant,
        images: restaurantImages 
      });
    } else {
      Alert.alert('사진 없음', '등록된 사진이 없습니다.');
    }
  };
  
  // 리뷰 가져오기 (백엔드 API 사용)
  const fetchReviews = async () => {
    try {
      const response = await fetch(`${RENDER_SERVER_URL}/api/v2/restaurants/${restaurant.id}/reviews`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const apiReviews = result.data.reviews;
          setReviews(apiReviews);
          
          // 내 리뷰들 찾기 (여러 개일 수 있음)
          const myReviews = apiReviews.filter(review => review.user_id === 'KOICA001');
          setMyReview(myReviews.length > 0 ? myReviews[0] : null); // 첫 번째 리뷰를 대표로 표시
          
          // 초기 정렬 설정 (최신순)
          const sorted = [...apiReviews].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          setSortedReviews(sorted);
        }
      }
    } catch (error) {
      console.error('리뷰 조회 오류:', error);
    }
  };

  // 평균 평점 계산
  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    return (totalRating / reviews.length).toFixed(1);
  };

  // 평점 분포 계산
  const calculateRatingDistribution = () => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      distribution[review.rating]++;
    });
    return distribution;
  };

  // 컴포넌트 마운트 시 리뷰 가져오기 및 사용자 액션 로드
  useEffect(() => {
    fetchReviews();
    loadUserActions();
  }, []);

  // 정렬 변경 기능
  const handleSortChange = (sortType) => {
    setSelectedSort(sortType);
    
    let sorted = [...reviews];
    
    switch (sortType) {
      case '최신순':
        sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case '평점 높은순':
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      case '평점 낮은순':
        sorted.sort((a, b) => a.rating - b.rating);
        break;
      case '추천순':
      default:
        // 추천순은 기본 순서 (최신순과 동일)
        sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
    }
    
    setSortedReviews(sorted);
  };
  // 커스텀 네비게이션 동작 설정 (개인일정에서 온 경우 뒤로가기 동작 변경)
  React.useEffect(() => {
    if (route.params?.fromPersonalSchedule) {
      navigation.setOptions({
        headerLeft: () => (
          <TouchableOpacity
            style={{
              marginLeft: 16,
              padding: 8,
            }}
            onPress={() => {
              // 개인 점심 약속 추가에서 온 경우
              // 개인 점심 약속 추가 화면으로 직접 이동 (맛집탭 기본화면 거치지 않음)
              const navigationParams = {
                screen: 'CreatePersonalSchedule',
                params: {
                  ...route.params.personalScheduleParams,
                  // 검색 관련 상태 복원
                  restoreSearchState: true,
                  searchQuery: route.params.personalScheduleParams?.searchQuery || '',
                  selectedCategory: route.params.personalScheduleParams?.selectedCategory || null,
                  sortBy: route.params.personalScheduleParams?.sortBy || 'name',
                  restaurantSuggestions: route.params.personalScheduleParams?.restaurantSuggestions || []
                }
              };
              
              navigation.navigate('파티', navigationParams);
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ),
      });
    }
  }, [navigation, route.params]);

  return (
    <>
      <ScrollView style={{ flex: 1, backgroundColor: currentColors.background }}>
        {/* 홈탭 '오늘의 구내식당 메뉴'와 동일한 상자 */}
        <View style={{ backgroundColor: '#fff', borderRadius: 20, marginHorizontal: 16, marginTop: 20, marginBottom: 20, padding: 16, shadowColor: currentColors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
          <View style={{ backgroundColor: currentColors.surface, borderRadius: 20, marginHorizontal: 16, marginTop: 8, marginBottom: 20, marginLeft:0, shadowColor: currentColors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
          {/* 상단 이미지 */}
          {(() => {
            const restaurantImages = getRestaurantImages();
            return restaurantImages.length > 0 ? (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={{
                  width: Dimensions.get('window').width - 63,
                  height: 180,
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  overflow: 'hidden'
                }}
              >
                {restaurantImages.slice(0, 5).map((img, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => navigation.navigate('PhotoGallery', { 
                      restaurant: restaurant,
                      images: restaurantImages,
                      initialIndex: idx
                    })}
                  >
                    <Image
                      source={{ uri: img }}
                      style={{
                        width: (Dimensions.get('window').width - 32) / 2,
                        height: 180,
                        resizeMode: 'cover'
                      }}
                    />
                  </TouchableOpacity>
                ))}
                {restaurantImages.length > 5 && (
                  <TouchableOpacity
                    style={{
                      width: (Dimensions.get('window').width - 32) / 2,
                      height: 180,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                    onPress={handleViewAllPhotos}
                  >
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>+더보기</Text>
                    <Text style={{ color: '#fff', fontSize: 14, marginTop: 4 }}>{restaurantImages.length}장</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            ) : (
              <View style={{
                width: '100%',
                height: 180,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                backgroundColor: '#f8f9fa',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Ionicons name="image-outline" size={48} color="#adb5bd" />
                <Text style={{ color: '#adb5bd', fontSize: 16, marginTop: 8 }}>등록된 사진이 없습니다</Text>
              </View>
            );
          })()}
          <View style={{ paddingTop: 16, paddingRight: 16, paddingBottom: 16, paddingLeft: 0 }}>
            {/* 식당 이름과 종류 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: currentColors.primary, marginLeft: 0 }}>{restaurant.name}</Text>
              {restaurant.category && (
                <View style={{ 
                  backgroundColor: currentColors.primary, 
                  borderRadius: 16, 
                  paddingHorizontal: 12, 
                  paddingVertical: 6, 
                  marginLeft: 8 
                }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>{restaurant.category}</Text>
                </View>
              )}
            </View>

            {/* 식당 정보 (주소, 전화번호) */}
            <View style={{ marginBottom: 12 }}>
              {/* 주소 */}
              {restaurant.address && (
                <TouchableOpacity 
                  style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    marginBottom: 8,
                    paddingVertical: 4
                  }}
                  onPress={() => {
                    // 앱 내 맛집 지도에서 위치 보기
                    if (restaurant.latitude && restaurant.longitude) {
                      // 특정 식당을 중심으로 지도 표시
                      navigation.navigate('RestaurantMap', {
                        restaurants: [restaurant], // 현재 식당만 표시
                        currentLocation: {
                          latitude: restaurant.latitude,
                          longitude: restaurant.longitude
                        },
                        selectedRestaurant: restaurant,
                        centerOnRestaurant: true
                      });
                    } else {
                      Alert.alert('위치 정보 없음', '이 식당의 위치 정보가 없습니다.');
                    }
                  }}
                >
                  <Ionicons name="location-outline" size={16} color={currentColors.textSecondary} style={{ marginRight: 8 }} />
                  <Text style={{ 
                    color: currentColors.primary, 
                    fontSize: 14, 
                    flex: 1,
                    textDecorationLine: 'underline'
                  }}>
                    {restaurant.address}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={currentColors.textSecondary} />
                </TouchableOpacity>
              )}

              {/* 전화번호 */}
              {restaurant.phone && (
                <TouchableOpacity 
                  style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center',
                    paddingVertical: 4
                  }}
                  onPress={handleCall}
                >
                  <Ionicons name="call-outline" size={16} color={currentColors.textSecondary} style={{ marginRight: 8 }} />
                  <Text style={{ 
                    color: currentColors.primary, 
                    fontSize: 14,
                    textDecorationLine: 'underline'
                  }}>
                    {restaurant.phone}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* AI 키워드 분석 */}
            {getTopKeywords().length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: -45 }}>
                {getTopKeywords().map((keyword, idx) => (
                  <Text key={idx} style={{ color: currentColors.textSecondary, fontSize: 14, marginRight: 12, marginBottom: 4 }}>
                    #{keyword}
                  </Text>
                ))}
              </View>
            )}
          </View>
            </View>
            {/* 저장/리뷰쓰기/공유/오찬하기 좋아요/파티생성 버튼 */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 13,
              marginBottom: 0,
              paddingHorizontal: 0,
              paddingVertical: 12,
            }}>
              <TouchableOpacity style={{ alignItems: 'center', flex: 1 }} onPress={handleSave}>
                <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={36} color={currentColors.primary} style={{ marginBottom: 6 }} />
                <Text style={{ color: currentColors.text, fontSize: 12, fontWeight: 'bold' }}>저장</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ alignItems: 'center', flex: 1 }} onPress={handleWriteReview}>
                <Ionicons name="create-outline" size={36} color={currentColors.primary} style={{ marginBottom: 6 }} />
                <Text style={{ color: currentColors.text, fontSize: 12, fontWeight: 'bold' }}>리뷰</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ alignItems: 'center', flex: 1 }} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={36} color={currentColors.primary} style={{ marginBottom: 6 }} />
                <Text style={{ color: currentColors.text, fontSize: 12, fontWeight: 'bold' }}>공유</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ alignItems: 'center', flex: 1 }} onPress={handleLunchRecommend}>
                <Ionicons name={isLiked ? "heart" : "heart-outline"} size={36} color={currentColors.primary} style={{ marginBottom: 6 }} />
                <Text style={{ color: currentColors.text, fontSize: 12, fontWeight: 'bold' }}>오찬 추천</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ alignItems: 'center', flex: 1 }} onPress={handleCreateParty}>
                <Ionicons name="people-outline" size={36} color={currentColors.primary} style={{ marginBottom: 6 }} />
                <Text style={{ color: currentColors.text, fontSize: 12, fontWeight: 'bold' }}>파티생성</Text>
              </TouchableOpacity>
            </View>
          </View>
        
        {/* 상자2: 리뷰란 전체 */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, marginHorizontal: 16, marginTop: 0, marginBottom: 32, shadowColor: currentColors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, padding: 0 }}>
          <View style={{ padding: 20 }}>
    {/* 방문자 평가 헤더 */}
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
    </View>
    {/* 별점, 점수 */}
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
      {reviews.length > 0 ? (
        <>
          {[1, 2, 3, 4, 5].map((star) => {
            const averageRating = parseFloat(calculateAverageRating());
            const isHalfStar = averageRating >= star - 0.5 && averageRating < star;
            const isFullStar = averageRating >= star;
            
            return (
              <Ionicons 
                key={star}
                name={isFullStar ? "star" : isHalfStar ? "star-half" : "star-outline"} 
                size={28} 
                color={isFullStar || isHalfStar ? "#3B82F6" : "#CBD5E1"} 
              />
            );
          })}
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1E293B', marginLeft: 8 }}>
            {calculateAverageRating()}
          </Text>
        </>
      ) : (
        <>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons 
              key={star}
              name="star-outline" 
              size={28} 
              color="#CBD5E1" 
            />
          ))}
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#CBD5E1', marginLeft: 8 }}>
            -
          </Text>
        </>
      )}
    </View>
    {/* 평가 분포 (막대그래프) */}
    {reviews.length > 0 ? (
      (() => {
        const distribution = calculateRatingDistribution();
        const totalReviews = reviews.length;
        const labels = ['최고예요', '맛있어요', '무난해요', '아쉬워요', '별로예요'];
        
        // 가장 높은 비율의 평점 찾기
        let maxCount = 0;
        let maxRating = 0;
        [5, 4, 3, 2, 1].forEach((rating, idx) => {
          if (distribution[rating] > maxCount) {
            maxCount = distribution[rating];
            maxRating = rating;
          }
        });
        
        return [5, 4, 3, 2, 1].map((rating, idx) => {
          const count = distribution[rating];
          const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
          const isHighest = count > 0 && count === maxCount;
          
          return (
            <View key={labels[idx]} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
              <Text style={{ 
                width: 70, 
                color: isHighest ? '#3B82F6' : '#64748B', 
                fontWeight: isHighest ? 'bold' : 'normal', 
                fontSize: 14 
              }}>
                {labels[idx]}
              </Text>
              <View style={{ flex: 1, height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, marginHorizontal: 6 }}>
                <View style={{ 
                  width: `${percentage}%`, 
                  height: 8, 
                  backgroundColor: isHighest ? '#3B82F6' : '#CBD5E0', 
                  borderRadius: 4 
                }} />
              </View>
              <Text style={{ 
                color: isHighest ? '#3B82F6' : '#64748B', 
                fontWeight: isHighest ? 'bold' : 'normal', 
                fontSize: 13 
              }}>
                {`(${count})`}
              </Text>
            </View>
          );
        });
      })()
    ) : (
      <View style={{ alignItems: 'center', paddingVertical: 20 }}>
        <Ionicons name="star-outline" size={48} color="#CBD5E1" />
        <Text style={{ color: '#64748B', fontSize: 16, marginTop: 12, textAlign: 'center' }}>
          아직 리뷰가 없습니다
        </Text>
      </View>
    )}
    <View style={{ height: 20 }} />
    {/* 리뷰 탭 */}
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 12 }}>
        리뷰 {reviews.length}개
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row' }}>
          {['추천순', '최신순', '평점 높은순', '평점 낮은순'].map(tab => (
            <TouchableOpacity key={tab} style={{ marginRight: 8, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, backgroundColor: tab === selectedSort ? '#3B82F6' : '#F1F5F9' }} onPress={() => handleSortChange(tab)}>
              <Text style={{ color: tab === selectedSort ? '#fff' : '#1E293B', fontWeight: tab === selectedSort ? 'bold' : '600' }}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
    {/* 내 리뷰들 표시 */}
    {sortedReviews.filter(review => review.userId === 'KOICA001').map((myReview, index) => (
      <View key={myReview.id} style={{ backgroundColor: '#F0F9FF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#3B82F6' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image source={{ uri: myReview.userImage }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10 }} />
            <Text style={{ fontWeight: 'bold', color: '#1E293B' }}>{myReview.userName}</Text>
            <View style={{ flexDirection: 'row', marginLeft: 8 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= myReview.rating ? "star" : "star-outline"}
                  size={16}
                  color={star <= myReview.rating ? "#F59E0B" : "#CBD5E1"}
                  style={{ marginRight: 2 }}
                />
              ))}
            </View>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity 
              style={{ marginRight: 8, padding: 4 }}
              onPress={() => handleEditReview(myReview)}
            >
              <Ionicons name="create-outline" size={16} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ padding: 4 }}
              onPress={() => handleDeleteReview(myReview)}
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
        {myReview.images && myReview.images.length > 0 && (
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            {myReview.images.slice(0, 3).map((image, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => navigation.navigate('PhotoGallery', { 
                  restaurant: restaurant,
                  images: myReview.images,
                  initialIndex: index
                })}
              >
                <Image 
                  source={{ uri: image }} 
                  style={{ width: 60, height: 60, borderRadius: 8, marginRight: 6 }} 
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
        <Text style={{ color: '#1E293B', fontSize: 15, marginBottom: 4 }}>
          {myReview.review_text}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
          {[...(myReview.food_types || []), ...(myReview.atmosphere || []), ...(myReview.features || [])].slice(0, 5).map((tag, index) => (
            <Text key={index} style={{ 
              backgroundColor: '#E2E8F0', 
              paddingHorizontal: 8, 
              paddingVertical: 4, 
              borderRadius: 12, 
              fontSize: 12, 
              color: '#64748B',
              marginRight: 6,
              marginBottom: 4
            }}>
              #{tag}
            </Text>
          ))}
        </View>
        <Text style={{ color: '#B0B0B0', fontSize: 12 }}>
          {new Date(myReview.visit_date).toLocaleDateString('ko-KR')}
        </Text>
      </View>
    ))}

    {/* 다른 리뷰들 표시 */}
    {sortedReviews.filter(review => review.userId !== 'KOICA001').map((review, index) => (
      <View key={review.id} style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Image source={{ uri: review.userImage }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10 }} />
          <Text style={{ fontWeight: 'bold', color: '#1E293B' }}>{review.userName}</Text>
          <View style={{ flexDirection: 'row', marginLeft: 8 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= review.rating ? "star" : "star-outline"}
                size={16}
                color={star <= review.rating ? "#F59E0B" : "#CBD5E1"}
                style={{ marginRight: 2 }}
              />
            ))}
          </View>
        </View>
        {review.images && review.images.length > 0 && (
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            {review.images.slice(0, 3).map((image, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => navigation.navigate('PhotoGallery', { 
                  restaurant: restaurant,
                  images: review.images,
                  initialIndex: index
                })}
              >
                <Image 
                  source={{ uri: image }} 
                  style={{ width: 60, height: 60, borderRadius: 8, marginRight: 6 }} 
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
        <Text style={{ color: '#1E293B', fontSize: 15, marginBottom: 4 }}>
          {review.review_text}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
          {[...(review.food_types || []), ...(review.atmosphere || []), ...(review.features || [])].slice(0, 5).map((tag, index) => (
            <Text key={index} style={{ 
              backgroundColor: '#E2E8F0', 
              paddingHorizontal: 8, 
              paddingVertical: 4, 
              borderRadius: 12, 
              fontSize: 12, 
              color: '#64748B',
              marginRight: 6,
              marginBottom: 4
            }}>
              #{tag}
            </Text>
          ))}
        </View>
        <Text style={{ color: '#B0B0B0', fontSize: 12 }}>
          {new Date(review.visit_date).toLocaleDateString('ko-KR')}
        </Text>
      </View>
    ))}

    {/* 리뷰가 없을 때 */}
    {reviews.length === 0 && (
      <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 32, alignItems: 'center' }}>
        <Ionicons name="chatbubble-outline" size={48} color="#CBD5E1" />
        <Text style={{ color: '#64748B', fontSize: 16, marginTop: 12, textAlign: 'center' }}>
          아직 리뷰가 없습니다.{'\n'}첫 번째 리뷰를 작성해보세요!
        </Text>
        <TouchableOpacity 
          style={{ 
            backgroundColor: '#3B82F6', 
            paddingHorizontal: 20, 
            paddingVertical: 10, 
            borderRadius: 20, 
            marginTop: 16 
          }}
          onPress={handleWriteReview}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>리뷰 작성하기</Text>
        </TouchableOpacity>
      </View>
    )}
  </View>
  {/* 리뷰 영역 끝 */}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
      
      {/* 공유 모달 */}
      <Modal
        visible={shareModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShareModalVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end'
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            maxHeight: '80%',
            minHeight: 500
          }}>
            {/* 헤더 */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
              paddingBottom: 15,
              borderBottomWidth: 1,
              borderBottomColor: '#E2E8F0'
            }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1E293B' }}>
                공유하기
              </Text>
              <TouchableOpacity onPress={() => setShareModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            {/* 앱 내 채팅방 목록 */}
            <View style={{ marginBottom: 30, flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 12 }}>
                채팅방에 공유
              </Text>
              {isLoadingChats ? (
                <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 20 }} />
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
                  {chatRooms.map((chatRoom) => (
                    <TouchableOpacity
                      key={`${chatRoom.type}-${chatRoom.id}`}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        backgroundColor: '#F8FAFC',
                        borderRadius: 12,
                        marginBottom: 8
                      }}
                      onPress={() => handleShareToChat(chatRoom)}
                    >
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: '#3B82F6',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 12
                      }}>
                        <Ionicons 
                          name={chatRoom.type === 'dangolpot' ? 'heart-circle' : (chatRoom.is_from_match ? 'shuffle' : 'restaurant')} 
                          size={20} 
                          color="#fff" 
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E293B' }}>
                          {chatRoom.title}
                        </Text>
                        <Text style={{ fontSize: 14, color: '#64748B', marginTop: 2 }}>
                          {chatRoom.subtitle}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#CBD5E0" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
            
            {/* 외부 공유 버튼 */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 16,
                paddingHorizontal: 16,
                backgroundColor: '#F1F5F9',
                borderRadius: 12,
                marginBottom: 5
              }}
              onPress={handleShareExternal}
            >
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#10B981',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12
              }}>
                <Ionicons name="share-social-outline" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E293B' }}>
                  외부로 공유
                </Text>
                <Text style={{ fontSize: 14, color: '#64748B', marginTop: 2 }}>
                  카카오톡, 메시지 등으로 공유
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E0" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 식당 정보 수정/삭제 신청 모달 */}
      <RestaurantRequestModal
        visible={requestModalVisible}
        onClose={() => setRequestModalVisible(false)}
        onSubmit={() => {}}
        currentUser={{ employee_id: 'KOICA001', nickname: '테스트 사용자' }}
        prefilledRestaurant={restaurant}
        hideAddOption={true}
      />
    </>
  );
};

export default RestaurantDetail; 