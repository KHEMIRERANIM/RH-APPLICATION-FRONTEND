import { NgModule, LOCALE_ID } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ExtraOptions, PreloadAllModules, RouterModule } from '@angular/router';
import { MarkdownModule } from 'ngx-markdown';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ToastrModule } from 'ngx-toastr';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from './material.module';

import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';

registerLocaleData(localeFr);



import { TextFieldModule } from '@angular/cdk/text-field';  // ← AJOUTER

// Material Modules
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSliderModule } from '@angular/material/slider';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

// Fuse imports - Utilise l'alias
import { FuseModule } from 'src/@fuse/fuse.module';
import { FuseConfigModule } from 'src/@fuse/services/config/config.module';
import { FuseMockApiModule } from 'src/@fuse/lib/mock-api/mock-api.module';

// App imports
import { CoreModule } from './core/core.module';
import { appConfig } from './core/config/app.config';
import { mockApiServices } from './mock-api';
import { LayoutModule } from './layout/layout.module';
import { AppComponent } from './app.component';
import { appRoutes } from './app-routing.module';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';

const routerConfig: ExtraOptions = {
    preloadingStrategy: PreloadAllModules,
    scrollPositionRestoration: 'enabled'
};

@NgModule({
    declarations: [AppComponent],
    imports: [
        
        BrowserModule,
        BrowserAnimationsModule,
        HttpClientModule,
        FormsModule,
        TextFieldModule,  // ← AJOUTER ICI

        ReactiveFormsModule,
        
        // Material Modules
        MatIconModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatCheckboxModule,
        MatProgressSpinnerModule,
        MatSelectModule,
        MatOptionModule,
        MatChipsModule,
        MatAutocompleteModule,
        MatSliderModule,
        MaterialModule,
        MatDatepickerModule,
        MatNativeDateModule,
        
        
        
        ToastrModule.forRoot({
            positionClass: 'toast-top-right',
            timeOut: 0,
            extendedTimeOut: 0,
            disableTimeOut: true,
            progressBar: false,
            closeButton: true,
            preventDuplicates: true,
            newestOnTop: true
        }),
        RouterModule.forRoot(appRoutes, routerConfig),
        FuseModule,
        FuseConfigModule.forRoot(appConfig),
        FuseMockApiModule.forRoot(mockApiServices),
        CoreModule,
        LayoutModule,
        MarkdownModule.forRoot({})
    ],
    providers: [
        {
            provide: HTTP_INTERCEPTORS,
            useClass: AuthInterceptor,
            multi: true
        },
        { provide: LOCALE_ID, useValue: 'fr' }
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }