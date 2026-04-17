import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';

export default function SplashScreen({ navigation }: any) {
    const fadeAnim = new Animated.Value(0);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
        }).start();

        // Simulate app loading/initialization time
        const timer = setTimeout(() => {
            // Navigation handled by AppNavigator's AuthContext check
        }, 2000);

        return () => clearTimeout(timer);
    }, [fadeAnim]);

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}> 
                <Image source={require('../assets/splash.png')} resizeMode="cover" style={styles.fullscreenImage} />
                {/* <Text style={styles.tagline}>Connect. Grow. Succeed.</Text> */}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    content: {
        flex: 1,
    },
    logoText: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 10,
        letterSpacing: 2,
    },
    fullscreenImage: {
        width: '100%',
        height: '100%',
    },
    tagline: {
        fontSize: 18,
        color: '#E3F2FD',
        fontStyle: 'italic',
    },
});
