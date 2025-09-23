import React from 'react';
import { Text, View, TouchableOpacity, Pressable, ScrollView, Alert } from 'react-native';
import { Modal } from 'react-native';
import { basicStyles } from '../../theme/basicStyles';

export const SelectionModal = ({ visible, title, options, selected, onSelect, onClose, isMultiSelect = false, styles = basicStyles, colors }) => {
    const handleSelect = (item) => {
        if (isMultiSelect) {
            let newSelected = [...selected];
            if (newSelected.includes(item)) {
                newSelected = newSelected.filter(i => i !== item);
            } else if (newSelected.length < 3) {
                newSelected.push(item);
            } else {
                Alert.alert("선택 제한", "최대 3개까지 선택할 수 있습니다.");
            }
            onSelect(newSelected);
        } else {
            onSelect(item);
            onClose();
        }
    };
    
    return (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.centeredView} onPress={onClose}>
                <Pressable style={styles.modalView}>
                    <Text style={styles.modalTitle}>{title}</Text>
                    <ScrollView 
                        style={{width: '100%', maxHeight: 300}}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{paddingBottom: 10}}
                    >
                        {options.map(item => (
                            <TouchableOpacity key={item} style={[styles.optionButton, (isMultiSelect ? selected.includes(item) : selected === item) && styles.optionButtonSelected]} onPress={() => handleSelect(item)}>
                                <Text style={[styles.optionButtonText, (isMultiSelect ? selected.includes(item) : selected === item) && styles.optionButtonTextSelected]}>{item}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    {isMultiSelect && <Pressable style={[styles.button, styles.buttonClose]} onPress={onClose}><Text style={styles.textStyleBlack}>선택 완료</Text></Pressable>}
                </Pressable>
            </Pressable>
        </Modal>
    );
};

/**
 * 숫자 스크롤러 컴포넌트
 * 2명부터 10명까지 선택 가능
 */
export const NumberScroller = ({ onSelect, initialValue = 4, styles }) => {
    const numbers = Array.from({ length: 9 }, (_, i) => i + 2); // 2 to 10
    const scrollViewRef = React.useRef(null);

    React.useEffect(() => {
        const initialIndex = numbers.indexOf(initialValue);
        if (initialIndex !== -1 && scrollViewRef.current) {
            setTimeout(() => scrollViewRef.current.scrollTo({ y: initialIndex * 50, animated: false }), 100);
        }
    }, [initialValue]);

    return (
        <View style={styles.scrollerContainer}>
            <ScrollView
                ref={scrollViewRef}
                style={styles.scroller}
                onMomentumScrollEnd={(event) => {
                    const index = Math.round(event.nativeEvent.contentOffset.y / 50);
                    onSelect(numbers[index]);
                }}
                snapToInterval={50}
                showsVerticalScrollIndicator={false}
                decelerationRate="fast"
            >
                {numbers.map(num => (
                    <View key={num} style={styles.scrollerItem}>
                        <Text style={styles.scrollerItemText}>{num}명</Text>
                    </View>
                ))}
            </ScrollView>
            <View style={styles.scrollerIndicator} />
        </View>
    );
};

export default SelectionModal;
