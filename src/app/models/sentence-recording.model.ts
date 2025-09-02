import { AudioFormat } from '../speak/record-view/opus-audio.service';

export class SentenceRecordingModel {
  public audioFormat?: AudioFormat;
  
  constructor(
        public recordingId: number,
        public sentenceNumber: number, // index starting at 1
        public audioBlob: Blob,
        audioFormat?: AudioFormat
  ) {
    this.audioFormat = audioFormat;
  }
}
