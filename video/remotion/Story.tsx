import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, delayRender, continueRender } from 'remotion';
import { C, MONO, fontCss, CAT_ACCENT } from './theme';
import { SceneRouter, Dot } from './scenes';

const FontLoader: React.FC = () => {
  const [handle] = useState(() => delayRender('load-fonts'));
  useEffect(() => {
    const f: any = (document as any).fonts;
    Promise.all([f.load('400 1em "IBM Plex Mono"'), f.load('600 1em "IBM Plex Mono"'), f.load('700 1em "IBM Plex Mono"')])
      .then(() => f.ready)
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, [handle]);
  return <style>{fontCss}</style>;
};

const WindowChrome: React.FC<any> = ({ story, accent }) => (
  <div style={{
    position: 'absolute', top: 0, left: 0, right: 0, height: 64, display: 'flex', alignItems: 'center',
    padding: '0 40px', gap: 12, borderBottom: `1px solid ${C.line}`, background: 'rgba(8,12,10,0.72)', zIndex: 5,
  }}>
    <Dot c={C.red} /><Dot c={C.amber} /><Dot c={C.green} />
    <span style={{ margin: '0 auto', color: C.dim, fontSize: 24, letterSpacing: 1 }}>
      stdout — {story?.category} <span style={{ color: accent }}>●</span>
    </span>
  </div>
);

const Statusline: React.FC<any> = ({ story, accent, timing, segs }) => {
  const f = useCurrentFrame();
  const idx = Math.max(1, (timing?.segments || []).filter((t: any) => f >= t.startFrame).length);
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, display: 'flex', alignItems: 'center',
      padding: '0 30px', gap: 22, background: accent, color: '#06120b', fontSize: 22, fontWeight: 600, zIndex: 5,
    }}>
      <span>NORMAL</span>
      <span style={{ opacity: 0.82 }}>~/stdout/{story?.category}/{story?.slug}</span>
      <span style={{ marginLeft: 'auto' }}>{String(idx).padStart(2, '0')}/{String(segs).padStart(2, '0')}</span>
    </div>
  );
};

export const Story: React.FC<any> = ({ story, script, timing }) => {
  const accent = CAT_ACCENT[story?.category] || C.green;
  const segs = script?.segments || [];
  const times = timing?.segments || [];
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: MONO, color: C.text }}>
      <FontLoader />
      <AbsoluteFill style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(120,255,180,0.035) 0px, rgba(120,255,180,0.035) 1px, transparent 1px, transparent 3px)' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 36%, transparent 50%, rgba(0,0,0,0.5) 100%)' }} />
      <WindowChrome story={story} accent={accent} />
      {segs.map((seg: any, i: number) => {
        const start = times[i]?.startFrame ?? 0;
        const next = times[i + 1]?.startFrame ?? durationInFrames;
        const dur = Math.max(1, next - start);
        return (
          <Sequence key={seg.id} from={start} durationInFrames={dur} name={seg.id} layout="none">
            <SceneRouter seg={seg} accent={accent} story={story} dur={dur} />
          </Sequence>
        );
      })}
      <Statusline story={story} accent={accent} timing={timing} segs={segs.length} />
    </AbsoluteFill>
  );
};
