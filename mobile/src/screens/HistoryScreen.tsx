import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SectionList, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomTabBar } from '../components/BottomTabBar';
import { EncounterService } from '../services/encounterService';
import { reportService } from '../services/reportService';

const BG_LIGHT = '#f8f6f6';
const CARD_LIGHT = '#ffffff';
const TEXT_LIGHT = '#1b0e0e';
const TEXT_SECONDARY = '#6b5f5f';



export const HistoryScreen = () => {
    const [sections, setSections] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const encounters = await EncounterService.getEncounters();

            // Transform to Sections suitable for SectionList
            const transformed = encounters.map((e: any) => ({
                id: e.id,
                title: e.category || 'First Aid',
                subtitle: e.notes || 'No details',
                date: new Date(e.created_at).toLocaleDateString(),
                icon: 'medical-bag', // Generic icon for now or map based on category
                iconColor: '#e53734',
                iconBg: '#ffe5e5',
            }));

            // Only set sections if we have data, otherwise empty list handling
            if (transformed.length > 0) {
                setSections([{
                    title: 'RECENT ACTIVITY',
                    data: transformed
                }]);
            } else {
                setSections([]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateReport = async (encounterId: string) => {
        try {
            setLoading(true);

            // Generate the PDF report from the backend
            const reportUri = await reportService.generateReport(encounterId);

            setLoading(false);

            // Show success and offer to view/share the report
            Alert.alert(
                'Report Generated',
                'Your medical report has been generated successfully.',
                [
                    {
                        text: 'Share',
                        onPress: async () => {
                            try {
                                await reportService.shareReport(reportUri);
                            } catch (error) {
                                console.error('Error sharing report:', error);
                            }
                        }
                    },
                    {
                        text: 'OK',
                        style: 'cancel'
                    }
                ]
            );
        } catch (error: any) {
            setLoading(false);
            console.error('Report generation failed', error);
            Alert.alert('Error', error.message || 'Failed to generate report. Please try again.');
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.card} activeOpacity={0.7}>
            <View style={[styles.iconContainer, { backgroundColor: item.iconBg }]}>
                <MaterialCommunityIcons name={item.icon} size={24} color={item.iconColor} />
            </View>
            <View style={styles.textContainer}>
                <View style={styles.row}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.dateText}>{item.date}</Text>
                </View>
                <Text style={styles.itemSubtitle} numberOfLines={1}>{item.subtitle}</Text>
            </View>
            <TouchableOpacity
                style={{ padding: 8 }}
                onPress={() => handleGenerateReport(item.id)}
            >
                <MaterialCommunityIcons name="file-document-outline" size={24} color={TEXT_SECONDARY} />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => (
        <Text style={styles.sectionHeader}>{title}</Text>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>History of Events</Text>
                <TouchableOpacity style={styles.filterButton} onPress={loadHistory}>
                    <MaterialCommunityIcons name="refresh" size={24} color={TEXT_LIGHT} />
                </TouchableOpacity>
            </View>

            <SectionList
                sections={sections}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                stickySectionHeadersEnabled={false}
                ListEmptyComponent={
                    !loading ? (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                            <Text style={{ color: TEXT_SECONDARY }}>No history found</Text>
                        </View>
                    ) : null
                }
            />

            {/* Bottom Navigation */}
            <BottomTabBar activeRoute="History" />
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
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: TEXT_LIGHT,
    },
    filterButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 100, // Space for bottom bar
    },
    sectionHeader: {
        fontSize: 14,
        fontWeight: '700',
        color: TEXT_SECONDARY,
        marginTop: 20,
        marginBottom: 10,
        letterSpacing: 1,
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
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
        marginRight: 8,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: TEXT_LIGHT,
    },
    dateText: {
        fontSize: 12,
        color: TEXT_SECONDARY,
    },
    itemSubtitle: {
        fontSize: 14,
        color: TEXT_SECONDARY,
    },
});
