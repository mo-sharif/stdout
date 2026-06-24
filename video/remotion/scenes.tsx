import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { C } from './theme';

// ---- shared atoms ---------------------------------------------------------
const FPS = 30;
const typed = (text: string, frame: number, start: number, cps = 30) =>
  String(text || '').slice(0, Math.max(0, Math.floor(((frame - start) / FPS) * cps)));

export const Dot: React.FC<{ c: string }> = ({ c }) => (
  <span style={{ width: 13, height: 13, borderRadius: '50%', background: c, display: 'inline-block' }} />
);

export const Cursor: React.FC<{ color?: string }> = ({ color = C.green }) => {
  const f = useCurrentFrame();
  return (
    <span style={{
      display: 'inline-block', width: '0.55em', height: '1.05em', background: color,
      marginLeft: 5, transform: 'translateY(3px)', opacity: Math.floor(f / 15) % 2 ? 0.12 : 1,
      boxShadow: `0 0 10px ${color}`,
    }} />
  );
};

const Panel: React.FC<{ title: string; accent: string; children: React.ReactNode }> = ({ title, accent, children }) => (
  <div style={{
    border: `1px solid ${C.line}`, borderRadius: 12, background: C.panel, height: '100%',
    display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 40px 90px rgba(0,0,0,0.55)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: `1px solid ${C.line}`, background: C.panel2 }}>
      <Dot c={C.red} /><Dot c={C.amber} /><Dot c={C.green} />
      <span style={{ marginLeft: 16, color: C.dim, fontSize: 24 }}>{title}</span>
      <span style={{ marginLeft: 'auto', width: 9, height: 9, borderRadius: '50%', background: accent, boxShadow: `0 0 12px ${accent}` }} />
    </div>
    <div style={{ padding: '36px 44px', flex: 1, position: 'relative', overflow: 'hidden' }}>{children}</div>
  </div>
);

const Lower: React.FC<{ text: string; from?: number; accent: string }> = ({ text, from = 0, accent }) => {
  const f = useCurrentFrame();
  const op = interpolate(f, [from, from + 9], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: 44, right: 44, bottom: 30, opacity: op }}>
      <span style={{ borderLeft: `3px solid ${accent}`, paddingLeft: 16, color: C.dim, fontSize: 25 }}>{text}</span>
    </div>
  );
};

const KEYWORDS = /^(function|return|var|let|const|if|else|while|for|new|typeof|null|undefined|true|false)$/;
const tokenize = (line: string) =>
  String(line).split(/(\s+|[(){}[\];,=+\-*/<>!&|.]|"[^"]*"|'[^']*')/).filter((p) => p !== '').map((p, i) => {
    let color = C.text;
    if (KEYWORDS.test(p)) color = C.magenta;
    else if (/^[A-Z][A-Za-z]+$/.test(p)) color = C.cyan;
    else if (/^["'].*["']$/.test(p)) color = C.amber;
    else if (/^\d+$/.test(p)) color = C.amber;
    else if (/^[(){}[\];,=+\-*/<>!&|.]$/.test(p)) color = C.dim;
    return <span key={i} style={{ color }}>{p}</span>;
  });

// ---- scenes ---------------------------------------------------------------
const TitleScene: React.FC<any> = ({ seg, story, accent }) => {
  const frame = useCurrentFrame();
  const cmd = `$ stdout play "${story.title}"`;
  const titleIn = spring({ frame: frame - 38, fps: FPS, config: { damping: 14 } });
  const hookFull = story.hook || seg.narration || '';
  const hook = typed(hookFull, frame, 66, 30);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', gap: 30 }}>
      <div style={{ color: C.dim, fontSize: 31 }}>{typed(cmd, frame, 4, 26)}{frame < 44 && <Cursor />}</div>
      <div style={{ opacity: titleIn, transform: `translateY(${(1 - titleIn) * 28}px)`, fontSize: 86, fontWeight: 700, lineHeight: 1.04, color: accent, textShadow: `0 0 36px ${accent}55`, maxWidth: 1500 }}>{story.title}</div>
      <div style={{ fontSize: 27, color: C.dim, opacity: interpolate(frame, [52, 64], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>[ {story.kicker || story.category} ]</div>
      <div style={{ fontSize: 35, lineHeight: 1.5, color: C.text, maxWidth: 1380 }}>{hook}{frame > 66 && hook.length < hookFull.length && <Cursor />}</div>
    </div>
  );
};

const CodeScene: React.FC<any> = ({ scene, accent }) => {
  const frame = useCurrentFrame();
  const lines = String(scene.code || '').split('\n');
  const per = 4;
  return (
    <Panel title={scene.file || 'source'} accent={accent}>
      <div style={{ fontSize: 30, lineHeight: 1.62 }}>
        {lines.map((ln: string, i: number) => {
          const op = interpolate(frame - 10 - i * per, [0, 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <div key={i} style={{ opacity: op, transform: `translateX(${(1 - op) * 12}px)`, display: 'flex', gap: 26 }}>
              <span style={{ color: C.faint, width: 36, textAlign: 'right', userSelect: 'none' }}>{i + 1}</span>
              <span>{tokenize(ln)}{i === lines.length - 1 && <Cursor />}</span>
            </div>
          );
        })}
      </div>
      {scene.caption ? <Lower text={scene.caption} from={lines.length * per + 18} accent={accent} /> : null}
    </Panel>
  );
};

const TerminalScene: React.FC<any> = ({ scene, accent }) => {
  const frame = useCurrentFrame();
  const lines = scene.lines || [];
  const colorOf = (c: string) => (c === 'err' ? C.red : c === 'pr' ? C.green : c === 'dim' ? C.faint : C.text);
  let acc = 10;
  const starts = lines.map((L: any) => { const s = acc; acc += Math.max(8, (L.t || '').length * 0.5); return s; });
  return (
    <Panel title={scene.title || 'zsh'} accent={accent}>
      <div style={{ fontSize: 30, lineHeight: 1.72 }}>
        {lines.map((L: any, i: number) => {
          const start = starts[i];
          const shown = typed(L.t || '', frame, start, 46);
          if (frame < start) return <div key={i} style={{ height: 0 }} />;
          const isErr = L.c === 'err';
          const flash = isErr ? interpolate(frame - (start + (L.t || '').length / 46 * FPS), [0, 4, 10], [0.4, 1, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
          return (
            <div key={i} style={{ color: colorOf(L.c), opacity: flash }}>
              {shown}{shown.length < (L.t || '').length && <Cursor color={colorOf(L.c)} />}
            </div>
          );
        })}
      </div>
      {scene.caption ? <Lower text={scene.caption} from={acc + 18} accent={accent} /> : null}
    </Panel>
  );
};

const CardScene: React.FC<any> = ({ seg, scene, accent }) => {
  const frame = useCurrentFrame();
  const headIn = spring({ frame, fps: FPS, config: { damping: 14 } });
  const bodyFull = seg.narration || scene.text || '';
  const body = typed(bodyFull, frame, 16, 32);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', gap: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, opacity: headIn, transform: `translateY(${(1 - headIn) * 20}px)` }}>
        <span style={{ width: 14, height: 38, background: accent, boxShadow: `0 0 20px ${accent}` }} />
        <span style={{ fontSize: 58, fontWeight: 700, color: C.text, lineHeight: 1.1 }}>{seg.heading}</span>
      </div>
      <div style={{ fontSize: 36, lineHeight: 1.55, color: C.dim, maxWidth: 1420 }}>{body}{body.length < bodyFull.length && <Cursor />}</div>
      {scene.type && scene.type !== 'prose' ? (
        <div style={{ color: C.faint, fontSize: 22, marginTop: 8 }}>[ {scene.type} visual — bespoke scene lands in stage 2b ]</div>
      ) : null}
    </div>
  );
};

const OutroScene: React.FC<any> = ({ scene, story, accent }) => {
  const frame = useCurrentFrame();
  const url = `mo-sharif.github.io/stdout/${story.category}/${story.slug}/`;
  const sources = scene.sources || [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', gap: 26 }}>
      <div style={{ fontSize: 31, color: C.dim }}>{typed(`$ open ${url}`, frame, 4, 28)}{frame < 60 && <Cursor />}</div>
      <div style={{ fontSize: 64, fontWeight: 700, color: accent, textShadow: `0 0 30px ${accent}55` }}>read the full story</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginTop: 8 }}>
        {sources.map((s: any, i: number) => {
          const op = interpolate(frame, [44 + i * 11, 56 + i * 11], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return <div key={i} style={{ opacity: op, fontSize: 27, color: C.text }}>→ {s.title} <span style={{ color: C.faint }}>({s.platform})</span></div>;
        })}
      </div>
      <div style={{ marginTop: 22, color: C.faint, fontSize: 22 }}>researched · written · verified autonomously on local hardware</div>
    </div>
  );
};

export const SceneRouter: React.FC<any> = ({ seg, accent, story }) => {
  if (seg.kind === 'hook') return <TitleScene seg={seg} story={story} accent={accent} />;
  if (seg.kind === 'outro') return <OutroScene scene={seg.scenes?.[0] || {}} story={story} accent={accent} />;
  const scene = seg.scenes?.[0] || { type: 'prose' };
  if (scene.type === 'code') return <CodeScene scene={scene} accent={accent} />;
  if (scene.type === 'terminal') return <TerminalScene scene={scene} accent={accent} />;
  return <CardScene seg={seg} scene={scene} accent={accent} />;
};
