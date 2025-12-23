import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const PRIMARY_COLOR = '#e53734';
const SECONDARY_TEXT_LIGHT = '#6b5f5f';

interface BottomTabBarProps {
    activeRoute: 'Home' | 'History' | 'Profile' | 'AITools';
}

export const BottomTabBar = ({ activeRoute }: BottomTabBarProps) => {
    const navigation = useNavigation<any>();

    return (
        <View style={styles.bottomNav}>
            <BottomNavItem
                icon="home"
                label="Home"
                active={activeRoute === 'Home'}
                onPress={() => navigation.navigate('Home')}
            />
            <BottomNavItem
                icon="history"
                label="History"
                active={activeRoute === 'History'}
                onPress={() => navigation.navigate('History')}
            />
            <BottomNavItem
                icon="robot"
                label="AI Tools"
                active={activeRoute === 'AITools'}
                onPress={() => navigation.navigate('AITools')}
            />
            <BottomNavItem
                icon="account"
                label="Profile"
                active={activeRoute === 'Profile'}
                onPress={() => navigation.navigate('MedicalProfile')}
            />
        </View>
    );
};

const BottomNavItem = ({ icon, label, active, onPress }: { icon: any, label: string, active?: boolean, onPress?: () => void }) => (
    <TouchableOpacity style={styles.navItem} onPress={onPress}>
        <MaterialCommunityIcons name={icon} size={28} color={active ? PRIMARY_COLOR : SECONDARY_TEXT_LIGHT} />
        <Text style={[styles.navText, active && styles.navTextActive]}>{label}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 80,
        backgroundColor: 'rgba(248, 246, 246, 0.95)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        paddingBottom: 20,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    navItem: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    navText: {
        fontSize: 12,
        fontWeight: '600',
        color: SECONDARY_TEXT_LIGHT,
    },
    navTextActive: {
        color: PRIMARY_COLOR,
    },
});
