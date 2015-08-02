// Load in dependencies
var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');

// Define selector constants
var SELECTORS = {
  info: {
    albumArtId: 'playingAlbumArt',
    albumSelector: '.player-album',
    artistId: 'player-artist',
    containerId: 'playerSongInfo',
    infoWrapperClass: 'now-playing-info-wrapper',
    titleId: 'player-song-title'
  },
  forward: {
    buttonSelector: '#player sj-icon-button[data-id="forward"]'
  },
  playPause: {
    buttonSelector: '#player sj-icon-button[data-id="play-pause"]',
    dataId: 'play-pause',
    playingClass: 'playing'
  },
  rating: {
    // DEV: `.player-rating-container` doesn't exist until a song is playing
    containerSelector: '#playerSongInfo',
    thumbsSelector: '#player .player-rating-container [icon^="sj:thumb-"][data-rating]',
    thumbsUpSelector: '#player .player-rating-container [icon^="sj:thumb-"][data-rating="5"]',
    thumbsDownSelector: '#player .player-rating-container [icon^="sj:thumb-"][data-rating="1"]',
    thumbSelectorFormat: '#player .player-rating-container [icon^="sj:thumb-"][data-rating="{rating}"]'
  },
  repeat: {
    dataId: 'repeat',
    buttonSelector: '#player sj-icon-button[data-id="repeat"]'
  },
  rewind: {
    buttonSelector: '#player sj-icon-button[data-id="rewind"]'
  },
  shuffle: {
    dataId: 'shuffle',
    buttonSelector: '#player sj-icon-button[data-id="shuffle"]'
  },
  playback: {
    sliderId: 'material-player-progress'
  },
  volume: {
    sliderId: 'material-vslider'
  }
};

// Define bind method
function bind(context, fn) {
  return function bindFn () {
    return fn.apply(context, arguments);
  };
}

// Define our constructor
function GoogleMusic(win) {
  // If win was not provided, complain
  if (!win) {
    throw new Error('`win` was not provided to the `GoogleMusic` constructor');
  }

  // Inherit from EventEmitter
  EventEmitter.call(this);

  // Localize reference to window and document
  this.win = win;
  this.doc = win.document;

  // For each of the prototype sections
  var proto = GoogleMusic._protoObj;
  for (var protoKey in proto) {
    if (proto.hasOwnProperty(protoKey)) {
      // Define a key on our object
      this[protoKey] = {};

      // For each of the keys on the section, define a function that invokes on this original context
      var section = proto[protoKey];
      for (var sectionKey in section) {
        if (section.hasOwnProperty(sectionKey)) {
          this[protoKey][sectionKey] = bind(this, section[sectionKey]);
        }
      }

      // If there was an `init` method, run it
      if (this[protoKey].init) {
        this[protoKey].init();
      }
    }
  }
}
// Inherit from EventEmitter normally
inherits(GoogleMusic, EventEmitter);

// Define a "prototype" that will have magical invocation
var proto = GoogleMusic._protoObj = {};

// Create an info API
proto.info = {
  init: function () {
    this.info._albumEl = this.doc.querySelector(SELECTORS.info.albumSelector);
    this.info._artEl = this.doc.getElementById(SELECTORS.info.albumArtId);
    this.info._artistEl = this.doc.getElementById(SELECTORS.info.artistId);
    this.info._containerEl = this.doc.getElementById(SELECTORS.info.containerId);
    this.info._titleEl = this.doc.getElementById(SELECTORS.info.titleId);
  },
  getAlbum: function () {
    return this.info._albumEl ? this.info._albumEl.innerText : null;
  },
  getArtUrl: function () {
    return this.info._artEl ? this.info._artEl.src : null;
  },
  getArtist: function () {
    return this.info._artistEl ? this.info._artistEl.innerText : null;
  },
  getTitle: function () {
    return this.info._titleEl ? this.info._titleEl.innerText : null;
  }
};

// Create a volume API
proto.volume = {
  // Query required elements
  init: function () {
    this.volume._sliderEl = this.doc.getElementById(SELECTORS.volume.sliderId);
  },

  // Get the current volume level.
  getVolume: function () {
    return parseInt(this.volume._sliderEl.getAttribute('aria-valuenow'), 10);
  },

  // Set the volume level (0 - 100).
  setVolume: function (vol) {
    var current = this.volume.getVolume();

    if (vol > current) {
      this.volume.increaseVolume(vol - current);
    } else if (vol < current) {
      this.volume.decreaseVolume(current - vol);
    }
  },

  // Increase the volume by an amount (default of 5)
  increaseVolume: function (amount) {
    if (amount === undefined) {
      amount = 5;
    }

    for (var i = 0; i < amount; i += 5) {
      this.volume._sliderEl.increment();
    }
  },

  // Decrease the volume by an amount (default of 1)
  decreaseVolume: function (amount) {
    if (amount === undefined) {
      amount = 5;
    }

    for (var i = 0; i < amount; i += 5) {
      this.volume._sliderEl.decrement();
    }
  }
};

// Create a playback API and constants
GoogleMusic.Playback = {
  // Playback states
  STOPPED: 0,
  PAUSED: 1,
  PLAYING: 2,

  // Repeat modes
  LIST_REPEAT: 'LIST_REPEAT',
  SINGLE_REPEAT: 'SINGLE_REPEAT',
  NO_REPEAT: 'NO_REPEAT',

  // Shuffle modes
  ALL_SHUFFLE: 'ALL_SHUFFLE',
  NO_SHUFFLE: 'NO_SHUFFLE'
};
proto.playback = {
  // Query references to the media playback elements
  init: function () {
    this.playback._sliderEl = this.doc.getElementById(SELECTORS.playback.sliderId);
    this.playback._playPauseEl = this.doc.querySelector(SELECTORS.playPause.buttonSelector);
    this.playback._forwardEl = this.doc.querySelector(SELECTORS.forward.buttonSelector);
    this.playback._rewindEl = this.doc.querySelector(SELECTORS.rewind.buttonSelector);
    this.playback._shuffleEl = this.doc.querySelector(SELECTORS.shuffle.buttonSelector);
    this.playback._repeatEl = this.doc.querySelector(SELECTORS.repeat.buttonSelector);
  },

  // Time functions
  // TODO: Rename to `getPosition` for mpris consistency
  getPlaybackTime: function () {
    return parseInt(this.playback._sliderEl.getAttribute('aria-valuenow'), 10);
  },

  setPlaybackTime: function (milliseconds) {
    // Set playback value on the element and trigger a change event
    this.playback._sliderEl.value = milliseconds;
    var evt = new this.win.UIEvent('change');
    this.playback._sliderEl.dispatchEvent(evt);
  },

  getDuration: function () {
    return parseInt(this.playback._sliderEl.getAttribute('aria-valuemax'), 10);
  },

  // Playback functions
  playPause: function () { this.playback._playPauseEl.click(); },
  forward: function () { this.playback._forwardEl.click(); },
  rewind: function () { this.playback._rewindEl.click(); },

  getPlaybackStatus: function () {
    // Collect our required elements
    var status;
    var playPauseEl = this.playback._playPauseEl;

    // If we are playing, then mark our state as playing
    var playing = playPauseEl.classList.contains(SELECTORS.playPause.playingClass);
    if (playing) {
      status = GoogleMusic.Playback.PLAYING;
    } else {
      // If there is a current song, then the player is paused
      if (this.info._containerEl.childNodes.length) {
        status = GoogleMusic.Playback.PAUSED;
      // Otherwise, it's stopped
      } else {
        status = GoogleMusic.Playback.STOPPED;
      }
    }

    // Return our status
    return status;
  },

  getShuffle: function () { return this.playback._shuffleEl.getAttribute('value'); },
  toggleShuffle: function () { this.playback._shuffleEl.click(); },

  getRepeat: function () {
    return this.playback._repeatEl.getAttribute('value');
  },

  toggleRepeat: function (mode) {
    if (!mode) {
      // Toggle between repeat modes once
      this.playback._repeatEl.click();
    } else {
      // Toggle between repeat modes until the desired mode is activated
      while (this.playback.getRepeat() !== mode) {
        this.playback._repeatEl.click();
      }
    }
  },

  // Taken from the Google Play Music page
  toggleVisualization: function () {
    this.win.SJBpost('toggleVisualization');
  }
};

// Create a rating API
proto.rating = {
  // Determine if a thumb is selected or not
  _isElSelected: function (el) {
    // If the target is not outlined in its shadow DOM, then it's selected
    // jscs:disable maximumLineLength
    // DEV: Access shadow DOM via `$`
    //   Selected thumbs up:
    //   <core-icon relative="" id="icon" src="{{src}}" icon="{{icon}}" aria-label="thumb-up" role="img"></core-icon>
    //   Unselected thumbs down:
    //   <core-icon relative="" id="icon" src="{{src}}" icon="{{icon}}" aria-label="thumb-down-outline" role="img"></core-icon>
    // jscs:enable maximumLineLength
    return el.$.icon.getAttribute('aria-label').indexOf('-outline') === -1;
  },
  // Get current rating
  getRating: function () {
    var thumbEls = this.doc.querySelectorAll(SELECTORS.rating.thumbsSelector);
    var i = 0;
    var len = thumbEls.length;
    for (; i < len; i++) {
      var el = thumbEls[i];
      if (this.rating._isElSelected(el)) {
        return el.dataset.rating;
      }
    }
    return '0';
  },

  // Thumbs up
  toggleThumbsUp: function () {
    var el = this.doc.querySelector(SELECTORS.rating.thumbsUpSelector);

    if (el) {
      el.click();
    }
  },

  // Thumbs down
  toggleThumbsDown: function () {
    var el = this.doc.querySelector(SELECTORS.rating.thumbsDownSelector);

    if (el) {
      el.click();
    }
  },

  // Set a rating
  setRating: function (rating) {
    var selector = SELECTORS.rating.thumbSelectorFormat.replace('{rating}', rating);
    var el = this.doc.querySelector(selector);

    if (el && !this.rating._isElSelected(el)) {
      el.click();
    }
  }
};

// Miscellaneous functions
proto.extras = {
  // Get a shareable URL of the song on Google Play Music
  getSongURL: function () {
    var albumEl = this.doc.querySelector('.player-album');
    var artistEl = this.doc.querySelector('.player-artist');

    var urlTemplate = 'https://play.google.com/music/m/';
    var url = null;

    var parseID = function (id) {
      return id.substring(0, id.indexOf('/'));
    };

    if (albumEl === null && artistEl === null) {
      return null;
    }

    var albumId = parseID(albumEl.dataset.id);
    var artistId = parseID(artistEl.dataset.id);

    if (albumId) {
      url = urlTemplate + albumId;
    } else if (artistId) {
      url = urlTemplate + artistId;
    }

    return url;
  }
};

proto.hooks = {
  init: function () {
    // Save context for bindings
    var that = this;

    // Define mutation observer for reuse
    var MutationObserver = this.win.MutationObserver || this.win.WebKitMutationObserver;

    // When our track information changes
    var lastTitle = '';
    var lastArtist = '';
    var lastAlbum = '';
    var addObserver = new MutationObserver(function handleTrackChange (mutations) {
      mutations.forEach(function iterateMutations (mutation) {
        for (var i = 0; i < mutation.addedNodes.length; i++) {
          // If we updated our info
          var target = mutation.addedNodes[i];
          if (target.classList.contains(SELECTORS.info.infoWrapperClass)) {
            // Grab our information
            // TODO: Stop performing this normalization. We are a low level library.
            var title = that.info.getTitle() || 'Unknown';
            var artist = that.info.getArtist() || 'Unknown';
            var album = that.info.getAlbum() || 'Unknown';
            var art = that.info.getArtUrl();

            // The art may be a protocol-relative URL, so normalize it to HTTPS
            if (art && art.slice(0, 2) === '//') {
              art = 'https:' + art;
            }

            // Make sure that this is the first of the notifications for the
            // insertion of the song information elements.
            if (lastTitle !== title || lastArtist !== artist || lastAlbum !== album) {
              that.emit('change:song', {
                title: title,
                artist: artist,
                album: album,
                art: art,
                duration: that.playback.getDuration()
              });

              lastTitle = title;
              lastArtist = artist;
              lastAlbum = album;
            }
          }
        }
      });
    });
    addObserver.observe(this.doc.getElementById(SELECTORS.info.containerId), {
      childList: true,
      subtree: true
    });

    // When our shuffle state changes
    var shuffleObserver = new MutationObserver(function handleShuffleChange (mutations) {
      mutations.forEach(function iterateMutations (mutation) {
        // If the target was our shuffle element, then emit a shuffle event
        var target = mutation.target;
        var id = target.dataset.id;
        if (id === SELECTORS.shuffle.dataId) {
          that.emit('change:shuffle', that.playback.getShuffle());
        }
      });
    });
    shuffleObserver.observe(this.doc.querySelector(SELECTORS.shuffle.buttonSelector), {
      attributes: true
    });

    // When our repeat state changes
    var repeatObserver = new MutationObserver(function handleRepeatChange (mutations) {
      mutations.forEach(function iterateMutations (mutation) {
        // If the target was our repeat element, then emit a repeat state change
        var target = mutation.target;
        var id = target.dataset.id;
        if (id === SELECTORS.repeat.dataId) {
          that.emit('change:repeat', that.playback.getRepeat());
        }
      });
    });
    repeatObserver.observe(this.doc.querySelector(SELECTORS.repeat.buttonSelector), {
      attributes: true
    });

    // When our playback state changes
    var playbackObserver = new MutationObserver(function handlePlaybackChange (mutations) {
      mutations.forEach(function iterateMutations (mutation) {
        // If the updated element is our play/pause button, then emit an update
        var target = mutation.target;
        var id = target.dataset.id;
        if (id === SELECTORS.playPause.dataId) {
          that.emit('change:playback', that.playback.getPlaybackStatus());
        }
      });
    });
    playbackObserver.observe(this.doc.querySelector(SELECTORS.playPause.buttonSelector), {
      attributes: true
    });

    // When our playback slider changes
    var playbackTimeObserver = new MutationObserver(function handlePlaybackTimeChange (mutations) {
      mutations.forEach(function iterateMutations (mutation) {
        // If the updated element was our slider, then emit its data
        var target = mutation.target;
        if (target.id === SELECTORS.playback.sliderId) {
          that.emit('change:playback-time', {
            current: that.playback.getPlaybackTime(),
            total: that.playback.getDuration()
          });
        }
      });
    });
    playbackTimeObserver.observe(this.doc.getElementById(SELECTORS.playback.sliderId), {
      attributes: true
    });

    // When our rating indicators change
    var ratingObserver = new MutationObserver(function handleRatingChange (mutations) {
      mutations.forEach(function iterateMutations (mutation) {
        var target = mutation.target;
        // If we are looking at a rating button and it's selected, emit a notification
        // DEV: We can receive the container easily
        if (target.dataset.rating !== undefined && that.rating._isElSelected(target)) {
          that.emit('change:rating', target.dataset.rating);
        }
      });
    });
    ratingObserver.observe(this.doc.querySelector(SELECTORS.rating.containerSelector), {
      attributes: true,
      subtree: true
    });
  }
};

// Expose selectors as a class property
GoogleMusic.SELECTORS = SELECTORS;

// Export our constructor
module.exports = GoogleMusic;
