import React from 'react';
import { View } from 'react-native';

export const LinearGradient = ({ children, style, ...props }: any) => {
  return React.createElement(View, { style, ...props }, children);
};

export default { LinearGradient };
