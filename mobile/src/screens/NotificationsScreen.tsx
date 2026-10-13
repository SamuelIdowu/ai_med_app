import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { BottomTabBar } from '../components/BottomTabBar';

const BG_LIGHT = '#f8f6f6';
const CARD_LIGHT = '#ffffff';
const TEXT_LIGHT = '#1b0e0e';
const TEXT_SECONDARY = '#6b5f5f';

interface Notification {
    id: string;
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    type: 'info' | 'alert' | 'success';
}

export const NotificationsScreen = () => {
    const navigation = useNavigation();

    // Mock data - set to empty array to test empty state initially, 
    // or populate to test list state.
    // For now, I'll start with empty to match the user request of "add an empty state".
    // I can toggle this to test the list view.
    const [notifications, setNotifications] = React.useState<Notification[]>([]);
    const [refreshing, setRefreshing] = React.useState(false);
    const { session } = useAuth(); // Assuming useAuth is exported from AuthContext
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000/api/v1';

    const fetchNotifications = async () => {
        if (!session?.access_token) return;
        try {
            const response = await fetch(`${backendUrl}/notifications`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setNotifications(data);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    React.useEffect(() => {
        fetchNotifications();
    }, [session]);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await fetchNotifications();
        setRefreshing(false);
    }, [session]);

    const handleMarkAsRead = async (id: string, read: boolean) => {
        if (read || !session?.access_token) return;

        try {
            // Optimistic update
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

            await fetch(`${backendUrl}/notifications/${id}/read`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
                <MaterialCommunityIcons name="bell-off-outline" size={48} color={TEXT_SECONDARY} />
            </View>
            <Text style={styles.emptyTitle}>No available notifications</Text>
            <Text style={styles.emptySubtitle}>You're all caught up! Check back later for updates.</Text>
        </View>
    );

    const renderItem = ({ item }: { item: Notification }) => (
        <TouchableOpacity
            style={[styles.card, !item.read && styles.unreadCard]}
            onPress={() => handleMarkAsRead(item.id, item.read)}
        >
            <View style={[styles.iconContainer, { backgroundColor: item.type === 'alert' ? '#ffe5e5' : '#e3f2fd' }]}>
                <MaterialCommunityIcons
                    name={item.type === 'alert' ? 'alert-circle-outline' : 'information-outline'}
                    size={24}
                    color={item.type === 'alert' ? '#e53734' : '#1976d2'}
                />
            </View>
            <View style={styles.textContainer}>
                <View style={styles.row}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.timeText}>{item.timestamp}</Text>
                </View>
                <Text style={styles.itemMessage} numberOfLines={2}>{item.message}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={TEXT_LIGHT} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={[
                    styles.listContent,
                    notifications.length === 0 && styles.emptyListContent
                ]}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={renderEmptyState}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            />

            {/* Bottom Navigation */}
            {/* Using activeRoute as null or something else since it's not a primary tab, 
                 but if we want to show the tab bar we can. 
                 Often secondary screens might hide it or show it. 
                 HistoryScreen shows it, so I'll show it too. 
                 I'll pass a dummy activeRoute or handle it in BottomTabBar if needed.
                 For now let's safely assume it acts as a secondary screen. 
             */}
            {/* <BottomTabBar activeRoute="Notifications" /> */}
            {/* 
                Explanation: If 'Notifications' is not a defined tab in BottomTabBar, 
                it might not highlight anything, which is fine.
            */}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG_LIGHT,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: BG_LIGHT,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: TEXT_LIGHT,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    emptyListContent: {
        flex: 1,
        justifyContent: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingHorizontal: 40,
        marginTop: -60, // Slight offset to look centered visually with header
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: TEXT_LIGHT,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        color: TEXT_SECONDARY,
        textAlign: 'center',
        lineHeight: 20,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CARD_LIGHT,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    unreadCard: {
        backgroundColor: '#ffffff',
        borderLeftWidth: 4,
        borderLeftColor: '#e53734',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: TEXT_LIGHT,
    },
    timeText: {
        fontSize: 12,
        color: TEXT_SECONDARY,
    },
    itemMessage: {
        fontSize: 14,
        color: TEXT_SECONDARY,
        lineHeight: 20,
    },
});
