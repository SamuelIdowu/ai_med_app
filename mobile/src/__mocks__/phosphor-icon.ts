export {};

const React = require('react');

const PhosphorIcon = (props: any) => React.createElement('PhosphorIcon', props);
PhosphorIcon.displayName = 'PhosphorIcon';

// phosphor-react-native v3 icon modules export named `<Name>Icon` components
// (default exports were removed in v3), so every named import and the legacy
// default import must resolve to a component.
module.exports = new Proxy(
  { __esModule: true as const, default: PhosphorIcon },
  {
    get: (target, property) => {
      if (typeof property !== 'string') return undefined;
      if (property === 'then') return undefined;
      if (property in target) return target[property as keyof typeof target];
      return PhosphorIcon;
    },
  },
);
