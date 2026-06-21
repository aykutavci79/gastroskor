import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isIgnorableBackgroundPrepareError,
  prepareVoiceRecordingInstance,
  shouldSkipVoicePrepare,
} from './voice-prepare-guard.ts';

describe('voice-prepare-guard', () => {
  it('skips prepare when AppState is background', async () => {
    let prepareCalled = false;
    const recording = {
      async prepareToRecordAsync() {
        prepareCalled = true;
      },
    };

    const result = await prepareVoiceRecordingInstance(recording, {}, 'background');

    assert.equal(result, null);
    assert.equal(prepareCalled, false);
    assert.equal(shouldSkipVoicePrepare('background'), true);
  });

  it('returns null without throwing when prepare fails with background expo error', async () => {
    let unloadCalled = false;
    const recording = {
      async prepareToRecordAsync() {
        throw new Error(
          "Prepare encountered an error: Error Domain=EXModulesErrorDomain Code=0 'This experience is currently in the background, so audio recording cannot be configured.'",
        );
      },
      async stopAndUnloadAsync() {
        unloadCalled = true;
      },
    };

    const result = await prepareVoiceRecordingInstance(recording, {}, 'active');

    assert.equal(result, null);
    assert.equal(unloadCalled, true);
    assert.equal(
      isIgnorableBackgroundPrepareError(
        new Error('Prepare encountered an error: currently in the background'),
        true,
      ),
      true,
    );
  });

  it('rethrows non-background prepare errors', async () => {
    const recording = {
      async prepareToRecordAsync() {
        throw new Error('Microphone permission denied');
      },
    };

    await assert.rejects(
      () => prepareVoiceRecordingInstance(recording, {}, 'active'),
      /Microphone permission denied/,
    );
  });
});
