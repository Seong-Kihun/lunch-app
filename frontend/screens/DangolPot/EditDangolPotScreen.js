import React, { useState } from 'react';
import {
    Text,
    View,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    Alert,
    Keyboard
} from 'react-native';
import appService from '../services/AppService'// 컴포넌트
import SelectionModal from '../../components/common/SelectionModal';

export default function EditDangolPotScreen({ route, navigation, currentColors, currentUser }) {
    const { potData } = route.params;
    const [name, setName] = useState(potData.name);
    const [description, setDescription] = useState(potData.description);
    const [tags, setTags] = useState(potData.tags);
    const [category, setCategory] = useState(potData.category);
    const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
    const CATEGORY_OPTIONS = ['운동', '독서', '게임', '음악', '영화', '여행', '요리', '기타'];

    const handleUpdate = async () => {
        if (!name.trim() || !category) {
            Alert.alert('입력 오류', '단골파티 이름과 카테고리는 필수입니다.');
            return;
        }

        try {
            const response = await appService./dangolpots/${potData.id}, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim(),
                    tags: tags.trim(),
                    category: category,
                    employee_id: currentUser?.employee_id || '1'
                })
            });

            if (response.ok) {
                Alert.alert('성공', '단골파티 정보가 수정되었습니다!');
                navigation.goBack();
            } else {
                Alert.alert('오류', '단골파티 수정에 실패했습니다.');
            }
        } catch (error) {
            Alert.alert('오류', '네트워크 요청 중 문제가 발생했습니다.');
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.formContainer}>
                <Text style={[styles.title, { color: currentColors.text }]}>단골파티 수정</Text>
                
                <Text style={[styles.inputLabel, { color: currentColors.text }]}>단골파티 이름 *</Text>
                <TextInput
                    style={[styles.input, {
                        backgroundColor: currentColors.surface,
                        color: currentColors.text,
                        borderColor: currentColors.border
                    }]}
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
                    <Text style={category ? { color: currentColors.text } : { color: currentColors.textSecondary }}>
                        {category || "카테고리 선택"}
                    </Text>
                </TouchableOpacity>
                
                <Text style={[styles.inputLabel, { color: currentColors.text }]}>소개</Text>
                <TextInput
                    style={[styles.textArea, {
                        backgroundColor: currentColors.surface,
                        color: currentColors.text,
                        borderColor: currentColors.border
                    }]}
                    placeholder="어떤 모임인지 소개해주세요"
                    placeholderTextColor={currentColors.textSecondary}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    returnKeyType="done"
                    onSubmitEditing={() => {
                        Keyboard.dismiss();
                    }}
                    blurOnSubmit={true}
                />
                
                <Text style={[styles.inputLabel, { color: currentColors.text }]}>관심사 태그</Text>
                <TextInput
                    style={[styles.input, {
                        backgroundColor: currentColors.surface,
                        color: currentColors.text,
                        borderColor: currentColors.border
                    }]}
                    placeholder="예: #운동 #건강 #친목"
                    placeholderTextColor={currentColors.textSecondary}
                    value={tags}
                    onChangeText={setTags}
                    returnKeyType="done"
                    onSubmitEditing={() => {
                        Keyboard.dismiss();
                    }}
                    blurOnSubmit={true}
                />
                
                <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: currentColors.primary }]}
                    onPress={handleUpdate}
                >
                    <Text style={[styles.submitButtonText, { color: currentColors.onPrimary }]}>
                        수정하기
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
            </ScrollView>
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
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 24,
        textAlign: 'center',
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
    textArea: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        minHeight: 100,
        textAlignVertical: 'top',
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
