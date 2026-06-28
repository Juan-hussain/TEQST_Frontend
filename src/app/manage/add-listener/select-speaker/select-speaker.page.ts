import {Component, OnInit, ViewChild} from '@angular/core';
import {IonNav, IonToggle, ModalController, NavParams} from '@ionic/angular';
import {ShareFolderService} from 'src/app/services/share-folder.service';
import {ListenerDataService} from '../listener-data.service';

@Component({
  selector: 'app-select-speaker',
  templateUrl: './select-speaker.page.html',
  styleUrls: ['./select-speaker.page.scss'],
})
export class SelectSpeakerPage implements OnInit {

  @ViewChild('allToggle', {static: true}) allToggle: IonToggle;
  segment = '0';

  public navComponent: IonNav;
  public creating: boolean;

  constructor(public navParams: NavParams,
              public viewCtrl: ModalController,
              private listenerData: ListenerDataService,
              private shareFolderService: ShareFolderService) {

    this.navComponent = navParams.get('navComponent');
  }

  ngOnInit(): void {
    this.creating = this.listenerData.getCreating();
    this.allToggle.checked = this.listenerData.getAllSpeakers();
  }

  segmentChanged($event): void {
    this.segment = $event.detail.value;
  }

  async allUsersToggleChanged($event): Promise<void> {
    this.listenerData.setAllSpeakers($event.detail.value);
  }

  getValidatedListeningData()
  :{listenerIds: number[], speakerIds: number[], accents: string[], allSpeakers: boolean} {
    const listeners = this.listenerData.getListeners();
    if (listeners.length == 0) {
      alert('must have at least one listener');
      return;
    }
    const speakers = this.listenerData.getSpeakers();
    const accents = this.listenerData.getAccents();
    const allSpeakers = this.listenerData.getAllSpeakers();
    if (speakers.length == 0 && accents.length == 0 && !allSpeakers) {
      alert('speakers and accents cant both be empty unless you allow access to all');
      return;
    }
    const listenerIds = listeners.map((listener) => listener.id);
    const speakerIds = speakers.map((speaker) => speaker.id);
    return {
      listenerIds: listenerIds,
      speakerIds: speakerIds,
      accents: accents,
      allSpeakers: allSpeakers,
    };
  }

  createListening(): void {
    console.log('backend api call');
    const folderId = this.listenerData.getFolderId();
    const data = this.getValidatedListeningData();

    this.shareFolderService.createListening(
        folderId, data.listenerIds, data.speakerIds, data.accents, data.allSpeakers,
    ).subscribe((res) => {
      console.log('worked');

      //  Now sync with SharedFolder.speaker
      this.shareFolderService.setSharingSpeakers(
        folderId, data.speakerIds, data.allSpeakers
      ).subscribe(() => {
        console.log('Speaker list updated');
	this.navComponent.popToRoot();
      }, (err) => {
        console.error('Failed to update speaker list', err);
        this.navComponent.popToRoot();
      });
    }, (err) => {
      console.log('error!!');
      alert('Could not create listener permission');
    });


    // this.navComponent.push(ManageListeningsPage, {
    //   navComponent: this.navComponent,
    // })
  }

  updateListening(): void {
    console.log('update listening');
    const listeningId = this.listenerData.getListeningId();
    const folderId = this.listenerData.getFolderId();
    const data = this.getValidatedListeningData();
    this.shareFolderService.updateListening(
        listeningId, data.listenerIds, data.speakerIds, data.accents, data.allSpeakers,
    ).subscribe((res) => {
      console.log('worked');

      //  Also update speaker list in SharedFolder
      this.shareFolderService.setSharingSpeakers(
        folderId, data.speakerIds, data.allSpeakers
      ).subscribe(() => {
        console.log('Speaker list synced');
        this.navComponent.popToRoot();
      }, (err) => {
        console.error('Speaker update failed', err);
        this.navComponent.popToRoot();
      });

      this.navComponent.popToRoot();
    }, (err) => {
      alert('could not create listening');
    });
  }

}
