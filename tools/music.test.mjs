import test from 'node:test';
import assert from 'node:assert/strict';
import { musicTime, describeTrack, isAudioFile } from '../world/music.js';
import { COURTYARD_TRACKS } from '../world/music-library.js';

test('formats track times without drifting past a minute', () => {
  assert.equal(musicTime(0), '0:00');
  assert.equal(musicTime(5.9), '0:05');
  assert.equal(musicTime(65), '1:05');
  assert.equal(musicTime(3599), '59:59');
  assert.equal(musicTime(NaN), '0:00');
  assert.equal(musicTime(-2), '0:00');
});

test('reads artist and title from common file names', () => {
  assert.deepEqual(describeTrack('Artist - Title.mp3'), { artist: 'Artist', title: 'Title' });
  assert.deepEqual(describeTrack('A - B - C.ogg'), { artist: 'A', title: 'B - C' });
  assert.deepEqual(describeTrack('庭院 - 晚风.flac'), { artist: '庭院', title: '晚风' });
  assert.deepEqual(describeTrack('Song.wav'), { artist: '', title: 'Song' });
});

test('accepts audio by type or extension only', () => {
  assert.equal(isAudioFile({ name: 'track.MP3', type: '' }), true);
  assert.equal(isAudioFile({ name: 'recording', type: 'audio/webm' }), true);
  assert.equal(isAudioFile({ name: 'cover.png', type: 'image/png' }), false);
  assert.equal(isAudioFile(null), false);
});

test('the public manifest has stable, unique numbered tracks', () => {
  assert.ok(COURTYARD_TRACKS.length > 0);
  const ids = new Set();
  let total = 0;
  for (const track of COURTYARD_TRACKS) {
    assert.match(track.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(ids.has(track.id), false, `duplicate id ${track.id}`);
    ids.add(track.id);
    assert.ok(track.title.length > 0 && track.artist.length > 0, track.id);
    assert.ok(track.duration > 0, track.id);
    assert.match(track.src, /\/assets\/music\/\d{2}-[a-z0-9-]+\.mp3$/, track.id);
    total += track.duration;
  }
  assert.ok(total > 60, 'the collection lasts more than a minute');
});
