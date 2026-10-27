import { Icon } from './Icon';
import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Image, TouchableWithoutFeedback } from 'react-native';

interface ShareOptionsModalProps {
    visible: boolean;
    onClose: () => void;
    onShareAction?: (action: string) => void;
}

export const ShareOptionsModal: React.FC<ShareOptionsModalProps> = ({ visible, onClose, onShareAction }) => {

    const handleAction = (action: string) => {
        if (onShareAction) {
            onShareAction(action);
        }
        // In a real app, we might check if we should close or not, but usually share sheets close after action
        // onClose(); 
    };

    const apps = [
        { name: 'Messages', icon: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC062bSSuVHySSPwAdHTKw0CU697N7zw8e4HFJMuobSvSpYqWgCkvXzRF79BN1ZRN17QOG2Z4KoRhLQxukXBCnf7S4SRARttXJLRB50DhUcd2FB30LiIRQgQoVkuH5B87H_PkqMVLZQem4_3XdaILcavSmdiWDLnRC6HStHFdlBThkYP7zr308H2e2KAwWWsCWfH62OeFGSJin9jYgxup1KA7qYL0mIesDEotd19AGHX6hziwEr2uRfwpFrSnrPcrf6nwgihpgtZdo' },
        { name: 'Mail', icon: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDDjaRmZzdGEh7bFCqb6SuQdsZHx-aVo-iNdhWoLSDpSyM_ZUe5_b0mCckS2ain4pc2VfgDjQwfYIJOaY9pK816JUstjfHNJmWzmPbv7h-QR7rfdZxiVRcCS6tMSw1LRU6SA52ndE4S5ZvtQvGi93ABnA8Mnb8jI7d6IlekQo5x8v8Vp3Fe0AOFAHSbqhrxdtgvAL2dkVqp2RhI5IkGe7MVBD_6IcZU1OXVJ0GjBBGARnOVtkgL1Td5XdoBum685N2hKIE-MgAkpxU' },
        { name: 'WhatsApp', icon: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDX469nWdZ6zkWz4pOyjGxy0pUTg_nipD_abptTwU_Id3y3a3QVBU5RNtM1zVD94bug81PoMXc3ga0LYQtv63hWc4MCEBFwS8HWni3lotRJcBdLAkwj0a8I1at_VtrpV-xkA5IoJrw-sYkXeXwINRsqE2oIxY4xUe6PeIJvzYDsl-wjmUtyRGsb5EhkeGLwNyrYdqFpfzAV4e8G6JTqsk5qJLU0mCsl6PZQavQMn3eqKPZJtekyFahlMs4w6rKRMyGnzt9xWtc1ScY' },
        { name: 'Telegram', icon: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBtsVTrWP9Q-pzQGyitSzXKVgzqwAsQMoRJao3j1I0_dWmTz-q6e2d7ar76mGtsgkLluai5XDsK0qLRZZjFojF-hbOHjF3Prv2-CTkUSOJpLC2xq8tRf-q4V1ZcsV2PW026QVYfvBDFNEldyBxPAsjVtWVdULoAGEB8Y53kWcwKkw5uUbJoup6d379ZEpnVODanaEBZZwNDvwhKE-QRX2Xlh-KvAE0Voi60fDXdRDYukkTZbCyZAkvIQbwv3CG1LG9W5bWqsbOwA24' },
        { name: 'Slack', icon: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD-YuuSBk7zABHsmFsf8Q6teK34rT-qD_BN39hmIzbsaeqerGJpgbm_ctUwmfBSUWSFA1eUjJ2RB40Z3s7d0Fh8idb8eryK-R_8Ta1Nc4ut0AIuUsc3GSjtrkQEyYj_wXvdNjAZnauYx1TrLNne1JItoNUtqwn3k7CY0e15Hy8cKwVkywQuzEURtwmZWyXNDys6yx0sOudqiHtZP3McJyU56I1BBKXWKT0rsf2n9ccBs_XrB0Z68foGTwVrHe4aCjGSzSOSsMkPOp4' },
    ];

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.contentContainer}>
                            {/* Drag Indicator (Optional, added for feel) */}
                            <View style={styles.dragIndicatorContainer}>
                                <View style={styles.dragIndicator} />
                            </View>

                            {/* Header / Content Preview */}
                            <View style={styles.header}>
                                <View style={styles.fileIconContainer}>
                                    <Icon name="fileText" size={32} color="#E53734" />
                                </View>
                                <View style={styles.headerTextContainer}>
                                    <Text style={styles.fileName}>First Aid Incident Report.pdf</Text>
                                    <Text style={styles.fileType}>PDF Document</Text>
                                </View>
                            </View>

                            {/* Apps Row */}
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.appsScroll}
                                contentContainerStyle={styles.appsScrollContent}
                            >
                                {apps.map((app, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.appIconContainer}
                                        onPress={() => handleAction(app.name)}
                                    >
                                        <Image source={{ uri: app.icon }} style={styles.appIcon} />
                                        <Text style={styles.appName} numberOfLines={1}>{app.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <View style={styles.divider} />

                            {/* Actions List */}
                            <View style={styles.actionsContainer}>
                                <TouchableOpacity style={styles.actionRow} onPress={() => handleAction('Copy')}>
                                    <View style={styles.actionIconWidth}>
                                        <Icon name="copy" size={24} color="#3B82F6" />
                                    </View>
                                    <Text style={styles.actionText}>Copy</Text>
                                </TouchableOpacity>
                                <View style={styles.actionDivider} />

                                <TouchableOpacity style={styles.actionRow} onPress={() => handleAction('Save to Files')}>
                                    <View style={styles.actionIconWidth}>
                                        <Icon name="folderOpen" size={24} color="#3B82F6" />
                                    </View>
                                    <Text style={styles.actionText}>Save to Files</Text>
                                </TouchableOpacity>
                                <View style={styles.actionDivider} />

                                <TouchableOpacity style={styles.actionRow} onPress={() => handleAction('Print')}>
                                    <View style={styles.actionIconWidth}>
                                        <Icon name="printer" size={24} color="#3B82F6" />
                                    </View>
                                    <Text style={styles.actionText}>Print</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Cancel Button */}
                            <View style={styles.cancelContainer}>
                                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                                    <Text style={styles.cancelText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
    },
    contentContainer: {
        backgroundColor: '#F1F1F1',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingTop: 12,
        paddingBottom: 32, // Safe area padding simulation
    },
    dragIndicatorContainer: {
        alignItems: 'center',
        paddingBottom: 8,
    },
    dragIndicator: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#D1D5DB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(156, 163, 175, 0.2)',
    },
    fileIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        marginRight: 16,
    },
    headerTextContainer: {
        flex: 1,
    },
    fileName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000',
        marginBottom: 2,
    },
    fileType: {
        fontSize: 14,
        color: '#6B7280',
    },
    appsScroll: {
        maxHeight: 110,
    },
    appsScrollContent: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        gap: 20,
    },
    appIconContainer: {
        alignItems: 'center',
        width: 64,
        gap: 6,
    },
    appIcon: {
        width: 56,
        height: 56,
        borderRadius: 12,
    },
    appName: {
        fontSize: 12,
        color: '#000000',
        textAlign: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(156, 163, 175, 0.2)',
        marginBottom: 16,
    },
    actionsContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginHorizontal: 16,
        marginBottom: 16,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
        paddingHorizontal: 16,
        gap: 16,
    },
    actionIconWidth: {
        width: 32,
        alignItems: 'center',
    },
    actionText: {
        fontSize: 16,
        color: '#3B82F6',
        flex: 1,
    },
    actionDivider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginLeft: 64, // aligned with text start
    },
    cancelContainer: {
        paddingHorizontal: 16,
    },
    cancelButton: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#3B82F6',
    },
});
