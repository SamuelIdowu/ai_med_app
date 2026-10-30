const LOCAL_URL_PATTERN =
  /(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.0\.2\.2|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)/i;

function validateProductionEnvironment() {
  const profile = process.env.EAS_BUILD_PROFILE;

  if (!profile || !profile.startsWith('production')) {
    return;
  }

  const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!backendUrl || LOCAL_URL_PATTERN.test(backendUrl)) {
    throw new Error(
      'Production builds require EXPO_PUBLIC_BACKEND_URL to point at the deployed HTTPS backend.',
    );
  }

  if (!supabaseUrl || LOCAL_URL_PATTERN.test(supabaseUrl) || !supabaseUrl.startsWith('https://')) {
    throw new Error('Production builds require a valid HTTPS EXPO_PUBLIC_SUPABASE_URL.');
  }

  if (!supabaseAnonKey) {
    throw new Error('Production builds require EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }
}

module.exports = ({ config }) => {
  validateProductionEnvironment();

  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const plugins = config.plugins || [];
  // Required by SDK 58 (expo install --fix): datetimepicker, sharing and
  // status-bar must be registered as config plugins.
  const requiredPlugins = [
    '@react-native-community/datetimepicker',
    'expo-sharing',
    'expo-status-bar',
  ];
  const mapLibrePlugin = '@maplibre/maplibre-react-native';
  const pluginsWithMapLibre = plugins.includes(mapLibrePlugin)
    ? plugins
    : [...plugins, mapLibrePlugin];
  const finalPlugins = [
    ...pluginsWithMapLibre,
    ...requiredPlugins.filter((plugin) => !pluginsWithMapLibre.includes(plugin)),
  ];

  if (!googleMapsApiKey) {
    return { ...config, plugins: finalPlugins };
  }

  return {
    ...config,
    plugins: finalPlugins,
    android: {
      ...config.android,
      config: {
        ...(config.android && config.android.config),
        googleMaps: {
          ...(config.android && config.android.config && config.android.config.googleMaps),
          apiKey: googleMapsApiKey,
        },
      },
    },
  };
};
