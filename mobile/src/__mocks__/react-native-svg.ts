import React from 'react';
import { View } from 'react-native';

const SvgMock = ({ children, ...props }: any) => React.createElement(View, props, children);

export const Svg = SvgMock;
export const Path = (props: any) => React.createElement(View, props);
export const Defs = ({ children, ...props }: any) => React.createElement(View, props, children);
export const LinearGradient = ({ children, ...props }: any) => React.createElement(View, props, children);
export const Stop = (props: any) => React.createElement(View, props);
export const Circle = (props: any) => React.createElement(View, props);
export const Rect = (props: any) => React.createElement(View, props);
export const G = ({ children, ...props }: any) => React.createElement(View, props, children);
export const Line = (props: any) => React.createElement(View, props);
export const Text = ({ children, ...props }: any) => React.createElement(View, props, children);

export default SvgMock;
