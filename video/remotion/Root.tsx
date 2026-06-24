import React from 'react';
import { Composition } from 'remotion';
import { Story } from './Story';
import sample from './sample.json';

const fps = (sample as any).timing?.fps || 30;
const dur = Math.max(30, Math.ceil(((sample as any).timing?.total || 10) * fps));

export const RemotionRoot: React.FC = () => (
  <Composition
    id="StoryLandscape"
    component={Story as any}
    durationInFrames={dur}
    fps={fps}
    width={1920}
    height={1080}
    defaultProps={sample as any}
    calculateMetadata={({ props }) => {
      const t = (props as any).timing;
      return {
        durationInFrames: Math.max(30, Math.ceil((t?.total || 10) * (t?.fps || 30))),
        fps: t?.fps || 30,
      };
    }}
  />
);
