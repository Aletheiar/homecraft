import test from 'node:test';
import assert from 'node:assert/strict';
const { neteasePlaylist } = await import('../world/music-source.js').catch(()=>({}));
test('playlist links normalize to official non-autoplay URLs without sharing tokens',()=>{
  assert.equal(typeof neteasePlaylist,'function');
  for(const input of ['18559092586','https://music.163.com/playlist?id=18559092586&uct2=private','https://music.163.com/#/playlist?id=18559092586','https://m.music.163.com/playlist?id=18559092586']) {
    assert.deepEqual(neteasePlaylist(input),{id:'18559092586',url:'https://music.163.com/playlist?id=18559092586',embed:'https://music.163.com/outchain/player?type=0&id=18559092586&auto=0&height=430'});
  }
});
test('non-playlists and untrusted hosts cannot become music embeds',()=>{
  assert.equal(typeof neteasePlaylist,'function');
  for(const input of ['', '0','-2','1e5','https://music.163.com.evil.test/playlist?id=123','javascript:alert(1)','https://music.163.com/song?id=123','https://music.163.com@evil.test/playlist?id=123','https://user@music.163.com/playlist?id=123','https://music.163.com:8000/playlist?id=123','https://music.163.com/playlist?id=1&id=2']) assert.equal(neteasePlaylist(input),null,input);
});
