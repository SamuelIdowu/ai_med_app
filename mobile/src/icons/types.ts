import type { StyleProp, ViewStyle } from 'react-native';
import type { IconProps as PhosphorIconProps } from 'phosphor-react-native';

import type { IconName } from './registry';

export type IconTone =
  | 'default'
  | 'muted'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'inverse'
  | 'brand';

export type IconSize = number | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type IconWeight = NonNullable<PhosphorIconProps['weight']>;

export interface IconComponentProps {
  name: IconName;
  size?: IconSize;
  color?: string;
  tone?: IconTone;
  weight?: IconWeight;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}
