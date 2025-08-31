import {Injectable} from '@angular/core';
import {ToastController} from '@ionic/angular';
import {Observable, Subject, BehaviorSubject} from 'rxjs';
import * as RecordRTC from 'recordrtc';

import {SentenceStatus} from 'src/app/interfaces/sentence-status';
import {
  RecordingUploadResponse,
} from 'src/app/interfaces/recording-upload-response';
import {RecordingPlaybackService}
  from 'src/app/services/recording-playback.service';
import {RecordingUploadService}
  from 'src/app/services/recording-upload.service';
import {SentenceRecordingModel}
  from 'src/app/models/sentence-recording.model';
import {AlertManagerService} from 'src/app/services/alert-manager.service';
import {TextServiceService} from './text-service.service';
import {AuthenticationService} from 'src/app/services/authentication.service';


@Injectable({
  providedIn: 'root',
})

export class AudioRecordingService {

  private stream: MediaStream;
  private activeRecorder;

  private recordingFailed$ = new Subject<string>();
  private isRecording$ = new BehaviorSubject<boolean>(false);
  private sentencesRecordingStatus: SentenceStatus[]
  private isPlaying: boolean;

  private recordingId: number;
  private activeSentence: number;
  private furthestSentence: number;
  private sentenceHasRecording: boolean;
  private errorInPreviousRecording: boolean;

  private recordingTimeoutLength = 180000; // 3 min = 3*60*1000=180000
  private recordingTimeout;

  constructor(public authenticationService: AuthenticationService,
              public toastController: ToastController,
              private alertService: AlertManagerService,
              private recordingUploadService: RecordingUploadService,
              private textService: TextServiceService,
              private playbackService: RecordingPlaybackService) {

    this.subscribeToServices();
    this.alertService.presentRecordingInfoAlert();
  }

  /* subscribe to all needed variables from the services
     and update the local ones on change */
  private subscribeToServices(): void {
    this.textService.getActiveSentenceIndex()
        .subscribe((index) => this.activeSentence = index);
    this.textService.getFurthestSentenceIndex()
        .subscribe((index) => this.furthestSentence = index);
    this.textService.getRecordingId().subscribe((id) => {
      this.recordingId = id;
    });
    this.textService.getSentenceHasRecording()
        .subscribe((value) => this.sentenceHasRecording = value);
    this.textService.getSentencesRecordingStatus()
        .subscribe((statusList) => {
          this.sentencesRecordingStatus = statusList;
        });
    this.recordingUploadService.getLastUploadResponse()
        .subscribe((status) => this.updateSentenceRecordingStatus(status));
    this.playbackService.getIsPlaying()
        .subscribe((state) => this.isPlaying = state);
  }

  recordingFailed(): Observable<string> {
    return this.recordingFailed$.asObservable();
  }

  getRecordingState(): Observable<boolean> {
    return this.isRecording$.asObservable();
  }

  isMediaStreamActive(): boolean {
    // Check if MediaDevices API is supported first
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return false;
    }
    
    if (!this.stream) {
      return false;
    } else if (!this.stream.active) {
      return false;
    }
    return true;
  }
  // TODO async
  requestUserAudio(): void {
    if (this.isMediaStreamActive()) {
      return;
    }
    
    // Check if MediaDevices API is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('MediaDevices API not supported in requestUserAudio');
      this.alertService.showErrorAlertNoRedirection(
          'Browser not supported',
          'Your browser does not support audio recording. Please use a modern browser like Chrome, Firefox, or Safari.');
      this.isRecording$.next(false);
      return;
    }
    
    navigator.mediaDevices.getUserMedia({audio: true}).then((s) => {
      this.stream = s;
    }).catch((error) => {
      this.alertService.showErrorAlertNoRedirection(
          'No microphone access',
          'Please allow access to your microphone ' +
        'to be able to start a recording.');
      this.isRecording$.next(false);
    });
  }

  startRecording(): void {
    console.log('startRecording called');
    if (this.isPlaying === true) {
      this.playbackService.stopAudioPlayback();
    }
    
    // Check if media stream is already active
    if (this.isMediaStreamActive()) {
      console.log('Media stream is active, initiating recording');
      this.initiateRecording();
    } else {
      console.log('Media stream not active, requesting audio permission');
      // Request media stream and then start recording
      this.requestUserAudioAndRecord();
    }
  }

  private requestUserAudioAndRecord(): void {
    console.log('Requesting audio permission...');
    console.log('navigator object:', navigator);
    console.log('navigator.mediaDevices:', navigator.mediaDevices);
    console.log('navigator.mediaDevices.getUserMedia:', navigator.mediaDevices?.getUserMedia);
    console.log('Is secure context:', window.isSecureContext);
    console.log('Current URL:', window.location.href);
    console.log('Protocol:', window.location.protocol);
    
    // Check if we're in a secure context
    if (!window.isSecureContext) {
      console.error('Not in a secure context - MediaDevices API requires HTTPS or localhost');
      this.alertService.showErrorAlertNoRedirection(
          'Secure Context Required',
          'Audio recording requires a secure connection (HTTPS) or localhost. Please access this page via HTTPS or localhost.');
      this.isRecording$.next(false);
      return;
    }
    
    // Check if MediaDevices API is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('MediaDevices API not supported');
      console.error('navigator.mediaDevices exists:', !!navigator.mediaDevices);
      console.error('navigator.mediaDevices.getUserMedia exists:', !!(navigator.mediaDevices?.getUserMedia));
      
      // Try to manually initialize MediaDevices if it's missing
      if (!navigator.mediaDevices) {
        console.log('Attempting to manually initialize MediaDevices...');
        try {
          // Try to create MediaDevices if it doesn't exist
          if ((navigator as any).getUserMedia) {
            // Create a local reference to the legacy method
            const legacyGetUserMedia = (navigator as any).getUserMedia;
            console.log('Found legacy getUserMedia, will use it directly');
            
            // Use the legacy method directly instead of trying to modify navigator.mediaDevices
            this.useLegacyGetUserMedia(legacyGetUserMedia);
            return;
          }
        } catch (error) {
          console.error('Failed to access legacy getUserMedia:', error);
        }
      }
      
      // Check again after potential initialization
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        // Try alternative methods for older browsers
        if ((navigator as any).getUserMedia || (navigator as any).webkitGetUserMedia || (navigator as any).mozGetUserMedia || (navigator as any).msGetUserMedia) {
          console.log('Found legacy getUserMedia methods, trying those...');
          this.tryLegacyGetUserMedia();
          return;
        }
        
        this.alertService.showErrorAlertNoRedirection(
            'Browser not supported',
            'Your browser does not support audio recording. Please use a modern browser like Chrome, Firefox, or Safari.');
        this.isRecording$.next(false);
        return;
      }
    }
    
    navigator.mediaDevices.getUserMedia({audio: true}).then((s) => {
      console.log('Audio permission granted, stream:', s);
      this.stream = s;
      this.initiateRecording();
    }).catch((error) => {
      console.error('Audio permission denied:', error);
      this.alertService.showErrorAlertNoRedirection(
          'No microphone access',
          'Please allow access to your microphone ' +
        'to be able to start a recording.');
      this.isRecording$.next(false);
    });
  }

  private initiateRecording(): void {
    console.log('Initiating recording with stream:', this.stream);
    try {
      // set the quality properties of the recorder
      this.activeRecorder = new RecordRTC.StereoAudioRecorder(this.stream, {
        type: 'audio',
        mimeType: 'audio/wav',
        audioBitsPerSecond: 16000,
        desiredSampRate: 16000,
        numberOfAudioChannels: 1, // set mono recording
      });
      console.log('Recorder created:', this.activeRecorder);
      this.activeRecorder.record();
      console.log('Recording started');
      this.startRecordingTimeout();
      this.isRecording$.next(true);
    } catch (error) {
      console.error('Error creating recorder:', error);
    }
  }

  private tryLegacyGetUserMedia(): void {
    console.log('Trying legacy getUserMedia methods...');
    
    // Try to find a working legacy method
    const legacyMethod = (navigator as any).getUserMedia || 
                        (navigator as any).webkitGetUserMedia || 
                        (navigator as any).mozGetUserMedia || 
                        (navigator as any).msGetUserMedia;
    
    if (legacyMethod) {
      console.log('Using legacy method:', legacyMethod.name || 'unknown');
      
      // Legacy getUserMedia uses callbacks instead of promises
      legacyMethod.call(navigator, {audio: true}, 
        (stream: MediaStream) => {
          console.log('Legacy getUserMedia succeeded, stream:', stream);
          this.stream = stream;
          this.initiateRecording();
        },
        (error: any) => {
          console.error('Legacy getUserMedia failed:', error);
          this.alertService.showErrorAlertNoRedirection(
              'No microphone access',
              'Please allow access to your microphone ' +
            'to be able to start a recording.');
          this.isRecording$.next(false);
        }
      );
    } else {
      console.error('No legacy getUserMedia methods found');
      this.alertService.showErrorAlertNoRedirection(
          'Browser not supported',
          'Your browser does not support audio recording. Please use a modern browser like Chrome, Firefox, or Safari.');
      this.isRecording$.next(false);
    }
  }

  private useLegacyGetUserMedia(legacyMethod: any): void {
    console.log('Using provided legacy getUserMedia method');
    
    // Legacy getUserMedia uses callbacks instead of promises
    legacyMethod.call(navigator, {audio: true}, 
      (stream: MediaStream) => {
        console.log('Legacy getUserMedia succeeded, stream:', stream);
        this.stream = stream;
        this.initiateRecording();
      },
      (error: any) => {
        console.error('Legacy getUserMedia failed:', error);
        this.alertService.showErrorAlertNoRedirection(
            'No microphone access',
            'Please allow access to your microphone ' +
          'to be able to start a recording.');
        this.isRecording$.next(false);
      }
    );
  }

  private saveRecording(
      index: number,
      isReRecording: boolean,
      blob: Blob): void {

    console.log(`Saving recording for sentence ${index}, isReRecording: ${isReRecording}, recordingId: ${this.recordingId}`);
    
    const sentenceRecording =
      new SentenceRecordingModel(this.recordingId, index, blob);
    // add recording to cache in case speaker wants to listen to it
    this.playbackService.addToCache(sentenceRecording);
    this.uploadRecording(sentenceRecording, isReRecording);
  }

  private uploadRecording(
      sentenceRecording: SentenceRecordingModel,
      isReRecording: boolean): void {

    console.log(`Uploading recording for sentence ${sentenceRecording.sentenceNumber}, isReRecording: ${isReRecording}, recordingId: ${sentenceRecording.recordingId}`);
    
    // Prevent duplicate uploads of the same sentence
    if (this.isUploadingSentence(sentenceRecording.sentenceNumber)) {
      console.log(`Already uploading sentence ${sentenceRecording.sentenceNumber}, skipping duplicate upload`);
      return;
    }
    
    this.recordingUploadService
        .uploadRecording(sentenceRecording, isReRecording);
  }

  private isUploadingSentence(sentenceNumber: number): boolean {
    // Check if we're already uploading this sentence
    // This is a simple check - in a more robust implementation, you might want to track uploads by sentence
    return false; // For now, allow multiple uploads but log them
  }

  stopRecording(): void {
    // check if recording is active if not do nothing
    if (this.activeRecorder) {

      // save the current state
      const currentRecorder = this.activeRecorder;
      const currentSentence = this.activeSentence;
      const isReRecording = this.sentenceHasRecording;

      this.stopRecordingTimeout();

      setTimeout(() => {
        currentRecorder.stop((blob: Blob) => {
          this.saveRecording(currentSentence, isReRecording, blob);
        }, () => {
          this.recordingFailed$.next();
        });
      }, 400);

      this.resetRecorder();
      if (currentSentence === this.furthestSentence) {
        this.textService.increaseFurthestSentence();
      }
    }

  }

  resetRecorder(): void {
    this.isRecording$.next(false);
    if (this.errorInPreviousRecording === true) {
      this.throwRecordingErrorAlert();
    }
    this.activeRecorder = null;
  }

  // save the current recording and start the next one
  nextRecording(): void {
    this.stopRecordingTimeout();

    if (this.errorInPreviousRecording === true) {
      this.stopRecording();
      return;
    }

    // save the current state
    const currentSentence = this.activeSentence;
    const currentRecorder = this.activeRecorder;
    const isReRecording = this.sentenceHasRecording;

    setTimeout(() => {
      currentRecorder.stop((blob: Blob) => {
        this.saveRecording(currentSentence, isReRecording, blob);
      }, () => {
        this.recordingFailed$.next();
      });
    }, 400);

    if (this.activeSentence === this.furthestSentence) {
      this.textService.increaseFurthestSentence();
    }
    if (this.activeSentence >= this.furthestSentence - 1) {
      this.startRecording();
      this.textService.setNextSentenceActive();
    } else {
      this.resetRecorder();
      this.textService.setNextSentenceActive();
    }
  }

  stopMediaStream(): void {
    this.stopRecordingTimeout();
    if (this.stream) {
      this.stream.getAudioTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.resetRecorder();
  }

  // cancel current recording without saving
  abortRecording(): void {
    this.stopRecordingTimeout();
    this.resetRecorder();
  }

  // abort the current recording and start a new one
  restartRecording(): void {
    this.stopRecordingTimeout();
    this.activeRecorder.stop();
    this.activeRecorder.record();
    this.startRecordingTimeout();
  }

  updateSentenceRecordingStatus(sentenceStatus: RecordingUploadResponse): void {
    const statusList = this.sentencesRecordingStatus;
    if (sentenceStatus === null || statusList.length === 0) return;

    if (sentenceStatus.valid !== 'VALID') {
      this.errorInPreviousRecording = true;
      if (this.isRecording$.getValue() === false) {
        this.throwRecordingErrorAlert();
      }
    }

    if (sentenceStatus.index === statusList.length + 1) {
      statusList.push({
        index: sentenceStatus.index,
        status: sentenceStatus.valid,
      });
    } else {
      statusList[sentenceStatus.index - 1].status = sentenceStatus.valid;
    }
    this.textService.setSentencesRecordingStatus(statusList);
    
    // After updating the status, we need to re-check if the current sentence has a recording
    // This ensures that sentenceHasRecording is updated correctly
    this.textService.checkRecordingStatus();
  }

  throwRecordingErrorAlert(): void {
    this.errorInPreviousRecording = false;
    this.alertService.showErrorAlertNoRedirection('Issue with recording',
        `It seems like there is an issue in a previous recording (marked red). 
         You might have started talking to early.
         It might help to make a short pause at the beginning and the end.`);
  }

  startRecordingTimeout(): void {
    this.recordingTimeout = setTimeout(() => {
      this.showRecordingTooLongToast();
    }, this.recordingTimeoutLength);
  }

  stopRecordingTimeout(): void {
    clearTimeout(this.recordingTimeout);
  }

  async showRecordingTooLongToast(): Promise<void> {
    const toast = await this.toastController.create({
      message:
       '<ion-icon name="hourglass-outline"></ion-icon><br>'+
       'Your recording seems to be very long.\n'+
       'Make sure to always click "->" to go to the next sentence.',
      duration: 10000,
      color: 'danger',
      position: 'top',
      cssClass: 'ion-text-center',
    });
    toast.present();
  }
}
