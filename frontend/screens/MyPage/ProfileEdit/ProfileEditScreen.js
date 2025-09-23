import React, { useState, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, SafeAreaView, ScrollView, TextInput, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../utils/commonStyles';

const ProfileEditScreen = ({ navigation }) => {
    const [nickname, setNickname] = useState('');
    const [lunchPreference, setLunchPreference] = useState([]);
    const [mainDishGenre, setMainDishGenre] = useState([]);
    const [allergies, setAllergies] = useState([]);
    const [preferredTime, setPreferredTime] = useState('');
    const [notificationPreferences, setNotificationPreferences] = useState([]);
    
    const [isPreferenceModalVisible, setPreferenceModalVisible] = useState(false);
    const [isGenreModalVisible, setGenreModalVisible] = useState(false);
    const [isAllergiesModalVisible, setAllergiesModalVisible] = useState(false);
    const [isTimeModalVisible, setTimeModalVisible] = useState(false);
    const [isNotificationModalVisible, setNotificationModalVisible] = useState(false);
    
    const LUNCH_PREFERENCE_OPTIONS = ['가성비 좋은 곳', '맛집 탐방', '건강한 식사', '빠른 식사', '새로운 메뉴 도전', '친구들과 함께', '혼자 조용히', '분위기 좋은 곳'];
    const MAIN_DISH_GENRE_OPTIONS = ['한식', '중식', '일식', '양식', '분식', '카페', '패스트푸드'];
    const ALLERGIES_OPTIONS = ['없음', '갑각류', '견과류', '우유', '계란', '밀', '대두', '생선'];
    const TIME_OPTIONS = ['11:30', '12:00', '12:30', '13:00', '13:30'];
    const NOTIFICATION_OPTIONS = ['새로운 파티 초대', '친구 요청', '점심 시간 알림', '맛집 추천'];

    const currentColors = global.currentColors || COLORS.light;

    useFocusEffect(useCallback(() => { 
        const loadUserData = async () => {
            try {
                const userResponse = await fetch(`${global.RENDER_SERVER_URL}/users/${global.myEmployeeId}`);
                const userData = await userResponse.json();
                
                setNickname(userData.nickname || ''); 
                setLunchPreference((userData.lunch_preference || '').split(',').filter(Boolean)); 
                setMainDishGenre((userData.main_dish_genre || '').split(',').filter(Boolean));
                
                const preferencesResponse = await fetch(`${global.RENDER_SERVER_URL}/users/${global.myEmployeeId}/preferences`);
                if (preferencesResponse.ok) {
                    const preferencesData = await preferencesResponse.json();
                    setAllergies(preferencesData.allergies || []);
                    setPreferredTime(preferencesData.preferredTime || '');
                    setNotificationPreferences(preferencesData.notifications || []);
                }
            } catch (error) {
                console.error('사용자 정보 로드 실패:', error);
            }
        };
        
        loadUserData();
    }, []));

    const handleSaveProfile = async () => {
        try {
            await fetch(`${global.RENDER_SERVER_URL}/users/${global.myEmployeeId}`, { 
                method: 'PUT', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ 
                    nickname, 
                    lunch_preference: lunchPreference.join(','), 
                    main_dish_genre: mainDishGenre.join(',') 
                }) 
            });
            
            await fetch(`${global.RENDER_SERVER_URL}/users/${global.myEmployeeId}/preferences`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    allergies,
                    preferredTime,
                    frequentAreas: [],
                    notifications: notificationPreferences
                })
            });
            
            Alert.alert("저장 완료", "프로필이 업데이트되었습니다.");
            navigation.goBack();
        } catch (error) {
            console.error('프로필 저장 실패:', error);
            Alert.alert("오류", "프로필 저장에 실패했습니다.");
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: currentColors.background }}>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: currentColors.text, marginBottom: 8 }}>닉네임</Text>
                <TextInput 
                    style={{ 
                        borderWidth: 1, 
                        borderColor: currentColors.lightGray, 
                        borderRadius: 8, 
                        padding: 12, 
                        marginBottom: 20,
                        backgroundColor: currentColors.white,
                        color: currentColors.text
                    }} 
                    placeholderTextColor={currentColors.gray} 
                    value={nickname} 
                    onChangeText={setNickname} 
                />
                
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: currentColors.text, marginBottom: 8 }}>점심 성향 (최대 3개)</Text>
                <TouchableOpacity 
                    style={{ 
                        borderWidth: 1, 
                        borderColor: currentColors.lightGray, 
                        borderRadius: 8, 
                        padding: 12, 
                        marginBottom: 20,
                        backgroundColor: currentColors.white
                    }} 
                    onPress={() => setPreferenceModalVisible(true)}
                >
                    <Text style={lunchPreference.length > 0 ? { color: currentColors.text } : { color: currentColors.gray }}>
                        {lunchPreference.length > 0 ? lunchPreference.join(', ') : "점심 성향 선택"}
                    </Text>
                </TouchableOpacity>
                
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: currentColors.text, marginBottom: 8 }}>주종목 (최대 3개)</Text>
                <TouchableOpacity 
                    style={{ 
                        borderWidth: 1, 
                        borderColor: currentColors.lightGray, 
                        borderRadius: 8, 
                        padding: 12, 
                        marginBottom: 20,
                        backgroundColor: currentColors.white
                    }} 
                    onPress={() => setGenreModalVisible(true)}
                >
                    <Text style={mainDishGenre.length > 0 ? { color: currentColors.text } : { color: currentColors.gray }}>
                        {mainDishGenre.length > 0 ? mainDishGenre.join(', ') : "주종목 선택"}
                    </Text>
                </TouchableOpacity>
                
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: currentColors.text, marginBottom: 8 }}>알레르기 정보 (최대 3개)</Text>
                <TouchableOpacity 
                    style={{ 
                        borderWidth: 1, 
                        borderColor: currentColors.lightGray, 
                        borderRadius: 8, 
                        padding: 12, 
                        marginBottom: 20,
                        backgroundColor: currentColors.white
                    }} 
                    onPress={() => setAllergiesModalVisible(true)}
                >
                    <Text style={allergies.length > 0 ? { color: currentColors.text } : { color: currentColors.gray }}>
                        {allergies.length > 0 ? allergies.join(', ') : "알레르기 정보 선택"}
                    </Text>
                </TouchableOpacity>
                
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: currentColors.text, marginBottom: 8 }}>선호 시간대</Text>
                <TouchableOpacity 
                    style={{ 
                        borderWidth: 1, 
                        borderColor: currentColors.lightGray, 
                        borderRadius: 8, 
                        padding: 12, 
                        marginBottom: 20,
                        backgroundColor: currentColors.white
                    }} 
                    onPress={() => setTimeModalVisible(true)}
                >
                    <Text style={preferredTime ? { color: currentColors.text } : { color: currentColors.gray }}>
                        {preferredTime || "선호 시간대 선택"}
                    </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={{ 
                        backgroundColor: currentColors.primary, 
                        padding: 15, 
                        borderRadius: 8, 
                        alignItems: 'center',
                        marginTop: 20
                    }} 
                    onPress={handleSaveProfile}
                >
                    <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }}>프로필 저장</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

export default ProfileEditScreen;
