import { Core, Events } from '@clappr/core'
import HlsjsPlayback from './hls.js'
import HLSJS from 'hls.js'

describe('HLS playback', function() {
  beforeEach(() => {
    this.isSupportedStub = jest.spyOn(HLSJS, 'isSupported').mockImplementation(() => true)
  })

  // afterEach(() => {
  //   this.isSupportedStub.restore()
  // })

  it('should be able to identify it can play resources independently of the file extension case', function() {
    expect(HlsjsPlayback.canPlay('/relative/video.m3u8')).toBeTruthy()
    expect(HlsjsPlayback.canPlay('/relative/VIDEO.M3U8')).toBeTruthy()
    expect(HlsjsPlayback.canPlay('/relative/video.m3u8?foobarQuery=1234#somefragment')).toBeTruthy()
    expect(HlsjsPlayback.canPlay('whatever_no_extension?foobarQuery=1234#somefragment', 'application/x-mpegURL' )).toBeTruthy()
    expect(HlsjsPlayback.canPlay('//whatever_no_extension?foobarQuery=1234#somefragment', 'application/x-mpegURL' )).toBeTruthy()
  })

  it('can play regardless of any mime type letter case', function() {
    expect(HlsjsPlayback.canPlay('/path/list.m3u8', 'APPLICATION/VND.APPLE.MPEGURL' )).toBeTruthy()
    expect(HlsjsPlayback.canPlay('whatever_no_extension?foobarQuery=1234#somefragment', 'application/x-mpegurl' )).toBeTruthy()
  })

  it('should ensure it does not create an audio tag if audioOnly is not set', function() {
    let options = { src: 'http://clappr.io/video.m3u8' },
      playback = new HlsjsPlayback(options)
    expect(playback.tagName).toEqual('video')
    options = { src: 'http://clappr.io/video.m3u8', mimeType: 'application/x-mpegurl' }
    playback = new HlsjsPlayback(options)
    expect(playback.tagName).toEqual('video')
  })

  it('should play on an audio tag if audioOnly is set', function() {
    let options = { src: 'http://clappr.io/video.m3u8', playback: { audioOnly: true } },
      playback = new HlsjsPlayback(options)
    expect(playback.tagName).toEqual('audio')
  })

  describe('options backwards compatibility', function() {
    // backwards compatibility (TODO: remove on 0.3.0)
    it('should set options.playback as a reference to options if options.playback not set', function() {
      let options = { src: 'http://clappr.io/video.m3u8' },
        hls = new HlsjsPlayback(options)
      expect(hls.options.playback).toEqual(hls.options)
      options = { src: 'http://clappr.io/video.m3u8', playback: { test: true } }
      hls = new HlsjsPlayback(options)
      expect(hls.options.playback.test).toEqual(true)
    })
  })

  describe('HlsjsPlayback.js configuration', function() {
    it('should use hlsjsConfig from playback options', function() {
      const options = {
        src: 'http://clappr.io/video.m3u8',
        playback: {
          hlsMinimumDvrSize: 1,
          hlsjsConfig: {
            someHlsjsOption: 'value'
          }
        }
      }
      const playback = new HlsjsPlayback(options)
      playback._setup()
      expect(playback._hls.config.someHlsjsOption).toEqual('value')
    })

    it('should use hlsjsConfig from player options as fallback', function() {
      const options = {
        src: 'http://clappr.io/video.m3u8',
        hlsMinimumDvrSize: 1,
        hlsjsConfig: {
          someHlsjsOption: 'value'
        }
      }
      const playback = new HlsjsPlayback(options)
      playback._setup()
      expect(playback._hls.config.someHlsjsOption).toEqual('value')
    })
  })

  it('should trigger a playback error if source load failed', function() {
    jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => {})
    let resolveFn = undefined
    const promise = new Promise((resolve) => {
      resolveFn = resolve
    })
    let options = {
      src: 'http://clappr.io/notfound.m3u8',
      hlsRecoverAttempts: 0,
      mute: true
    }

    const core = new Core({})
    const playback = new HlsjsPlayback(options, null, core.playerError)
    playback.on(Events.PLAYBACK_ERROR, (e) => resolveFn(e))
    playback.play()

    promise.then((e) => {
      expect(e.raw.type).toEqual(HLSJS.ErrorTypes.NETWORK_ERROR)
      expect(e.raw.details).toEqual(HLSJS.ErrorDetails.MANIFEST_LOAD_ERROR)
    })
  })

  it('registers PLAYBACK_FRAGMENT_CHANGED event', function() {
    expect(Events.Custom.PLAYBACK_FRAGMENT_CHANGED).toEqual('playbackFragmentChanged')
  })

  it('registers PLAYBACK_FRAGMENT_PARSING_METADATA event', function() {
    expect(Events.Custom.PLAYBACK_FRAGMENT_PARSING_METADATA).toEqual('playbackFragmentParsingMetadata')
  })

  xit('levels', function() {
    let playback
    beforeEach(() => {
      const options = { src: 'http://clappr.io/foo.m3u8' }
      playback = new HlsjsPlayback(options)
      playback.setupHls()
      // NOTE: rather than trying to call playback.setupHls, we'll punch a new one in place
      playback.hls = {
        levels: []
      }
      playback.fillLevels()
    })

    it('supports specifying the level', () => {
      // AUTO by default (-1)
      expect(playback.currentLevel).to.equal(-1)

      // Supports other level specification. Should keep track of it
      // on itself and by proxy on the HLS.js object.
      playback.currentLevel = 0
      expect(playback.currentLevel).to.equal(0)
      expect(playback.hls.currentLevel).to.equal(0)
      playback.currentLevel = 1
      expect(playback.currentLevel).to.equal(1)
      expect(playback.hls.currentLevel).to.equal(1)
    })
  })
})
