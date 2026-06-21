import { Audio } from 'expo-av';

import { currentAppState } from '@/lib/app-foreground';
import { prepareVoiceRecordingInstance } from '@/lib/voice-prepare-guard';

/** expo-av tek global Recording.prepare slot'u — tum mikrofon akislari buradan gecer. */

export type VoiceRecordingOwner = symbol;

let operationChain: Promise<void> = Promise.resolve();
let sharedRecording: Audio.Recording | null = null;
let activeOwner: VoiceRecordingOwner | null = null;

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = operationChain.then(fn, fn);
  operationChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function createVoiceRecordingOwner(): VoiceRecordingOwner {
  return Symbol('voice-recording-owner');
}

export function isVoiceRecordingBusyFor(owner: VoiceRecordingOwner): boolean {
  return sharedRecording !== null && activeOwner !== null && activeOwner !== owner;
}

async function unloadSharedRecording(): Promise<void> {
  const recording = sharedRecording;
  sharedRecording = null;
  activeOwner = null;
  if (!recording) return;
  try {
    recording.setOnRecordingStatusUpdate(null);
    await recording.stopAndUnloadAsync();
  } catch {
    /* zaten durmus veya unload edilmis */
  }
}

export async function tryPrepareVoiceRecording(
  owner: VoiceRecordingOwner,
  options: Audio.RecordingOptions,
): Promise<Audio.Recording | null> {
  return enqueue(async () => {
    if (sharedRecording !== null && activeOwner !== owner) {
      return null;
    }
    await unloadSharedRecording();
    const created = new Audio.Recording();
    const prepared = await prepareVoiceRecordingInstance(created, options, currentAppState());
    if (!prepared) return null;
    sharedRecording = prepared;
    activeOwner = owner;
    return sharedRecording;
  });
}

export async function releaseVoiceRecording(owner: VoiceRecordingOwner): Promise<void> {
  return enqueue(async () => {
    if (activeOwner !== owner) return;
    await unloadSharedRecording();
  });
}

export async function takeVoiceRecording(owner: VoiceRecordingOwner): Promise<Audio.Recording | null> {
  return enqueue(async () => {
    if (activeOwner !== owner || !sharedRecording) return null;
    const recording = sharedRecording;
    sharedRecording = null;
    activeOwner = null;
    return recording;
  });
}

/** @internal test reset */
export function __resetVoiceRecordingSessionForTests(): void {
  operationChain = Promise.resolve();
  sharedRecording = null;
  activeOwner = null;
}
