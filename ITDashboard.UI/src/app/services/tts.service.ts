// services/tts.service.ts
import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class TTSService {
    private synthesis: SpeechSynthesis;
    private voices: SpeechSynthesisVoice[] = [];
    private isSpeaking = false;
    private queue: string[] = [];

    constructor() {
        this.synthesis = window.speechSynthesis;
        if (!this.synthesis) {
            console.warn('⚠️ Speech synthesis not supported in this browser');
        } else {
            console.log('✅ Speech synthesis initialized');
            this.loadVoices();
        }
    }

    private loadVoices(): void {
        if (this.synthesis) {
            this.voices = this.synthesis.getVoices();
            if (this.voices.length === 0) {
                this.synthesis.onvoiceschanged = () => {
                    this.voices = this.synthesis.getVoices();
                };
            }
        }
    }

    speak(text: string, options?: { rate?: number; pitch?: number; volume?: number; lang?: string }): void {
        if (!this.synthesis) {
            console.warn('Speech synthesis not supported');
            return;
        }
        console.log('🔊 TTS Speaking:', text); // Add this debug log
        // Cancel any ongoing speech
        this.stop();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = options?.rate || 1;
        utterance.pitch = options?.pitch || 1;
        utterance.volume = options?.volume || 1;
        utterance.lang = options?.lang || 'en-US';

        // Try to find a good voice
        const preferredVoice = this.voices.find(v =>
            v.lang.startsWith('en') && v.name.includes('Google')
        ) || this.voices.find(v => v.lang.startsWith('en'));

        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        utterance.onstart = () => {
            this.isSpeaking = true;
        };

        utterance.onend = () => {
            this.isSpeaking = false;
            // Process next in queue
            if (this.queue.length > 0) {
                const next = this.queue.shift();
                if (next) {
                    this.speak(next);
                }
            }
        };

        utterance.onerror = () => {
            this.isSpeaking = false;
        };

        this.synthesis.speak(utterance);
    }

    speakWithQueue(text: string): void {
        if (this.isSpeaking) {
            this.queue.push(text);
        } else {
            this.speak(text);
        }
    }

    stop(): void {
        if (this.synthesis) {
            this.synthesis.cancel();
        }
        this.isSpeaking = false;
        this.queue = [];
    }

    getVoices(): SpeechSynthesisVoice[] {
        return this.voices;
    }
}