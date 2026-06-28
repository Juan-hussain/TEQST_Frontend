import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, ReplaySubject, Observable} from 'rxjs';

import {AuthenticationService} from 'src/app/services/authentication.service';
import {Constants} from 'src/app/constants';
import {SentenceStatus} from 'src/app/interfaces/sentence-status';

@Injectable({
  providedIn: 'root',
})

export class TextServiceService {

  SERVER_URL = Constants.SERVER_URL;

  /* instantiate BehaviorSubjects with 1
     because every text has at least 1 sentence */
  private sentences = new ReplaySubject<string[]>(1);
  private sentencesRecordingStatus = new BehaviorSubject<SentenceStatus[]>([]);
  private activeSentenceIndex = new BehaviorSubject<number>(1);
  private totalSentenceNumber = new BehaviorSubject<number>(1);
  private furthestSentenceIndex = new BehaviorSubject<number>(1);
  private sentenceHasRecording = new BehaviorSubject<boolean>(false);
  private recordingId = new ReplaySubject<number>(1);
  private textTitle = new BehaviorSubject<string>('');
  private isRightToLeft = new BehaviorSubject<boolean>(false);
  private isLoaded = new BehaviorSubject<boolean>(false);
  private hasFetchedText = new BehaviorSubject<boolean>(false);
  private accessDenied = new BehaviorSubject<boolean>(false);

  // Url Information
  private textId: number;
  private root_uid: string;
  private sharedfolderId: number;
  private isTextFetched: boolean;
  private isRecordingExistsChecked: boolean;
  private nextActiveSentenceIndex: number;

  constructor(public authenticationService: AuthenticationService,
              private http: HttpClient) {}

  public reset(): void {
    this.sentences.next([]);
    this.sentencesRecordingStatus.next([]);
    this.activeSentenceIndex.next(1);
    this.totalSentenceNumber.next(1);
    this.furthestSentenceIndex.next(1);
    this.sentenceHasRecording.next(false);
    this.recordingId.next(1);
    this.textTitle.next('');
    this.isRightToLeft.next(false);
    this.isLoaded.next(false);
    this.hasFetchedText.next(false);
    this.accessDenied.next(false);
    this.isTextFetched = false;
    this.isRecordingExistsChecked = false;
  }

  private fetchText(): void {
    console.log('fetchText called for textId:', this.textId, 'root:', this.root_uid);
    // fetch TextData from Server
    const textUrl = this.SERVER_URL +
        `/api/spk/texts/${this.textId}?root=${this.root_uid}`;

    this.http.get(textUrl, {}).subscribe((text) => {
      console.log('Text data received:', text);
      this.textTitle.next(text['title']);
      this.totalSentenceNumber.next(text['content'].length);
      this.sentences.next(text['content']);
      this.isRightToLeft.next(text['is_right_to_left']);
      this.sharedfolderId = parseInt(text['shared_folder']);
      this.isTextFetched = true;
      this.hasFetchedText.next(true);
      this.accessDenied.next(false);
      console.log('Text fetched, isTextFetched:', this.isTextFetched);
      this.initActiveSentenceIfReady();
    }, (error) => {
      this.hasFetchedText.next(false);
      this.accessDenied.next(true);
      console.error('Error fetching text:', error);
    });
  }


  // set the local variables to the data from the server
  private setRecordingInfo(recordingInfo: object): void {
    const index = recordingInfo['active_sentence'];
    this.nextActiveSentenceIndex = index;
    this.furthestSentenceIndex.next(index);
    this.recordingId.next(recordingInfo['id']);
    this.sentencesRecordingStatus
        .next(recordingInfo['sentences_status']
            .sort((a, b) => {
              // sort the list in ascending order by index
              return a.index - b.index;
            }));
    this.initActiveSentenceIfReady();
  }


  /* check if the user already has a recording information
     and if so,
     set the local recording info to the data from the server */
  async checkIfRecordingInfoExists(): Promise<boolean> {
    console.log('checkIfRecordingInfoExists called for textId:', this.textId);
    let result = false;
    const getRecordingInfoUrl = this.SERVER_URL +
      `/api/spk/textrecordings/?text=${this.textId}`;

    await this.http.get(getRecordingInfoUrl).toPromise()
        .then((info) => {
          console.log('Recording info received:', info);
          this.isRecordingExistsChecked = true;
          if (info === null) {
            result = false;
          } else {
            this.setRecordingInfo(info[0]);
            result = true;
          }
          console.log('Recording info checked, isRecordingExistsChecked:', this.isRecordingExistsChecked);
        });
    return result;
  }

  // Create a text recording with the given permissions for the current user
  givePermissions(textToSpeech: boolean, speechRecognition: boolean): void {

    const recordingInfo = {
      text: this.textId,
      TTS_permission: textToSpeech,
      SR_permission: speechRecognition,
      root: this.root_uid,
    };

    const postRecordingInfoUrl = this.SERVER_URL + `/api/spk/textrecordings/`;

    this.http.post(postRecordingInfoUrl, recordingInfo).subscribe((info) => {
      this.setRecordingInfo(info);
    });
  }

  initActiveSentence(): void {
    /* when a text is finished,
       the active_sentence on the backend is totalSentenceNumber + 1
       so for the ui we have to set the active sentence
       to the smaller of those two values */
    const firstSentenceIssue = this.sentencesRecordingStatus.getValue()
        .find((sentenceStatus: SentenceStatus) => {
          return sentenceStatus.status !== 'VALID';
        });

    const sentenceIndex = firstSentenceIssue ?
        firstSentenceIssue.index : Math.min(this.nextActiveSentenceIndex,
            this.totalSentenceNumber.getValue());
    this.setActiveSentenceIndex(sentenceIndex);
  }

  initActiveSentenceIfReady(): void {
    console.log('initActiveSentenceIfReady called, isTextFetched:', this.isTextFetched, 'isRecordingExistsChecked:', this.isRecordingExistsChecked);
    if (this.isTextFetched && this.isRecordingExistsChecked) {
      console.log('Both conditions met, setting isLoaded to true');
      this.initActiveSentence();
      this.isLoaded.next(true);
    } else {
      console.log('Conditions not met yet');
    }
  }

  getSentenceHasRecording(): Observable<boolean> {
    return this.sentenceHasRecording.asObservable();
  }

  getActiveSentenceIndex(): Observable<number> {
    return this.activeSentenceIndex.asObservable();
  }

  getFurthestSentenceIndex(): Observable<number> {
    return this.furthestSentenceIndex.asObservable();
  }

  getSentences(): Observable<string[]> {
    return this.sentences.asObservable();
  }

  getSentencesRecordingStatus(): Observable<SentenceStatus[]> {
    return this.sentencesRecordingStatus.asObservable();
  }

  getTotalSentenceNumber(): Observable<number> {
    return this.totalSentenceNumber.asObservable();
  }

  getRecordingId(): Observable<number> {
    return this.recordingId.asObservable();
  }

  getTextTitle(): Observable<string> {
    return this.textTitle.asObservable();
  }

  getIsRightToLeft(): Observable<boolean> {
    return this.isRightToLeft.asObservable();
  }

  getIsLoaded(): Observable<boolean> {
    return this.isLoaded.asObservable();
  }

  getHasFetchedText(): Observable<boolean> {
    return this.hasFetchedText.asObservable();
  }

  getAccessDenied(): Observable<boolean> {
    return this.accessDenied.asObservable();
  }

  getSharedFolderId(): number {
    return this.sharedfolderId;
  }

  // fetch a new text from the server based on the given id
  setIds(root_uid: string, id: number): void {
    this.root_uid = root_uid;
    this.textId = id;
    this.fetchText();
  }

  setSentencesRecordingStatus(statusList: SentenceStatus[]): void {
    console.log(`setSentencesRecordingStatus: updating status list:`, statusList);
    this.sentencesRecordingStatus.next(statusList);
  }

  setActiveSentenceIndex(index: number): void {
    // check if the given index is within bounds
    if (this.isTextFetched && this.isRecordingExistsChecked &&
      index > 0 && index <= this.totalSentenceNumber.getValue() &&
      index <= this.furthestSentenceIndex.getValue()) {

      this.activeSentenceIndex.next(index);

      // check if sentence has recording
      this.checkRecordingStatus();
    }
  }

  // check if the current active sentence is already recorded
  public checkRecordingStatus(): void {
    if (this.isTextFetched && this.isRecordingExistsChecked) {
      const currentIndex = this.activeSentenceIndex.getValue();
      const statusList = this.sentencesRecordingStatus.getValue();
      
      // Check if the current sentence actually has a recording by looking at the status list
      const hasRecording = statusList.some(status => status.index === currentIndex);
      console.log(`checkRecordingStatus: sentence ${currentIndex}, hasRecording: ${hasRecording}, statusList:`, statusList);
      this.sentenceHasRecording.next(hasRecording);
    } else {
      console.log(`checkRecordingStatus: conditions not met, isTextFetched: ${this.isTextFetched}, isRecordingExistsChecked: ${this.isRecordingExistsChecked}`);
      this.sentenceHasRecording.next(false);
    }
  }

  setNextSentenceActive(): void {
    const next = this.activeSentenceIndex.getValue() + 1;
    this.setActiveSentenceIndex(next);
  }

  setPreviousSentenceActive(): void {
    const previous = this.activeSentenceIndex.getValue() - 1;
    this.setActiveSentenceIndex(previous);
  }

  increaseFurthestSentence(): void {
    if (this.furthestSentenceIndex.getValue() <=
      this.totalSentenceNumber.getValue() + 1) {

      this.furthestSentenceIndex.next(
          this.furthestSentenceIndex.getValue() + 1);
      this.checkRecordingStatus();
    }
  }
}
