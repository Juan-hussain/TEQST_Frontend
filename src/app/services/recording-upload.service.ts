import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, Observable} from 'rxjs';

import {Constants} from 'src/app/constants';
import {SentenceRecordingModel} from 'src/app/models/sentence-recording.model';
import {RecordingUploadResponse}
  from 'src/app/interfaces/recording-upload-response';
import {AlertManagerService} from './alert-manager.service';
import {AuthenticationService} from './authentication.service';

@Injectable({
  providedIn: 'root',
})
export class RecordingUploadService {

  private SERVER_URL = Constants.SERVER_URL;

  // array of tuple [sentenceRecording, isReUpload]
  private uploadQueue: [SentenceRecordingModel, boolean][] = [];
  private isUploadActive = new BehaviorSubject<boolean>(false);
  private lastUploadResponse =
    new BehaviorSubject<RecordingUploadResponse>(null);
  private errorCount = 0;
  private readonly MAX_ERRORS = 3;

  constructor(public authenticationService: AuthenticationService,
              private http: HttpClient,
              private alertService: AlertManagerService) {}

  public uploadRecording(
      sentenceRecording: SentenceRecordingModel,
      isReUpload: boolean): void {

    this.uploadQueue.push([sentenceRecording, isReUpload]);
    if (!this.isUploadActive.getValue()) {
      this.errorCount = 0; // Reset error count when starting fresh
      this.uploadNextElement();
    }
  }

  private uploadNextElement(): void {
    this.isUploadActive.next(true);
    const queueElement = this.uploadQueue.shift();
    const isReUpload = queueElement[1];
    const sentenceRecording = queueElement[0];
    const audioFile = new File([sentenceRecording.audioBlob], 'recording.wav');
    const formData = new FormData();
    formData.append('audiofile', audioFile);
    const sentenceRecordingUrl = this.SERVER_URL + '/api/spk/sentencerecordings/';

    if (isReUpload) {
      // replace existing sentence recording
      const url = sentenceRecordingUrl +
        sentenceRecording.recordingId +
        `/?index=${sentenceRecording.sentenceNumber}`;
      this.http.put<RecordingUploadResponse>(
          url,
          formData).subscribe((response) => {
        this.lastUploadResponse.next(response);
        this.errorCount = 0; // Reset error count on success
        this.checkIfQueueIsFinished();
      }, (error) => this.handleUploadError(error, 'update'));
    } else {
      // create a new sentence recording
      formData.append('recording', sentenceRecording.recordingId.toString());
      formData.append('index', sentenceRecording.sentenceNumber.toString());
      this.http.post<RecordingUploadResponse>(
          sentenceRecordingUrl,
          formData).subscribe((response) => {
        this.lastUploadResponse.next(response);
        this.errorCount = 0; // Reset error count on success
        this.checkIfQueueIsFinished();

      }, (error) => this.handleUploadError(error, 'create'));
    }
  }

  private checkIfQueueIsFinished(): void {
    if (this.uploadQueue.length > 0) {
      this.uploadNextElement();
    } else {
      this.isUploadActive.next(false);
    }
  }

  private handleUploadError(error: any, operation: 'create' | 'update'): void {
    console.error('Upload error:', error);
    
    this.errorCount++;
    
    // If we've had too many errors, stop trying
    if (this.errorCount >= this.MAX_ERRORS) {
      this.alertService.showErrorAlertNoRedirection(
          'Too many upload errors',
          'Please reload the page and try again',
          true);
      this.isUploadActive.next(false);
      this.errorCount = 0; // Reset for next time
      return;
    }
    
    let errorMessage = 'Upload failed';
    let errorDetails = 'Please try again or reload the page';
    
    if (error.status === 400) {
      if (error.error && error.error.non_field_errors) {
        const backendError = error.error.non_field_errors[0];
        if (backendError.includes('already exists') && operation === 'create') {
          // If we're trying to create but it already exists, automatically retry as update
          console.log('Recording already exists, automatically retrying as update');
          this.retryAsUpdate();
          return;
        } else {
          errorDetails = backendError;
        }
      }
    } else if (error.status === 500) {
      errorMessage = 'Server error';
      errorDetails = 'The server encountered an error. Please try again.';
    } else if (error.status === 401) {
      errorMessage = 'Authentication error';
      errorDetails = 'Please log in again.';
    } else if (error.status === 403) {
      errorMessage = 'Permission denied';
      errorDetails = 'You do not have permission to perform this action.';
    }
    
    this.alertService.showErrorAlertNoRedirection(
        errorMessage,
        errorDetails,
        true);
    this.isUploadActive.next(false);
  }

  private retryAsUpdate(): void {
    // Get the current sentence recording from the queue and retry as update
    if (this.uploadQueue.length > 0) {
      const currentElement = this.uploadQueue[0];
      const sentenceRecording = currentElement[0];
      
      console.log(`Retrying sentence ${sentenceRecording.sentenceNumber} as update`);
      
      // Remove the current element and add it back as an update
      this.uploadQueue.shift();
      this.uploadQueue.unshift([sentenceRecording, true]); // true = isReUpload
      
      // Continue with the queue
      this.checkIfQueueIsFinished();
    } else {
      this.isUploadActive.next(false);
    }
  }

  private uploadFailed(): void {
    this.alertService.showErrorAlertNoRedirection(
        'Upload failed',
        'Please reload the page',
        true);
    this.isUploadActive.next(false);
  }

  public getIsUploadActive(): Observable<boolean> {
    return this.isUploadActive.asObservable();
  }

  public getLastUploadResponse(): Observable<RecordingUploadResponse> {
    return this.lastUploadResponse.asObservable();
  }

  // Check if a sentence recording already exists
  public checkIfSentenceRecordingExists(recordingId: number, sentenceNumber: number): Observable<boolean> {
    const url = this.SERVER_URL + `/api/spk/sentencerecordings/${recordingId}/${sentenceNumber}/`;
    return new Observable(observer => {
      this.http.head(url).subscribe({
        next: () => observer.next(true), // Recording exists
        error: (error) => {
          if (error.status === 404) {
            observer.next(false); // Recording doesn't exist
          } else {
            observer.error(error); // Other error
          }
        },
        complete: () => observer.complete()
      });
    });
  }

}
