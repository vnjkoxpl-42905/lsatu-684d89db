import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import '../../src/features/reading-center/reading-center.css';
import { segmentPassage } from '../../src/features/reading-center/rc-recall/lib/segment';
const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url.includes('/rest/v1/')) {
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    return new Response(JSON.stringify(body || []), { status: 200, headers: {'Content-Type':'application/json'} });
  }
  if (url.startsWith('http') && !url.startsWith(location.origin)) return new Response('{}', {status:200});
  return originalFetch(input, init);
};
Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {value: async () => {
  const context = new AudioContext(); const destination = context.createMediaStreamDestination();
  const oscillator = context.createOscillator(); const gain = context.createGain(); gain.gain.value = 0.01;
  oscillator.connect(gain); gain.connect(destination); oscillator.start(); await context.resume();
  return destination.stream;
}});
const {default: Runner} = await import('../../src/features/reading-center/rc-recall/ContinuousRcRecallRunner');
const text = 'Millions of people worldwide play multiplayer online games. They each pick, say, a medieval character to play, such as a warrior. Then they might band together in quests to slay magical beasts; their avatars appear as tiny characters striding across a Tolkienesque land.\n\nThese games bring people together in imagined worlds. Players can develop lasting friendships through the tasks they complete together.';
createRoot(document.getElementById('root')!).render(<div className="rc-root" data-rc-theme="light" style={{background: "white", color: "#16132b", minHeight: "100vh"}}><Runner attempt={{id:'preview-attempt',student_id:'preview-student',preptest:140,section:4,passage_ids:[1],segmentation_version:2} as any} studentId="preview-student" passages={[{text} as any]} segmented={[segmentPassage(text)]} scope="all_read" mode="rc_recall" onExit={() => {document.getElementById('root')!.textContent='Preview exited';}} /></div>);

