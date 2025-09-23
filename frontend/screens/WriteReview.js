import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Dimensions,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { earnPoints, earnCategoryPoints } from '../utils/pointsManager';
import PointsAnimation from '../components/PointsAnimation';
import { useMission } from '../contexts/MissionContext';
import { RENDER_SERVER_URL } from '../config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 색상 테마
const COLORS = {
  primary: '#3B82F6',
  primaryLight: '#DBEAFE',
  secondary: '#64748B',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#1E293B',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  gray: '#94A3B8',
  disabled: '#CBD5E1',
  red: '#EF4444',
  green: '#10B981',
  yellow: '#F59E0B'
};

// 태그 옵션들
const ATMOSPHERE_TYPES = [
  '혼밥하기 좋아요', '데이트하기 좋아요', '단체모임', '가족모임', 
  '비즈니스 미팅', '친구 모임', '연인과 함께', '아이들과 함께',
  '조용한 분위기', '활기찬 분위기', '로맨틱한 분위기', '캐주얼한 분위기',
  '고급스러운 분위기', '힙한 분위기', '전통적인 분위기', '모던한 분위기',
  '야외 좌석', '창가 자리', '개별 좌석', '카운터 좌석', '테라스', '루프탑'
];
const FEATURE_TYPES = [
  '매운맛', '가성비', '고급스러운', '힙한', '전통적인', '깔끔한', '분위기 좋은', '친절한',
  '신선한 재료', '정갈한', '푸짐한', '맛있는', '특별한', '유명한', '숨겨진 맛집',
  '24시간 운영', '배달 가능', '포장 가능', '주차 가능', '와이파이', '콘센트',
  '반려동물 동반', '무료 리필', '양념 추가', '사이드 메뉴', '디저트', '음료',
  '조용한', '시끄러운', '밝은', '어두운', '넓은', '좁은', '깨끗한', '위생적인',
  '빠른 서비스', '느린 서비스', '친절한 서비스', '무관심한 서비스',
  '예약 필수', '예약 가능', '대기 시간', '즉시 입장'
];

const WriteReview = ({ route, navigation }) => {
  const { restaurant, onReviewSubmitted, editReview } = route.params || {};
  
  // MissionContext 사용
  const { handleActionCompletion } = useMission();
  
  // 상태 관리
  const [visitDate, setVisitDate] = useState(editReview ? new Date(editReview.visit_date) : new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [rating, setRating] = useState(editReview ? editReview.rating : 0);
  const [reviewText, setReviewText] = useState(editReview ? editReview.review_text : '');
  const [images, setImages] = useState(editReview ? editReview.images || [] : []);
  const [selectedAtmosphere, setSelectedAtmosphere] = useState(editReview ? editReview.atmosphere || [] : []);
  const [selectedFeatures, setSelectedFeatures] = useState(editReview ? editReview.features || [] : []);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);

  // 진행률 계산
  useEffect(() => {
    let completed = 0;
    if (visitDate) completed += 20;
    if (rating > 0) completed += 20;
    if (reviewText.trim().length > 0) completed += 20;
    if (images.length > 0) completed += 20;
    if (selectedAtmosphere.length > 0 || selectedFeatures.length > 0) completed += 20;
    setProgress(completed);
  }, [visitDate, rating, reviewText, images, selectedAtmosphere, selectedFeatures]);

  // 날짜 선택
  const onDayPress = (day) => {
    setVisitDate(new Date(day.timestamp));
    setShowCalendar(false);
  };

  // 별점 렌더링
  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= rating ? "star" : "star-outline"}
              size={32}
              color={star <= rating ? COLORS.yellow : COLORS.gray}
            />
          </TouchableOpacity>
        ))}
        {rating > 0 && <Text style={styles.ratingText}>{rating}.0점</Text>}
      </View>
    );
  };

  // 사진 선택
  const pickImage = async () => {
    if (images.length >= 5) {
      Alert.alert('알림', '최대 5장까지 업로드 가능합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  // 사진 삭제
  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // 태그 선택/해제
  const toggleTag = (tag, category) => {
    switch (category) {
      case 'atmosphere':
        setSelectedAtmosphere(prev => 
          prev.includes(tag) 
            ? prev.filter(t => t !== tag)
            : [...prev, tag]
        );
        break;
      case 'feature':
        setSelectedFeatures(prev => 
          prev.includes(tag) 
            ? prev.filter(t => t !== tag)
            : [...prev, tag]
        );
        break;
    }
  };

  // 태그 렌더링
  const renderTags = (tags, selectedTags, category) => {
    return (
      <View style={styles.tagsContainer}>
        {tags.map((tag) => (
          <TouchableOpacity
            key={tag}
            style={[
              styles.tagButton,
              selectedTags.includes(tag) && styles.tagButtonSelected
            ]}
            onPress={() => toggleTag(tag, category)}
          >
            <Text style={[
              styles.tagText,
              selectedTags.includes(tag) && styles.tagTextSelected
            ]}>
              {tag}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };



  // 취소
  const handleCancel = () => {
    Alert.alert(
      '작성 취소',
      '작성 중인 내용이 있습니다. 정말로 취소하시겠습니까?',
      [
        { text: '계속 작성', style: 'cancel' },
        { 
          text: '확인', 
          style: 'destructive',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  // 저장 (백엔드 API 사용)
  const handleSave = async () => {
    if (rating === 0) {
      Alert.alert('알림', '평점을 선택해주세요.');
      return;
    }
    if (reviewText.trim().length === 0) {
      Alert.alert('알림', '리뷰 내용을 작성해주세요.');
      return;
    }

    setIsLoading(true);
    
    try {
      const reviewData = {
        user_id: 'KOICA001',
        rating: rating,
        comment: reviewText,
        visit_date: visitDate.toISOString().split('T')[0] // YYYY-MM-DD 형식
      };

      const response = await fetch(`${RENDER_SERVER_URL}/api/v2/restaurants/${restaurant.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log(editReview ? '리뷰 수정 완료:' : '리뷰 저장 완료:', result.data);
          
          // 새 리뷰 작성 시에만 미션 달성 체크
          if (!editReview) {
            // 리뷰 작성 미션 달성
            handleActionCompletion('review_write');
            console.log('🔍 WriteReview - 리뷰 작성 미션 달성');
          }
          
          Alert.alert(
            editReview ? '수정 완료' : '저장 완료',
            editReview ? '리뷰가 성공적으로 수정되었습니다.' : '리뷰가 성공적으로 저장되었습니다.',
            [
              {
                text: '확인',
                onPress: () => {
                  if (onReviewSubmitted) {
                    onReviewSubmitted();
                  }
                  navigation.goBack();
                }
              }
            ]
          );
        } else {
          Alert.alert('오류', result.error || '리뷰 저장 중 오류가 발생했습니다.');
        }
      } else {
        Alert.alert('오류', '서버와의 통신 중 오류가 발생했습니다.');
      }
      
      // 포인트 획득 (새 리뷰 작성 시에만)
      if (!editReview) {
        let totalPoints = 0;
        
        // 기본 리뷰 작성 포인트
        const reviewPoints = await earnPoints('review_written', 20, '리뷰 작성');
        if (reviewPoints) totalPoints += 20;
        
        // 사진이 있으면 추가 포인트
        if (images.length > 0) {
          const photoPoints = await earnPoints('review_with_photo', 15, '사진과 함께 리뷰 작성');
          if (photoPoints) totalPoints += 15;
        }
        
        
        // 포인트 애니메이션 표시
        if (totalPoints > 0) {
          setEarnedPoints(totalPoints);
          setShowPointsAnimation(true);
        }
      }
      
      // 콜백 호출
      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
    } catch (error) {
      console.error('리뷰 저장 오류:', error);
      Alert.alert('오류', '리뷰 저장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 포인트 애니메이션 */}
      <PointsAnimation
        points={earnedPoints}
        visible={showPointsAnimation}
        onComplete={() => setShowPointsAnimation(false)}
      />
      
      {/* 진행률 바 */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{progress}% 완료</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 1. 기본 정보 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기본 정보</Text>
          
          {/* 식당명 */}
          <View style={styles.infoRow}>
            <Text style={styles.label}>식당명</Text>
            <Text style={styles.restaurantName}>{restaurant?.name || '식당명'}</Text>
          </View>

          {/* 방문 날짜 */}
          <View style={styles.infoRow}>
            <Text style={styles.label}>방문 날짜</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowCalendar(true)}
            >
              <Text style={styles.dateText}>
                {visitDate.toLocaleDateString('ko-KR')}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. 평점 시스템 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>평점</Text>
          {renderStars()}
        </View>

        {/* 3. 리뷰 내용 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>리뷰 내용</Text>
          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="이 식당에 대한 솔직한 리뷰를 작성해주세요..."
              placeholderTextColor={COLORS.textSecondary}
              value={reviewText}
              onChangeText={setReviewText}
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>
              {reviewText.length}/500
            </Text>
          </View>
        </View>

        {/* 4. 사진 업로드 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>사진 업로드 ({images.length}/5)</Text>
          
          <View style={styles.imageGrid}>
            {images.map((image, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri: image }} style={styles.image} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={24} color={COLORS.red} />
                </TouchableOpacity>
              </View>
            ))}
            
            {images.length < 5 && (
              <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
                <Ionicons name="camera-outline" size={32} color={COLORS.primary} />
                <Text style={styles.addImageText}>사진 추가</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>


        <View style={styles.section}>
          <Text style={styles.sectionTitle}>분위기</Text>
          {renderTags(ATMOSPHERE_TYPES, selectedAtmosphere, 'atmosphere')}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>특징</Text>
          {renderTags(FEATURE_TYPES, selectedFeatures, 'feature')}
        </View>
      </ScrollView>

      {/* 하단 버튼들 */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity 
          style={[styles.button, styles.cancelButton]} 
          onPress={handleCancel}
        >
          <Text style={styles.cancelButtonText}>취소</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.saveButton]} 
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>저장하기</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 캘린더 모달 */}
      <Modal
        visible={showCalendar}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarModal}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>방문 날짜 선택</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <Calendar
              current={visitDate.toISOString().split('T')[0]}
              onDayPress={onDayPress}
              markedDates={{
                [visitDate.toISOString().split('T')[0]]: {
                  selected: true,
                  selectedColor: COLORS.primary,
                }
              }}
              maxDate={new Date().toISOString().split('T')[0]}
              theme={{
                selectedDayBackgroundColor: COLORS.primary,
                selectedDayTextColor: '#ffffff',
                todayTextColor: COLORS.primary,
                dayTextColor: COLORS.text,
                textDisabledColor: COLORS.gray,
                arrowColor: COLORS.primary,
                monthTextColor: COLORS.text,
                indicatorColor: COLORS.primary,
                textDayFontWeight: '300',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '300',
                textDayFontSize: 16,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 13
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },

  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  restaurantName: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dateText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
    marginRight: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    paddingLeft: 20,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
    marginLeft: 12,
  },
  textInputContainer: {
    position: 'relative',
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageContainer: {
    position: 'relative',
    width: (SCREEN_WIDTH - 80) / 3,
    height: (SCREEN_WIDTH - 80) / 3,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  addImageButton: {
    width: (SCREEN_WIDTH - 80) / 3,
    height: (SCREEN_WIDTH - 80) / 3,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tagText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  tagTextSelected: {
    color: COLORS.surface,
    fontWeight: '500',
  },
  bottomButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.surface,
  },
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModal: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    margin: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
});

export default WriteReview; 