import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Alert
} from 'react-native';
import { Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../../../../components/common/Colors';
import { RENDER_SERVER_URL } from '../../../../components/common/Utils';

const RestaurantSelectionModal = ({
    visible,
    onClose,
    onSelectRestaurant,
    currentColors = COLORS.light
}) => {
    const [restaurantSearchQuery, setRestaurantSearchQuery] = useState('');
    const [restaurantSuggestions, setRestaurantSuggestions] = useState([]);
    const [frequentRestaurants, setFrequentRestaurants] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [sortBy, setSortBy] = useState('name');
    const [allRestaurants, setAllRestaurants] = useState([]);
    const [displayedRestaurants, setDisplayedRestaurants] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const ITEMS_PER_PAGE = 50;

    // 식당 검색 함수
    const searchRestaurants = useCallback(async (query, page = 1) => {
        if (!query.trim()) {
            setRestaurantSuggestions([]);
            return;
        }

        try {
            setIsSearching(true);
            setSearchError(null);

            const response = await unifiedApiClient.get(/dev/restaurants?search=${encodeURIComponent(query)}&page=${page}&limit=${ITEMS_PER_PAGE}&sort=${sortBy});
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (page === 1) {
                setAllRestaurants(data.restaurants || []);
                setDisplayedRestaurants(data.restaurants || []);
            } else {
                setAllRestaurants(prev => [...prev, ...(data.restaurants || [])]);
                setDisplayedRestaurants(prev => [...prev, ...(data.restaurants || [])]);
            }
            
            setTotalCount(data.total || 0);
            setHasMore((data.restaurants || []).length === ITEMS_PER_PAGE);
            setCurrentPage(page);
            
        } catch (error) {
            console.error('식당 검색 실패:', error);
            setSearchError('식당 검색 중 오류가 발생했습니다.');
            setRestaurantSuggestions([]);
        } finally {
            setIsSearching(false);
            setIsLoadingMore(false);
        }
    }, [sortBy, ITEMS_PER_PAGE]);

    // 자주 가는 식당 로드
    const loadFrequentRestaurants = useCallback(async () => {
        try {
            const response = await unifiedApiClient.get(/dev/restaurants?limit=10);
            if (response.ok) {
                const data = await response.json();
                setFrequentRestaurants(data.restaurants || []);
            }
        } catch (error) {
            console.error('자주 가는 식당 로드 실패:', error);
        }
    }, []);

    useEffect(() => {
        if (visible) {
            loadFrequentRestaurants();
        }
    }, [visible, loadFrequentRestaurants]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (restaurantSearchQuery.trim()) {
                searchRestaurants(restaurantSearchQuery, 1);
            } else {
                setAllRestaurants([]);
                setDisplayedRestaurants([]);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [restaurantSearchQuery, searchRestaurants]);

    const handleLoadMore = () => {
        if (!isLoadingMore && hasMore && restaurantSearchQuery.trim()) {
            setIsLoadingMore(true);
            searchRestaurants(restaurantSearchQuery, currentPage + 1);
        }
    };

    const handleSelectRestaurant = (restaurant) => {
        onSelectRestaurant(restaurant);
        onClose();
    };

    const renderRestaurantItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.restaurantItem, { backgroundColor: currentColors.surface }]}
            onPress={() => handleSelectRestaurant(item)}
        >
            <View style={styles.restaurantInfo}>
                <Text style={[styles.restaurantName, { color: currentColors.text }]}>
                    {item.name}
                </Text>
                <Text style={[styles.restaurantAddress, { color: currentColors.textSecondary }]}>
                    {item.address}
                </Text>
                {item.category && (
                    <Text style={[styles.restaurantCategory, { color: currentColors.primary }]}>
                        {item.category}
                    </Text>
                )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={currentColors.textSecondary} />
        </TouchableOpacity>
    );

    const renderFooter = () => {
        if (!isLoadingMore) return null;
        return (
            <View style={styles.loadingFooter}>
                <ActivityIndicator size="small" color={currentColors.primary} />
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { backgroundColor: currentColors.background }]}>
                {/* 헤더 */}
                <View style={[styles.header, { backgroundColor: currentColors.surface, borderBottomColor: currentColors.border }]}>
                    <TouchableOpacity onPress={onClose} style={styles.headerButton}>
                        <Ionicons name="close" size={24} color={currentColors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: currentColors.text }]}>
                        식당 선택
                    </Text>
                    <View style={styles.headerButton} />
                </View>

                {/* 검색 입력 */}
                <View style={[styles.searchContainer, { backgroundColor: currentColors.surface, borderBottomColor: currentColors.border }]}>
                    <View style={[styles.searchInputContainer, { backgroundColor: currentColors.background, borderColor: currentColors.border }]}>
                        <Ionicons name="search" size={20} color={currentColors.textSecondary} />
                        <TextInput
                            style={[styles.searchInput, { color: currentColors.text }]}
                            placeholder="식당명으로 검색..."
                            placeholderTextColor={currentColors.textSecondary}
                            value={restaurantSearchQuery}
                            onChangeText={setRestaurantSearchQuery}
                        />
                        {isSearching && (
                            <ActivityIndicator size="small" color={currentColors.primary} />
                        )}
                    </View>
                </View>

                {/* 정렬 옵션 */}
                <View style={[styles.sortContainer, { backgroundColor: currentColors.surface, borderBottomColor: currentColors.border }]}>
                    <TouchableOpacity
                        style={[styles.sortButton, sortBy === 'name' && { backgroundColor: currentColors.primary }]}
                        onPress={() => setSortBy('name')}
                    >
                        <Text style={[styles.sortButtonText, { color: sortBy === 'name' ? '#fff' : currentColors.text }]}>
                            이름순
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.sortButton, sortBy === 'distance' && { backgroundColor: currentColors.primary }]}
                        onPress={() => setSortBy('distance')}
                    >
                        <Text style={[styles.sortButtonText, { color: sortBy === 'distance' ? '#fff' : currentColors.text }]}>
                            거리순
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.sortButton, sortBy === 'rating' && { backgroundColor: currentColors.primary }]}
                        onPress={() => setSortBy('rating')}
                    >
                        <Text style={[styles.sortButtonText, { color: sortBy === 'rating' ? '#fff' : currentColors.text }]}>
                            평점순
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* 식당 목록 */}
                <FlatList
                    data={restaurantSearchQuery.trim() ? displayedRestaurants : frequentRestaurants}
                    renderItem={renderRestaurantItem}
                    keyExtractor={(item) => item.id.toString()}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.1}
                    ListFooterComponent={renderFooter}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="restaurant-outline" size={48} color={currentColors.textSecondary} />
                            <Text style={[styles.emptyText, { color: currentColors.textSecondary }]}>
                                {restaurantSearchQuery.trim() ? '검색 결과가 없습니다' : '자주 가는 식당이 없습니다'}
                            </Text>
                        </View>
                    }
                    style={styles.list}
                />

                {searchError && (
                    <View style={styles.errorContainer}>
                        <Text style={[styles.errorText, { color: currentColors.error }]}>
                            {searchError}
                        </Text>
                    </View>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
    },
    sortContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
    },
    sortButton: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
    },
    sortButtonText: {
        fontSize: 14,
        fontWeight: '500',
    },
    list: {
        flex: 1,
    },
    restaurantItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    restaurantInfo: {
        flex: 1,
    },
    restaurantName: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 2,
    },
    restaurantAddress: {
        fontSize: 14,
        marginBottom: 2,
    },
    restaurantCategory: {
        fontSize: 12,
        fontWeight: '500',
    },
    loadingFooter: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 12,
    },
    errorContainer: {
        padding: 16,
        alignItems: 'center',
    },
    errorText: {
        fontSize: 14,
    },
});

export default RestaurantSelectionModal;
