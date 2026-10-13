
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions, FlashMode } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraReticle } from '../components/ui/CameraReticle';
import { theme } from '../theme';

export const CameraScreen = () => {
    const navigation = useNavigation<any>();
    const [facing, setFacing] = useState<CameraType>('back');
    const [flash, setFlash] = useState<FlashMode>('off');
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);

    if (!permission) {
        // Camera permissions are still loading.
        return <View />;
    }

    if (!permission.granted) {
        // Camera permissions are not granted yet.
        return (
            <View style={styles.container}>
                <Text style={styles.message}>We need your permission to show the camera</Text>
                <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
                    <Text style={styles.permissionButtonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const toggleFlash = () => {
        setFlash(current => (current === 'off' ? 'on' : 'off'));
    };

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync();
                if (photo) {
                    navigation.navigate('PhotoPreview', { photoUri: photo.uri });
                }
            } catch (error) {
                console.error("Failed to take picture:", error);
            }
        }
    };

    return (
        <View style={styles.container}>
            <CameraView
                style={styles.camera}
                facing={facing}
                flash={flash}
                ref={cameraRef}
            >
                <SafeAreaView style={styles.uiContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
                            <MaterialIcons name="close" size={24} color="white" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.iconButton} onPress={toggleFlash}>
                            <MaterialIcons
                                name={flash === 'on' ? "flash-on" : "flash-off"}
                                size={24}
                                color="white"
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Guidelines Overlay */}
                    <CameraReticle instruction="Center the injury within the guides" size={260} />

                    {/* Footer - Capture */}
                    <View style={styles.footer}>
                        <View style={styles.captureContainer}>
                            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                                <View style={styles.captureInner} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </CameraView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    message: {
        textAlign: 'center',
        paddingBottom: 10,
        color: 'white',
    },
    permissionButton: {
        backgroundColor: '#e53734',
        padding: 10,
        borderRadius: 5,
        alignSelf: 'center',
    },
    permissionButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    camera: {
        flex: 1,
    },
    uiContainer: {
        flex: 1,
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        paddingTop: 24,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    guidesContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    guideBox: {
        width: '100%',
        maxWidth: 300,
        aspectRatio: 3 / 4, // Rough approximation of a portrait photo aspect? Or just square-ish
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 48,
        height: 48,
        borderColor: 'rgba(255, 255, 255, 0.8)',
    },
    topLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderTopLeftRadius: 12,
    },
    topRight: {
        top: 0,
        right: 0,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderTopRightRadius: 12,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderBottomLeftRadius: 12,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderBottomRightRadius: 12,
    },
    footer: {
        alignItems: 'center',
        paddingBottom: 48,
        gap: 16,
    },
    instructionText: {
        color: 'white',
        fontSize: 16,
        fontFamily: theme.typography.h3.fontFamily,
        textAlign: 'center',
        marginBottom: 16,
    },
    captureContainer: {
        height: 96,
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 4,
        borderColor: 'white',
        backgroundColor: 'rgba(255,255,255,0.3)',
        padding: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureInner: {
        width: '100%',
        height: '100%',
        borderRadius: 40, // Full circle
        backgroundColor: 'white',
    },
});
