import {Observable, interval} from 'rxjs';
import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {NavController} from '@ionic/angular';
import {ActivatedRoute} from '@angular/router';
import {takeWhile, switchMap} from 'rxjs/operators';

import {RegisterForm} from 'src/app/interfaces/register-form';
import {User} from 'src/app/interfaces/user';
import {Constants} from 'src/app/constants';
import {AlertManagerService} from './alert-manager.service';
import {LanguageService} from './language.service';
import {UsermgmtService} from './usermgmt.service';

@Injectable({
  providedIn: 'root',
})
export class AuthenticationService {

  SERVER_URL = Constants.SERVER_URL;
  private httpOptions;
  private dataFromServer: any = '';
  private tokenValidationInterval: any;

  constructor(public http: HttpClient,
              public navCtrl: NavController,
              public languageService: LanguageService,
              public usermgmtService: UsermgmtService,
              private alertService: AlertManagerService,
              private route: ActivatedRoute) {}

  // login into Website, saving userdata in localStorage, redirect to speak tab
  // and fetching userdata from server
  login(dataToSend): void {
    const url = this.SERVER_URL + '/api/auth/login/';
    this.http.post(url, dataToSend, this.httpOptions)
        .subscribe((loginResponse: object) => {

          // set variables based on received data
          const userData = loginResponse['user'] as User;
          this.usermgmtService.initLoggingData(userData.id, userData.username);
          this.usermgmtService.isPublisher.next(userData.is_publisher);
          this.usermgmtService.isListener.next(userData.is_listener);
          this.dataFromServer = JSON.stringify(loginResponse);
          localStorage.setItem(
              'Token',
              'Token ' + JSON.parse(this.dataFromServer).token);
          this.usermgmtService.storeUserData(userData);

          // Start periodic token validation
          this.startTokenValidation();

          // redirect user
          if (this.route.snapshot.queryParamMap.has('next')) {
            const nextURL = this.route.snapshot.queryParamMap.get('next');
            this.navCtrl.navigateForward(nextURL);
          } else {
            this.navCtrl.navigateForward('/tabs/speak');
          }
        }, () => {
          // calls AlertService when server sends error code
          // This effectively never gets called since the Backend responds
          // with a 401 status code which is handled by the interceptor.
          this.alertService.showErrorAlertNoRedirection(
              'Wrong Input',
              'Invalid Password or Username');
        });
  }

  register(registrationData: RegisterForm): Observable<object> {
    const url =this.SERVER_URL + '/api/auth/register/';
    return this.http.post(url, registrationData);
  }

  // redirect to login, and loging out
  logout(): void {
    const url = this.SERVER_URL + '/api/auth/logout/';
    this.http.post(url, '', this.httpOptions).subscribe(
      () => {
        // Server logout successful
        this.usermgmtService.deleteStoredUserData();
        this.usermgmtService.clearLoggingData();
        this.stopTokenValidation();
        this.navCtrl.navigateRoot('/login');
      },
      (error) => {
        // Server logout failed, but still logout locally
        console.warn('Server logout failed, logging out locally:', error);
        this.usermgmtService.deleteStoredUserData();
        this.usermgmtService.clearLoggingData();
        this.stopTokenValidation();
        this.navCtrl.navigateRoot('/login');
      }
    );
  }

  // Check if user has a valid token by making a request to validate it
  validateToken(): Observable<boolean> {
    const url = this.SERVER_URL + '/api/user/';
    return new Observable(observer => {
      this.http.get(url).subscribe(
        () => {
          observer.next(true);
          observer.complete();
        },
        (error) => {
          if (error.status === 401) {
            // Token is invalid, clear user data
            this.usermgmtService.deleteStoredUserData();
            this.usermgmtService.clearLoggingData();
            this.stopTokenValidation();
            observer.next(false);
            observer.complete();
          } else {
            // For network errors or other issues, assume token is still valid
            // This prevents users from being logged out due to temporary network issues
            console.warn('Token validation failed with non-401 error:', error);
            observer.next(true);
            observer.complete();
          }
        }
      );
    });
  }

  // Start periodic token validation (every 5 minutes)
  startTokenValidation(): void {
    this.stopTokenValidation(); // Clear any existing interval
    
    this.tokenValidationInterval = interval(5 * 60 * 1000) // 5 minutes
      .pipe(
        takeWhile(() => this.isLoggedIn()),
        switchMap(() => this.validateToken())
      )
      .subscribe(
        (isValid) => {
          if (!isValid) {
            // Token is invalid, force logout
            this.forceLogout();
          }
        }
      );
  }

  // Stop periodic token validation
  stopTokenValidation(): void {
    if (this.tokenValidationInterval) {
      this.tokenValidationInterval.unsubscribe();
      this.tokenValidationInterval = null;
    }
  }

  isLoggedIn(): boolean {
    // if no auth token is found in local storage AUTH_TOKEN = null
    return !(localStorage.getItem('Token') === null);
  }

  // Force logout and redirect to login page
  forceLogout(): void {
    this.usermgmtService.deleteStoredUserData();
    this.usermgmtService.clearLoggingData();
    this.stopTokenValidation();
    this.navCtrl.navigateRoot('/login');
  }
}
