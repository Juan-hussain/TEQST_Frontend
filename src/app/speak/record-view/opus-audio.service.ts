import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import OpusRecorder from 'opus-recorder';

export interface AudioFormat {
  type: 'wav' | 'opus';
  mimeType: string;
  extension: string;
  quality: 'low' | 'medium' | 'high';
  bitrate: number;
  sampleRate: number;
  channels: number;
}

@Injectable({
  providedIn: 'root'
})
export class OpusAudioService {
  private opusRecorder: OpusRecorder;
  private isOpusSupported = false;
  private currentFormat: AudioFormat;
  private isRecording$ = new BehaviorSubject<boolean>(false);
  private recordingProgress$ = new BehaviorSubject<number>(0);

  // Predefined Opus quality presets
  private readonly OPUS_PRESETS: { [key: string]: AudioFormat } = {
    low: {
      type: 'opus',
      mimeType: 'audio/opus',
      extension: 'opus',
      quality: 'low',
      bitrate: 16000,
      sampleRate: 16000,
      channels: 1
    },
    medium: {
      type: 'opus',
      mimeType: 'audio/opus',
      extension: 'opus',
      quality: 'medium',
      bitrate: 32000,
      sampleRate: 24000,
      channels: 1
    },
    high: {
      type: 'opus',
      mimeType: 'audio/opus',
      extension: 'opus',
      quality: 'high',
      bitrate: 64000,
      sampleRate: 48000,
      channels: 1
    }
  };

  // WAV fallback format
  private readonly WAV_FALLBACK: AudioFormat = {
    type: 'wav',
    mimeType: 'audio/wav',
    extension: 'wav',
    quality: 'medium',
    bitrate: 16000,
    sampleRate: 16000,
    channels: 1
  };

  constructor() {
    this.currentFormat = this.OPUS_PRESETS.medium; // Default to medium quality
    this.initializeOpusRecorder();
  }

  private async initializeOpusRecorder(): Promise<void> {
    try {
      // Check if Opus is supported
      if (typeof OpusRecorder !== 'undefined') {
        this.opusRecorder = new OpusRecorder({
          encoderPath: '/assets/opus-recorder/encoderWorker.min.js',
          encoderApplication: 2049, // OPUS_APPLICATION_AUDIO
          encoderFrameSize: 960, // FRAME_SIZE_20MS
          encoderComplexity: 6,
          encoderBitrate: this.currentFormat.bitrate,
          encoderSampleRate: this.currentFormat.sampleRate,
          encoderChannels: 1
        });
        this.isOpusSupported = true;
        console.log('Opus recorder initialized successfully');
      } else {
        console.warn('Opus recorder not available, falling back to WAV');
        this.isOpusSupported = false;
      }
    } catch (error) {
      console.error('Failed to initialize Opus recorder:', error);
      this.isOpusSupported = false;
    }
  }

  /**
   * Get available audio formats
   */
  getAvailableFormats(): AudioFormat[] {
    const formats = [];
    
    if (this.isOpusSupported) {
      formats.push(...Object.values(this.OPUS_PRESETS));
    }
    
    // Always include WAV as fallback
    formats.push(this.WAV_FALLBACK);
    
    return formats;
  }

  /**
   * Set the current audio format
   */
  setAudioFormat(format: AudioFormat): void {
    this.currentFormat = format;
    
    if (this.isOpusSupported && format.type === 'opus') {
      // Update Opus encoder settings
      this.opusRecorder.encoderBitrate = format.bitrate;
      this.opusRecorder.encoderSampleRate = format.sampleRate;
    }
  }

  /**
   * Get current audio format
   */
  getCurrentFormat(): AudioFormat {
    return this.currentFormat;
  }

  /**
   * Check if Opus is supported
   */
  isOpusCodecSupported(): boolean {
    return this.isOpusSupported;
  }

  /**
   * Start recording with current format
   */
  async startRecording(stream: MediaStream): Promise<void> {
    if (!stream) {
      throw new Error('No media stream provided');
    }

    this.isRecording$.next(true);
    this.recordingProgress$.next(0);

    try {
      if (this.isOpusSupported && this.currentFormat.type === 'opus') {
        await this.startOpusRecording(stream);
      } else {
        await this.startWavRecording(stream);
      }
    } catch (error) {
      this.isRecording$.next(false);
      throw error;
    }
  }

  private async startOpusRecording(stream: MediaStream): Promise<void> {
    if (!this.opusRecorder) {
      throw new Error('Opus recorder not initialized');
    }

    return new Promise((resolve, reject) => {
      this.opusRecorder.start(stream)
        .then(() => {
          console.log('Opus recording started');
          resolve();
        })
        .catch(reject);
    });
  }

  private async startWavRecording(stream: MediaStream): Promise<void> {
    // This would integrate with the existing RecordRTC implementation
    // For now, we'll throw an error to indicate WAV recording should use the existing service
    throw new Error('WAV recording should use the existing AudioRecordingService');
  }

  /**
   * Stop recording and get the audio blob
   */
  async stopRecording(): Promise<{ blob: Blob; format: AudioFormat }> {
    if (!this.isRecording$.value) {
      throw new Error('No recording in progress');
    }

    try {
      let blob: Blob;
      
      if (this.isOpusSupported && this.currentFormat.type === 'opus') {
        blob = await this.stopOpusRecording();
      } else {
        throw new Error('WAV recording should use the existing AudioRecordingService');
      }

      this.isRecording$.next(false);
      this.recordingProgress$.next(0);

      return {
        blob,
        format: this.currentFormat
      };
    } catch (error) {
      this.isRecording$.next(false);
      this.recordingProgress$.next(0);
      throw error;
    }
  }

  private async stopOpusRecording(): Promise<Blob> {
    if (!this.opusRecorder) {
      throw new Error('Opus recorder not initialized');
    }

    return new Promise((resolve, reject) => {
      this.opusRecorder.stop()
        .then((blob) => {
          console.log('Opus recording stopped, blob size:', blob.size);
          resolve(blob);
        })
        .catch(reject);
    });
  }

  /**
   * Get recording state
   */
  getRecordingState(): Observable<boolean> {
    return this.isRecording$.asObservable();
  }

  /**
   * Get recording progress
   */
  getRecordingProgress(): Observable<number> {
    return this.recordingProgress$.asObservable();
  }

  /**
   * Update recording progress (called periodically during recording)
   */
  updateProgress(progress: number): void {
    this.recordingProgress$.next(Math.min(100, Math.max(0, progress)));
  }

  /**
   * Convert audio blob to different format
   */
  async convertAudioFormat(blob: Blob, targetFormat: AudioFormat): Promise<Blob> {
    if (targetFormat.type === 'opus' && this.isOpusSupported) {
      // Convert to Opus
      return this.convertToOpus(blob, targetFormat);
    } else if (targetFormat.type === 'wav') {
      // Convert to WAV
      return this.convertToWav(blob, targetFormat);
    } else {
      throw new Error(`Unsupported target format: ${targetFormat.type}`);
    }
  }

  private async convertToOpus(blob: Blob, targetFormat: AudioFormat): Promise<Blob> {
    // This would require additional audio processing libraries
    // For now, we'll return the original blob
    console.warn('Audio conversion to Opus not yet implemented');
    return blob;
  }

  private async convertToWav(blob: Blob, targetFormat: AudioFormat): Promise<Blob> {
    // This would require additional audio processing libraries
    // For now, we'll return the original blob
    console.warn('Audio conversion to WAV not yet implemented');
    return blob;
  }

  /**
   * Get file extension for current format
   */
  getFileExtension(): string {
    return this.currentFormat.extension;
  }

  /**
   * Get MIME type for current format
   */
  getMimeType(): string {
    return this.currentFormat.mimeType;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.opusRecorder) {
      this.opusRecorder.destroy();
    }
    this.isRecording$.next(false);
    this.recordingProgress$.next(0);
  }
}
