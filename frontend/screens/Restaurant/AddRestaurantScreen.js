import React, { useState } from 'react';
import {
    Text,
    View,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    Keyboard,
    Alert
} from 'react-native';
import { unifiedApiClient } from '../services/UnifiedApiClient';
// 컴포넌트
import SelectionModal from '../../components/common/SelectionModal';

export default function AddRestaurantScreen({ navigation, currentColors }) {
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [address, setAddress] = useState('');
    const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
    
    const CATEGORY_OPTIONS = ['한식', '중식', '일식', '양식', '분식', '카페', '아시안', '퓨전', '기타'];

    const handleSubmit = async () => {
        if (!name.trim() || !category || !address.trim()) {
            Alert.alert('입력 오류', '맛집 이름, 카테고리, 주소를 모두 입력해주세요.');
            return;
        }

        try {
            const response = await unifiedApiClient.get(/restaurants, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    category: category,
                    address: address.trim()
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                Alert.alert('성공', '새로운 맛집이 추가되었습니다.');
                navigation.goBack();
            } else {
                Alert.alert('오류', data.message || '맛집 추가에 실패했습니다.');
            }
        } catch (error) {
            Alert.alert('오류', '네트워크 요청 중 문제가 발생했습니다.');
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.formContainer}>
                <Text style={[styles.inputLabel, { color: currentColors.text }]}>맛집 이름 *</Text>
                <TextInput 
                    style={[styles.input, { 
                        backgroundColor: currentColors.surface,
                        color: currentColors.text,
                        borderColor: currentColors.border
                    }]} 
                    placeholder="예: 판교역 맛집" 
                    placeholderTextColor={currentColors.textSecondary}
                    value={name} 
                    onChangeText={setName}
                    returnKeyType="done"
                    onSubmitEditing={() => {
                        Keyboard.dismiss();
                    }}
                    blurOnSubmit={true}
                />
                
                <Text style={[styles.inputLabel, { color: currentColors.text }]}>카테고리 *</Text>
                <TouchableOpacity 
                    style={[styles.input, { 
                        backgroundColor: currentColors.surface,
                        borderColor: currentColors.border
                    }]} 
                    onPress={() => setCategoryModalVisible(true)}
                >
                    <Text style={category ? {color: currentColors.text} : {color: currentColors.textSecondary}}>
                        {category || '카테고리를 선택하세요'}
                    </Text>
                </TouchableOpacity>
                
                <Text style={[styles.inputLabel, { color: currentColors.text }]}>주소 *</Text>
                <TextInput 
                    style={[styles.input, { 
                        backgroundColor: currentColors.surface,
                        color: currentColors.text,
                        borderColor: currentColors.border
                    }]} 
                    placeholder="예: 경기도 성남시 분당구 판교역로 146" 
                    placeholderTextColor={currentColors.textSecondary}
                    value={address} 
                    onChangeText={setAddress}
                    returnKeyType="done"
                    onSubmitEditing={() => {
                        Keyboard.dismiss();
                    }}
                    blurOnSubmit={true}
                />
                
                <TouchableOpacity 
                    style={[styles.submitButton, { backgroundColor: currentColors.primary }]} 
                    onPress={handleSubmit}
                >
                    <Text style={[styles.submitButtonText, { color: currentColors.onPrimary }]}>
                        맛집 추가하기
                    </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={[styles.submitButton, { backgroundColor: currentColors.surfaceVariant, marginTop: 10 }]} 
                    onPress={() => navigation.goBack()}
                >
                    <Text style={[styles.submitButtonText, { color: currentColors.onSurfaceVariant }]}>
                        취소하기
                    </Text>
                </TouchableOpacity>
            </ScrollView>
            
            <SelectionModal 
                visible={isCategoryModalVisible} 
                title="카테고리 선택" 
                options={CATEGORY_OPTIONS} 
                selected={category} 
                onSelect={setCategory} 
                onClose={() => setCategoryModalVisible(false)} 
                styles={styles} 
                colors={currentColors} 
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    formContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        minHeight: 48,
    },
    submitButton: {
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 24,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
