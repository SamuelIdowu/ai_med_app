import React from 'react';
import { Text } from 'react-native';

export const MaterialCommunityIcons = ({ name, ...props }: any) => React.createElement(Text, props, name);
export const Ionicons = ({ name, ...props }: any) => React.createElement(Text, props, name);
export const FontAwesome = ({ name, ...props }: any) => React.createElement(Text, props, name);
export const AntDesign = ({ name, ...props }: any) => React.createElement(Text, props, name);

export default {
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome,
  AntDesign,
};
