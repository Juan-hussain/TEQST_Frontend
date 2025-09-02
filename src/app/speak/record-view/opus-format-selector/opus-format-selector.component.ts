import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { OpusAudioService, AudioFormat } from '../opus-audio.service';

@Component({
  selector: 'app-opus-format-selector',
  templateUrl: './opus-format-selector.component.html',
  styleUrls: ['./opus-format-selector.component.scss']
})
export class OpusFormatSelectorComponent implements OnInit {
  @Input() showFormatSelector = true;
  @Output() formatChanged = new EventEmitter<AudioFormat>();
  
  availableFormats: AudioFormat[] = [];
  selectedFormat: AudioFormat;
  isOpusSupported = false;
  
  constructor(private opusAudioService: OpusAudioService) {}
  
  ngOnInit(): void {
    this.loadAvailableFormats();
    this.checkOpusSupport();
  }
  
  private loadAvailableFormats(): void {
    this.availableFormats = this.opusAudioService.getAvailableFormats();
    this.selectedFormat = this.opusAudioService.getCurrentFormat();
  }
  
  private checkOpusSupport(): void {
    this.isOpusSupported = this.opusAudioService.isOpusCodecSupported();
  }
  
  onFormatChange(format: AudioFormat): void {
    this.selectedFormat = format;
    this.opusAudioService.setAudioFormat(format);
    this.formatChanged.emit(format);
  }
  
  getFormatDisplayName(format: AudioFormat): string {
    if (format.type === 'opus') {
      return `Opus (${format.quality}) - ${format.bitrate}kbps`;
    } else {
      return `WAV - ${format.sampleRate}Hz`;
    }
  }
  
  getFormatDescription(format: AudioFormat): string {
    if (format.type === 'opus') {
      switch (format.quality) {
        case 'low':
          return 'Good for speech, small file size';
        case 'medium':
          return 'Balanced quality and file size';
        case 'high':
          return 'High quality, larger file size';
        default:
          return '';
      }
    } else {
      return 'Uncompressed audio format';
    }
  }
  
  getFileSizeEstimate(format: AudioFormat, durationSeconds: number = 60): string {
    if (format.type === 'opus') {
      // Rough estimate: bitrate * duration / 8 bits per byte
      const sizeBytes = (format.bitrate * 1000 * durationSeconds) / 8;
      if (sizeBytes < 1024 * 1024) {
        return `${(sizeBytes / 1024).toFixed(1)} KB`;
      } else {
        return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
      }
    } else {
      // WAV estimate: sample_rate * channels * bits_per_sample * duration / 8
      const sizeBytes = (format.sampleRate * format.channels * 16 * durationSeconds) / 8;
      if (sizeBytes < 1024 * 1024) {
        return `${(sizeBytes / 1024).toFixed(1)} KB`;
      } else {
        return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
      }
    }
  }
  
  isFormatRecommended(format: AudioFormat): boolean {
    // Recommend Opus medium quality for most use cases
    return format.type === 'opus' && format.quality === 'medium';
  }
}

