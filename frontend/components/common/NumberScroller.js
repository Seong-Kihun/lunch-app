import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { basicStyles } from '../../theme/basicStyles';

export const NumberScroller = ({ onSelect, initialValue = 4, styles = basicStyles }) => {
    const numbers = Array.from({ length: 9 }, (_, i) => i + 2); // 2 to 10
    const scrollViewRef = useRef(null);

    useEffect(() => {
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
