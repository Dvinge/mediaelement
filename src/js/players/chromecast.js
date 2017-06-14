'use strict';

export default class ChromecastPlayer {

	constructor (player, controller, media, enableTracks) {
		this.player = player;
		this.controller = controller;
		this.media = media;
		this.ended = false;
		this.enableTracks = enableTracks;

		// Add event listeners for player changes which may occur outside sender app
		this.controller.addEventListener(cast.framework.RemotePlayerEventType.IS_PAUSED_CHANGED, () => {
			if (this.player.isPaused) {
				this.pause();
			} else {
				this.play();
			}

			this.ended = false;
		});
		this.controller.addEventListener(cast.framework.RemotePlayerEventType.IS_MUTED_CHANGED, () => {
			this.setMuted(this.player.isMuted);
			this.volume = 0;
		});
		this.controller.addEventListener(cast.framework.RemotePlayerEventType.IS_MEDIA_LOADED_CHANGED, () => {
			setTimeout(() => {
				const event = mejs.Utils.createEvent('loadedmetadata', this.media);
				this.media.dispatchEvent(event);
			}, 50);
		});
		this.controller.addEventListener(cast.framework.RemotePlayerEventType.VOLUME_LEVEL_CHANGED, () => {
			this.volume = this.player.volumeLevel;
			const event = mejs.Utils.createEvent('volumechange', this.media);
			this.media.dispatchEvent(event);
		});
		this.controller.addEventListener(cast.framework.RemotePlayerEventType.DURATION_CHANGED, () => {
			setTimeout(() => {
				const event = mejs.Utils.createEvent('timeupdate', this.media);
				this.media.dispatchEvent(event);
			}, 50);
		});
		this.controller.addEventListener(cast.framework.RemotePlayerEventType.CURRENT_TIME_CHANGED, () => {
			setTimeout(() => {
				const event = mejs.Utils.createEvent('timeupdate', this.media);
				this.media.dispatchEvent(event);
			}, 50);

			if (this.getCurrentTime() >= this.getDuration()) {
				this.ended = true;
				setTimeout(() => {
					const event = mejs.Utils.createEvent('ended', this.media);
					this.media.dispatchEvent(event);
				}, 50);
			}
		});
		this.controller.addEventListener(cast.framework.RemotePlayerEventType.IS_MUTED_CHANGED, () => {
			this.setMuted(this.player.isMuted)
		});

		this.load();
	}

	play () {
		if (this.player.isPaused) {
			this.controller.playOrPause();
			const event = mejs.Utils.createEvent('play', this.media);
			this.media.dispatchEvent(event);
		}
	}

	pause () {
		if (!this.player.isPaused) {
			this.controller.playOrPause();
			const event = mejs.Utils.createEvent('pause', this.media);
			this.media.dispatchEvent(event);
		}
	}

	paused() {
		return this.player.isPaused;
	}

	muted () {
		return this.player.isMuted;
	}

	ended () {
		return this.ended;
	}

	readyState () {
		return this.media.originalNode.readyState;
	}

	load () {
		const
			url = this.media.originalNode.getSrc(),
			type = mejs.Utils.getTypeFromFile(url),
			mediaInfo = new chrome.cast.media.MediaInfo(url, type),
			castSession = cast.framework.CastContext.getInstance().getCurrentSession()
		;

		const event = mejs.Utils.createEvent('pause', this.media);
		this.media.dispatchEvent(event);

		// Find captions/audioTracks
		if (this.enableTracks === true) {
			const
				tracks = [],
				children = this.media.originalNode.children
			;

			let counter = 1;

			for (let i = 0, total = children.length; i < total; i++) {
				const
					child = children[i],
					tag = child.tagName.toLowerCase();

				if (tag === 'track' && (child.getAttribute('kind') === 'subtitles' || child.getAttribute('kind') === 'captions')) {
					const el = new chrome.cast.media.Track(counter, chrome.cast.media.TrackType.TEXT);
					el.trackContentId = mejs.Utils.absolutizeUrl(child.getAttribute('src'));
					el.trackContentType = 'text/vtt';
					el.subtype = chrome.cast.media.TextTrackType.SUBTITLES;
					el.name = child.getAttribute('label');
					el.language = child.getAttribute('srclang');
					el.customData = null;
					tracks.push(el);
					counter++;
				}
			}
			mediaInfo.textTrackStyle = new chrome.cast.media.TextTrackStyle();
			mediaInfo.tracks = tracks;
		}

		mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
		mediaInfo.streamType = chrome.cast.media.StreamType.BUFFERED;
		mediaInfo.customData = null;
		mediaInfo.duration = null;

		if (this.media.originalNode.getAttribute('data-cast-title')) {
			mediaInfo.metadata.title = this.media.originalNode.getAttribute('data-cast-title');
		}

		if (this.media.originalNode.getAttribute('data-cast-description')) {
			mediaInfo.metadata.subtitle = this.media.originalNode.getAttribute('data-cast-description');
		}

		if (this.media.originalNode.getAttribute('poster')) {
			mediaInfo.metadata.images = [
				{'url': mejs.Utils.absolutizeUrl(this.media.originalNode.getAttribute('poster'))}
			];
		}

		const request = new chrome.cast.media.LoadRequest(mediaInfo);

		castSession.loadMedia(request).then(() => {
			// Autoplay media in the current position
			const currentTime = this.media.originalNode.getCurrentTime();
			this.setCurrentTime(currentTime);
			this.controller.playOrPause();

			setTimeout(() => {
				const event = mejs.Utils.createEvent('play', this.media);
				this.media.dispatchEvent(event);
			}, 50);
		}, (error) => {
			this._getErrorMessage(error);
		});
	}

	setMuted (value) {
		if (value === true && !this.player.isMuted) {
			this.controller.muteOrUnmute();
		} else if (value === false && this.player.isMuted) {
			this.controller.muteOrUnmute();
		}
		setTimeout(() => {
			const event = mejs.Utils.createEvent('volumechange', this.media);
			this.media.dispatchEvent(event);
		}, 50);
	}

	setCurrentTime (value) {
		this.player.currentTime = value;
		this.currentTime = this.player.currentTime;
		this.controller.seek();
		setTimeout(() => {
			const event = mejs.Utils.createEvent('timeupdate', this.media);
			this.media.dispatchEvent(event);
		}, 50);
	}

	getCurrentTime () {
		return this.player.currentTime;
	}

	getDuration () {
		return this.player.duration;
	}

	setVolume (value) {
		this.volume = value;
		this.player.volumeLevel = value;
		this.controller.setVolumeLevel();
		setTimeout(() => {
			const event = mejs.Utils.createEvent('volumechange', this.media);
			this.media.dispatchEvent(event);
		}, 50);
	}

	getVolume () {
		return this.player.volumeLevel;
	}

	getSrc () {
		return this.media.originalNode.getSrc();
	}

	setSrc (value) {
		const url = typeof value === 'string' ? value : value[0].src;
		this.media.originalNode.setAttribute('src', url);
		this.load();
	}

	_getErrorMessage (error) {

		const description = error.description ? ` : ${error.description}` : '.';

		let message;

		switch (error.code) {
			case chrome.cast.ErrorCode.API_NOT_INITIALIZED:
				message = `The API is not initialized${description}`;
				break;
			case chrome.cast.ErrorCode.CANCEL:
				message = `The operation was canceled by the user${description}`;
				break;
			case chrome.cast.ErrorCode.CHANNEL_ERROR:
				message = `A channel to the receiver is not available${description}`;
				break;
			case chrome.cast.ErrorCode.EXTENSION_MISSING:
				message = `The Cast extension is not available${description}`;
				break;
			case chrome.cast.ErrorCode.INVALID_PARAMETER:
				message = `The parameters to the operation were not valid${description}`;
				break;
			case chrome.cast.ErrorCode.RECEIVER_UNAVAILABLE:
				message = `No receiver was compatible with the session request${description}`;
				break;
			case chrome.cast.ErrorCode.SESSION_ERROR:
				message = `A session could not be created, or a session was invalid${description}`;
				break;
			case chrome.cast.ErrorCode.TIMEOUT:
				message = `The operation timed out${description}`;
				break;
			default:
				message = `Unknown error: ${error.code}`;
				break;
		}

		console.error(message);
	}
}