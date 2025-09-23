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
import { apiClient } from '../../../../utils/apiClient';

const AttendeeSelectionModal = ({
    visible,
    onClose,
    onSelectAttendees,
    selectedAttendees = [],
    currentColors = COLORS.light
}) => {
    const [friends, setFriends] = useState([]);
    const [frequentFriends, setFrequentFriends] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoadingFriends, setIsLoadingFriends] = useState(false);
    const [friendsError, setFriendsError] = useState(null);
    const [tempSelectedAttendees, setTempSelectedAttendees] = useState(selectedAttendees);

    // 친구 목록 가져오기
    const fetchFriends = useCallback(async () => {
        try {
            setIsLoadingFriends(true);
            setFriendsError(null);
            
            const currentUserId = global.myEmployeeId || '1';
            
            if (searchQuery.trim()) {
                // 검색 시: 전체 가상 유저 가져오기
                const allUsersResponse = await fetch(`${RENDER_SERVER_URL}/dev/users`);
                if (allUsersResponse.ok) {
                    const allUsers = await allUsersResponse.json();
                    setFriends(allUsers);
                } else {
                    throw new Error('전체 유저 API 응답 오류');
                }
            } else {
                // 기본 표시 시: 친구 관계만 가져오기
                const friendsResponse = await apiClient.get(`${RENDER_SERVER_URL}/dev/friends/${currentUserId}`);
                
                if (friendsResponse.ok) {
                    const responseData = await friendsResponse.json();
                    // API 응답에서 friends 배열 추출
                    const friends = responseData.friends || responseData;
                    setFriends(Array.isArray(friends) ? friends : []);
                } else {
                    throw new Error('친구 관계 API 응답 오류');
                }
            }
        } catch (error) {
            console.error('친구 목록 조회 실패:', error);
            setFriends([]);
            setFriendsError('친구 목록을 불러올 수 없습니다.');
        } finally {
            setIsLoadingFriends(false);
        }
    }, [searchQuery]);

    // 자주 함께하는 친구 로드
    const loadFrequentFriends = useCallback(async () => {
        try {
            const currentUserId = global.myEmployeeId || '1';
            const response = await apiClient.get(`${RENDER_SERVER_URL}/dev/frequent-friends/${currentUserId}`);
            if (response.ok) {
                const data = await response.json();
                setFrequentFriends(data.friends || []);
            }
        } catch (error) {
            console.error('자주 함께하는 친구 로드 실패:', error);
        }
    }, []);

    useEffect(() => {
        if (visible) {
            setTempSelectedAttendees(selectedAttendees);
            loadFrequentFriends();
        }
    }, [visible, selectedAttendees, loadFrequentFriends]);

    useEffect(() => {
        fetchFriends();
    }, [fetchFriends]);

    const toggleAttendee = (friend) => {
        setTempSelectedAttendees(prev => {
            const isSelected = prev.some(attendee => attendee.employee_id === friend.employee_id);
            if (isSelected) {
                return prev.filter(attendee => attendee.employee_id !== friend.employee_id);
            } else {
                return [...prev, friend];
            }
        });
    };

    const handleConfirm = () => {
        onSelectAttendees(tempSelectedAttendees);
        onClose();
    };

    const isSelected = (friend) => {
        return tempSelectedAttendees.some(attendee => attendee.employee_id === friend.employee_id);
    };

    const renderFriendItem = ({ item }) => {
        const selected = isSelected(item);
        
        return (
            <TouchableOpacity
                style={[
                    styles.friendItem,
                    { backgroundColor: currentColors.surface },
                    selected && { backgroundColor: currentColors.primary + '20' }
                ]}
                onPress={() => toggleAttendee(item)}
            >
                <View style={styles.friendInfo}>
                    <View style={[styles.avatar, { backgroundColor: currentColors.primary }]}>
                        <Text style={[styles.avatarText, { color: '#fff' }]}>
                            {item.nickname ? item.nickname.charAt(0) : '?'}
                        </Text>
                    </View>
                    <View style={styles.friendDetails}>
                        <Text style={[styles.friendName, { color: currentColors.text }]}>
                            {item.nickname || '알 수 없음'}
                        </Text>
                        <Text style={[styles.friendId, { color: currentColors.textSecondary }]}>
                            {item.employee_id}
                        </Text>
                    </View>
                </View>
                <View style={[
                    styles.checkbox,
                    { borderColor: currentColors.primary },
                    selected && { backgroundColor: currentColors.primary }
                ]}>
                    {selected && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const filteredFriends = searchQuery.trim() 
        ? friends.filter(friend => 
            friend.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            friend.employee_id?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : friends;

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
                        참석자 선택 ({tempSelectedAttendees.length}명)
                    </Text>
                    <TouchableOpacity onPress={handleConfirm} style={styles.headerButton}>
                        <Text style={[styles.confirmButton, { color: currentColors.primary }]}>
                            완료
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* 검색 입력 */}
                <View style={[styles.searchContainer, { backgroundColor: currentColors.surface, borderBottomColor: currentColors.border }]}>
                    <View style={[styles.searchInputContainer, { backgroundColor: currentColors.background, borderColor: currentColors.border }]}>
                        <Ionicons name="search" size={20} color={currentColors.textSecondary} />
                        <TextInput
                            style={[styles.searchInput, { color: currentColors.text }]}
                            placeholder="친구 검색..."
                            placeholderTextColor={currentColors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {isLoadingFriends && (
                            <ActivityIndicator size="small" color={currentColors.primary} />
                        )}
                    </View>
                </View>

                {/* 자주 함께하는 친구 섹션 */}
                {!searchQuery.trim() && frequentFriends.length > 0 && (
                    <View style={[styles.sectionContainer, { backgroundColor: currentColors.surface, borderBottomColor: currentColors.border }]}>
                        <Text style={[styles.sectionTitle, { color: currentColors.text }]}>
                            자주 함께하는 친구
                        </Text>
                        <FlatList
                            data={frequentFriends}
                            renderItem={renderFriendItem}
                            keyExtractor={(item) => item.employee_id}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.horizontalList}
                        />
                    </View>
                )}

                {/* 친구 목록 */}
                <FlatList
                    data={filteredFriends}
                    renderItem={renderFriendItem}
                    keyExtractor={(item) => item.employee_id}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="people-outline" size={48} color={currentColors.textSecondary} />
                            <Text style={[styles.emptyText, { color: currentColors.textSecondary }]}>
                                {searchQuery.trim() ? '검색 결과가 없습니다' : '친구가 없습니다'}
                            </Text>
                        </View>
                    }
                    style={styles.list}
                />

                {friendsError && (
                    <View style={styles.errorContainer}>
                        <Text style={[styles.errorText, { color: currentColors.error }]}>
                            {friendsError}
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
        minWidth: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    confirmButton: {
        fontSize: 16,
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
    sectionContainer: {
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    horizontalList: {
        paddingLeft: 16,
    },
    list: {
        flex: 1,
    },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    friendInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '600',
    },
    friendDetails: {
        flex: 1,
    },
    friendName: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 2,
    },
    friendId: {
        fontSize: 14,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
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

export default AttendeeSelectionModal;
