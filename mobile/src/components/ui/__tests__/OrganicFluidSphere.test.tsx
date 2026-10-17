import React from 'react';
import { OrganicFluidSphere } from '../OrganicFluidSphere';

describe('OrganicFluidSphere Component', () => {
  it('instantiates and exports the OrganicFluidSphere component', () => {
    expect(OrganicFluidSphere).toBeDefined();
    expect(typeof OrganicFluidSphere).toBe('function');
  });

  it('renders correctly with default idle state', () => {
    const element = <OrganicFluidSphere state="idle" size={160} />;
    expect(element.props.state).toBe('idle');
    expect(element.props.size).toBe(160);
  });

  it('accepts recording and thinking state configurations', () => {
    const recordingElement = <OrganicFluidSphere state="recording" size={180} />;
    expect(recordingElement.props.state).toBe('recording');
    expect(recordingElement.props.size).toBe(180);

    const thinkingElement = <OrganicFluidSphere state="thinking" size={200} />;
    expect(thinkingElement.props.state).toBe('thinking');
    expect(thinkingElement.props.size).toBe(200);
  });
});
