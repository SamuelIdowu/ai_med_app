import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { FloatingNavPill, NavTabId } from './navigation/FloatingNavPill';

interface BottomTabBarProps {
  activeRoute:
    | 'Home'
    | 'Analytics'
    | 'AIChat'
    | 'Articles'
    | 'History'
    | 'Profile'
    | 'MedicalProfile'
    | 'AITools';
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeRoute }) => {
  const navigation = useNavigation<any>();

  // Map legacy route names to the 4 row tabs plus the center AI Chat action.
  const normalizedActiveRoute: NavTabId = (() => {
    switch (activeRoute) {
      case 'History':
      case 'Analytics':
        return 'Analytics';
      case 'AIChat':
      case 'AITools':
        return 'AIChat';
      case 'Articles':
        return 'Articles';
      case 'Profile':
      case 'MedicalProfile':
        return 'Profile';
      case 'Home':
      default:
        return 'Home';
    }
  })();

  const handleNavigate = (route: NavTabId) => {
    switch (route) {
      case 'Home':
        navigation.navigate('Home');
        break;
      case 'Analytics':
        navigation.navigate('History');
        break;
      case 'AIChat':
        navigation.navigate('AIChat');
        break;
      case 'Articles':
        navigation.navigate('FirstAidList');
        break;
      case 'Profile':
        navigation.navigate('MedicalProfile');
        break;
    }
  };

  return (
    <FloatingNavPill
      activeRoute={normalizedActiveRoute}
      onNavigate={handleNavigate}
    />
  );
};

export default BottomTabBar;
