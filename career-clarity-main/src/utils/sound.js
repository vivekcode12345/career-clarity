const SOUND_PREF_KEY = "ui_sound_enabled";

let audioContext = null;

function getAudioContext() {
	if (typeof window === "undefined") return null;
	const Ctx = window.AudioContext || window.webkitAudioContext;
	if (!Ctx) return null;
	if (!audioContext) {
		try {
			audioContext = new Ctx();
		} catch {
			return null;
		}
	}
	return audioContext;
}

function playTone({ frequency = 800, duration = 0.05, volume = 0.07, type = "sine" } = {}) {
	try {
		if (!getSoundEnabled()) return;
		const context = getAudioContext();
		if (!context) return;

		if (context.state === "suspended") {
			context.resume().catch(() => {});
		}

		const oscillator = context.createOscillator();
		const gainNode = context.createGain();
		const now = context.currentTime;

		oscillator.type = type;
		oscillator.frequency.setValueAtTime(frequency, now);

		gainNode.gain.setValueAtTime(0.0001, now);
		gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), now + 0.01);
		gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

		oscillator.connect(gainNode);
		gainNode.connect(context.destination);

		oscillator.start(now);
		oscillator.stop(now + duration + 0.09);
	} catch {
		// Intentionally silent: sound should never break UI interactions.
	}
}

export function getSoundEnabled() {
	if (typeof window === "undefined") return true;
	const value = window.localStorage.getItem(SOUND_PREF_KEY);
	if (value === null) return true;
	return value === "true";
}

export function setSoundEnabled(value) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(SOUND_PREF_KEY, value ? "true" : "false");
}

export function playClickSound() {
	playTone({ frequency: 800, duration: 0.05, volume: 0.07, type: "sine" });
}

export function playSuccessSound() {
	playTone({ frequency: 1000, duration: 0.06, volume: 0.08, type: "sine" });
}

export function playErrorSound() {
	playTone({ frequency: 320, duration: 0.07, volume: 0.08, type: "sine" });
}
