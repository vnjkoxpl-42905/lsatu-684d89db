import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RcExplanationMedia } from './RcExplanationMedia';
import { safeRcMediaSource } from '../lib/rcMedia';

describe('accessible RC explanation media', () => {
  it('rejects script, credentials, protocol-relative and backslash sources', () => {
    for (const source of ['javascript:alert(1)', '//example.com/x', 'https://user:pass@example.com/x', '/\\evil/x', '/\n/evil', 'https:\n//example.com']) expect(safeRcMediaSource(source)).toBe(false);
    expect(safeRcMediaSource('/data/example.mp4')).toBe(true);
    expect(safeRcMediaSource('https://example.com/example.mp4')).toBe(true);
  });
  it('keeps a supplied transcript readable when video captions are missing', () => {
    const { container } = render(<RcExplanationMedia media={[{ kind: 'video', src: '/fixture.mp4', title: 'Fixture', transcript: 'Available transcript without captions.' }]} />);
    expect(container.querySelector('video')).toBeNull();
    expect(screen.getByText('Available transcript without captions.')).toBeInTheDocument();
  });
  it('does not load video without captions and transcript', () => {
    const { container } = render(<RcExplanationMedia media={[{ kind: 'video', src: '/fixture.mp4', title: 'Fixture', transcript: '' }]} />);
    expect(screen.getByText(/Media explanation unavailable/)).toBeInTheDocument();
    expect(container.querySelector('video')).toBeNull();
  });
  it('offers controls, captions, speed and transcript without autoplay', () => {
    const { container } = render(<RcExplanationMedia media={[{ kind: 'video', src: '/fixture.mp4', title: 'Fixture', transcript: 'Transcript example.', captions: { src: '/fixture.vtt', language: 'en', label: 'English' } }]} />);
    const video = container.querySelector('video')!;
    expect(video).toHaveAttribute('controls'); expect(video).toHaveAttribute('preload', 'none'); expect(video).not.toHaveAttribute('autoplay');
    expect(video).toHaveAttribute('crossorigin', 'anonymous');
    expect(video.querySelector('track')).toHaveAttribute('kind', 'captions');
    fireEvent.change(screen.getByLabelText('Playback speed'), { target: { value: '1.5' } });
    expect(video.playbackRate).toBe(1.5);
    fireEvent.error(video);
    expect(screen.getByRole('status')).toHaveTextContent('The media could not be loaded');
    expect(screen.getByText('Transcript example.')).toBeInTheDocument();
  });
  it('withholds a video whose captions fail instead of silently playing without them', () => {
    const { container } = render(<RcExplanationMedia media={[{ kind: 'video', src: '/fixture.mp4', title: 'Caption failure', transcript: 'Readable alternative.', captions: { src: '/missing.vtt', language: 'en', label: 'English' } }]} />);
    fireEvent.error(container.querySelector('track')!);
    expect(screen.getByRole('status')).toHaveTextContent('The video captions could not be loaded');
    expect(container.querySelector('video')).toBeNull();
    expect(screen.getByText('Readable alternative.')).toBeInTheDocument();
  });
  it('keeps an audio transcript available when the audio fails', () => {
    const { container } = render(<RcExplanationMedia media={[{ kind: 'audio', src: '/fixture.mp3', title: 'Audio fixture', transcript: 'Audio transcript remains available.' }]} />);
    const audio = container.querySelector('audio')!;
    expect(audio).toHaveAttribute('controls');
    expect(audio).not.toHaveAttribute('autoplay');
    expect(container.querySelector('track')).toBeNull();
    fireEvent.error(audio);
    expect(screen.getByRole('status')).toHaveTextContent('The media could not be loaded');
    expect(screen.getByText('Audio transcript remains available.')).toBeInTheDocument();
  });
});
