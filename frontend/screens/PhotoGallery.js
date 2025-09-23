import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const PhotoGallery = ({ route, navigation }) => {
  const { restaurant, images, initialIndex = 0 } = route.params;
  const [allImages, setAllImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    // 이미지 설정
    if (images && images.length > 0) {
      // 전달받은 이미지 배열 사용 (리뷰 사진 클릭 시)
      setAllImages(images);
    } else {
      // 리뷰에서 모든 사진 가져오기 (+더보기 버튼 클릭 시)
      const fetchAllImages = async () => {
        try {
          const storedReviews = await AsyncStorage.getItem(`reviews_${restaurant.id}`);
          if (storedReviews) {
            const parsedReviews = JSON.parse(storedReviews);
            const allImages = [];
            
            parsedReviews.forEach(review => {
              if (review.images && review.images.length > 0) {
                allImages.push(...review.images);
              }
            });
            
            setAllImages(allImages);
          }
        } catch (error) {
          console.error('사진 불러오기 오류:', error);
        }
      };

      fetchAllImages();
    }
  }, [restaurant.id, images]);

  const handleImagePress = (index) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < allImages.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const onGestureEvent = (event) => {
    const { translationX, state } = event.nativeEvent;
    
    // 제스처가 끝났을 때만 이미지 변경
    if (state === State.END) {
      // 스와이프 감지 (50px 이상 이동 시)
      if (Math.abs(translationX) > 50) {
        if (translationX > 0 && currentIndex > 0) {
          // 오른쪽으로 스와이프 (이전 이미지)
          setCurrentIndex(currentIndex - 1);
        } else if (translationX < 0 && currentIndex < allImages.length - 1) {
          // 왼쪽으로 스와이프 (다음 이미지)
          setCurrentIndex(currentIndex + 1);
        }
      }
    }
  };

  if (allImages.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{restaurant.name}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="image-outline" size={64} color="#adb5bd" />
          <Text style={styles.emptyText}>등록된 사진이 없습니다</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        
        {/* 메인 이미지 */}
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onGestureEvent}
        >
          <View style={styles.mainImageContainer}>
            <Image
              source={{ uri: allImages[currentIndex] }}
              style={styles.mainImage}
              resizeMode="contain"
            />
            
            {/* 이전/다음 버튼 */}
            {currentIndex > 0 && (
              <TouchableOpacity style={[styles.navButton, styles.prevButton]} onPress={goToPrevious}>
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>
            )}
            
            {currentIndex < allImages.length - 1 && (
              <TouchableOpacity style={[styles.navButton, styles.nextButton]} onPress={goToNext}>
                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </TouchableOpacity>
            )}

            {/* 이미지 카운터 */}
            <View style={styles.counterContainer}>
              <Text style={styles.counterText}>
                {currentIndex + 1} / {allImages.length}
              </Text>
            </View>
          </View>
        </PanGestureHandler>

        {/* 썸네일 목록 */}
        <View style={styles.thumbnailContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {allImages.map((image, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleImagePress(index)}
                style={[
                  styles.thumbnail,
                  index === currentIndex && styles.activeThumbnail
                ]}
              >
                <Image
                  source={{ uri: image }}
                  style={styles.thumbnailImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  mainImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mainImage: {
    width: width,
    height: height * 0.7,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevButton: {
    left: 16,
  },
  nextButton: {
    right: 16,
  },
  counterContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  counterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  thumbnailContainer: {
    height: 100,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  thumbnail: {
    width: 80,
    height: 80,
    marginHorizontal: 4,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeThumbnail: {
    borderColor: '#3B82F6',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#adb5bd',
    fontSize: 16,
    marginTop: 16,
  },
});

export default PhotoGallery; 