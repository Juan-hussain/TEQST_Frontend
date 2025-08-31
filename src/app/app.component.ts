import {Component, OnInit} from '@angular/core';
import {Platform} from '@ionic/angular';
import {SplashScreen} from '@ionic-native/splash-screen/ngx';
import {StatusBar} from '@ionic-native/status-bar/ngx';
import {TranslateService} from '@ngx-translate/core';
import {Router} from '@angular/router';

import {InternetConnectionService}
  from './services/internet-connection.service';
import {LanguageService} from './services/language.service';
import {AuthenticationService} from './services/authentication.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {

  constructor(private platform: Platform,
              private splashScreen: SplashScreen,
              private statusBar: StatusBar,
              private translate: TranslateService,
              private languageService: LanguageService,
              private connectionService: InternetConnectionService,
              private authService: AuthenticationService,
              private router: Router) {

    this.initializeApp();
  }

  ngOnInit(): void {
    if (localStorage.getItem('MenuLanguage') != null) {
      this.languageService
          .setMenuLanguage(localStorage.getItem('MenuLanguage'));
    }
    
    // Validate authentication on app initialization
    this.validateAuthenticationOnStartup();
  }

  initializeApp(): void {
    this.translate.setDefaultLang('en');
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
    });
    this.connectionService.monitor();
  }

  private validateAuthenticationOnStartup(): void {
    // Only validate if user appears to be logged in
    if (this.authService.isLoggedIn()) {
      this.authService.validateToken().subscribe(
        (isValid) => {
          if (!isValid) {
            // Token is invalid, redirect to login
            this.router.navigate(['/login']);
          } else {
            // Token is valid, start periodic validation
            this.authService.startTokenValidation();
          }
        },
        () => {
          // Error occurred during validation, redirect to login
          this.router.navigate(['/login']);
        }
      );
    }
  }
}
