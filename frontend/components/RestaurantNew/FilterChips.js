import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

const FilterChips = ({ 
  categories, 
  selectedCategories = [], 
  onCategorySelect, 
  onShowAll,
  colors 
}) => {
  const handleCategoryPress = (category) => {
    if (onCategorySelect) {
      onCategorySelect(category);
    }
  };

  const handleShowAllPress = () => {
    if (onShowAll) {
      onShowAll();
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 전체 보기 버튼 - 소통탭 스타일 */}
        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              backgroundColor: selectedCategories.length === 0 ? colors.primary : '#FFFFFF',
              borderColor: selectedCategories.length === 0 ? colors.primary : '#E5E7EB',
              elevation: selectedCategories.length === 0 ? 4 : 0,
              shadowColor: selectedCategories.length === 0 ? colors.primary : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: selectedCategories.length === 0 ? 0.3 : 0,
              shadowRadius: 4
            }
          ]}
          onPress={handleShowAllPress}
        >
          <Text style={[
            styles.filterText,
            { 
              color: selectedCategories.length === 0 ? '#FFFFFF' : colors.text,
              fontWeight: selectedCategories.length === 0 ? 'bold' : '600',
              fontSize: 14
            }
          ]}>
            전체
          </Text>
        </TouchableOpacity>

        {/* 카테고리 버튼들 - 소통탭 스타일 (다중 선택) */}
        {categories.map((category, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.filterButton,
              {
                backgroundColor: selectedCategories.includes(category) ? colors.primary : '#FFFFFF',
                borderColor: selectedCategories.includes(category) ? colors.primary : '#E5E7EB',
                elevation: selectedCategories.includes(category) ? 4 : 0,
                shadowColor: selectedCategories.includes(category) ? colors.primary : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: selectedCategories.includes(category) ? 0.3 : 0,
                shadowRadius: 4
              }
            ]}
            onPress={() => handleCategoryPress(category)}
          >
            <Text style={[
              styles.filterText,
              { 
                color: selectedCategories.includes(category) ? '#FFFFFF' : colors.text,
                fontWeight: selectedCategories.includes(category) ? 'bold' : '600',
                fontSize: 14
              }
            ]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingRight: 16,
  },
  // 소통탭과 동일한 필터 버튼 스타일
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default FilterChips;
