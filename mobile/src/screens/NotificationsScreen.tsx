import { Icon } from '../components/Icon';
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { RefreshControl } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

const BG_LIGHT = theme.colors.canvas.background;
const CARD_LIGHT = theme.colors.canvas.surface;
const TEXT_LIGHT = theme.colors.text.primary;
const TEXT_SECONDARY = theme.colors.text.secondary;

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

    // Notifications state populated via live backend API
    const [notifications, setNotifications] = React.useState<Notification[]>([]);
    const [refreshing, setRefreshing] = React.useState(false);
    const { session } = useAuth(); // Assuming useAuth is exported from AuthContext
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000/api/v1';

    const fetchNotifications = React.useCallback(async () => {
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
    }, [session, backendUrl]);

    React.useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await fetchNotifications();
        setRefreshing(false);
    }, [fetchNotifications]);

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
                <Icon name="bellSlash" size={48} color={TEXT_SECONDARY} />
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
            <View style={[styles.iconContainer, { backgroundColor: item.type === 'alert' ? 'rgba(239, 68, 68, 0.12)' : theme.colors.primary.light }]}>
                <Icon
                    name={item.type === 'alert' ? 'warningCircle' : 'info'}
                    size={24}
                    color={item.type === 'alert' ? theme.colors.status.danger : theme.colors.primary.main}
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
                    <Icon name="arrowLeft" size={24} color={TEXT_LIGHT} />
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
        borderWidth: 1,
        borderColor: theme.colors.canvas.border,
        ...theme.spatial.shadows3d.level1,
    },
    unreadCard: {
        backgroundColor: CARD_LIGHT,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.status.danger,
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
