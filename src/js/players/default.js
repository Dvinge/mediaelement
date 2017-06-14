'use strict';

export default class DefaultPlayer {

	/**
	 *
	 * @param {MediaElement} media
	 * @param {Boolean} isVideo
	 * @param {String} classPrefix
	 */
	constructor (media, isVideo, classPrefix) {
		this.media = media;
		this.isVideo = isVideo;
		this.classPrefix = classPrefix;
	}

	play () {
		const t = this;

		// only load if the current time is 0 to ensure proper playing
		if (t.media.getCurrentTime() <= 0) {
			t.load();
		}
		t.media.play();
	}

	pause () {
		this.media.pause();
	}

	load () {
		const t = this;

		if (!t.isLoaded) {
			t.media.load();
		}

		t.isLoaded = true;
	}

	setMuted (muted) {
		this.media.setMuted(muted);
	}

	paused () {
		return this.media.paused;
	}

	muted () {
		return this.media.muted;
	}

	ended () {
		return this.media.ended;
	}

	readyState () {
		return this.media.readyState;
	}

	setCurrentTime (time) {
		this.media.setCurrentTime(time);
	}

	getCurrentTime () {
		return this.media.currentTime;
	}

	getDuration () {
		return this.media.getDuration();
	}

	setVolume (volume) {
		this.media.setVolume(volume);
	}

	getVolume () {
		return this.media.getVolume();
	}

	setSrc (src) {
		const
			t = this,
			layer = document.getElementById(`${t.media.id}-iframe-overlay`)
		;

		if (layer) {
			layer.remove();
		}

		t.media.setSrc(src);
		t.createIframeLayer();
	}

	/**
	 * Append layer to manipulate `<iframe>` elements safely.
	 *
	 * This allows the user to trigger events properly given that mouse/click don't get lost in the `<iframe>`.
	 */
	createIframeLayer () {
		const t = this;

		if (t.isVideo && t.media.rendererName !== null && t.media.rendererName.indexOf('iframe') > -1 &&
			!document.getElementById(`${t.media.id}-iframe-overlay`)) {

			const layer = document.createElement('div'),
				target = document.getElementById(`${t.media.id}_${t.media.rendererName}`);

			layer.id = `${t.media.id}-iframe-overlay`;
			layer.className = `${t.classPrefix}iframe-overlay`;
			layer.addEventListener('click', (e) => {
				if (t.options.clickToPlayPause) {
					if (t.media.paused) {
						t.media.play();
					} else {
						t.media.pause();
					}

					e.preventDefault();
					e.stopPropagation();
				}
			});

			target.parentNode.insertBefore(layer, target);
		}
	}
}