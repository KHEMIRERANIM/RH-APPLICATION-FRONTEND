import { 
    Translation, 
    TRANSLOCO_CONFIG, 
    TRANSLOCO_LOADER, 
    translocoConfig, 
    TranslocoModule, 
    TranslocoService, 
    TRANSLOCO_TRANSPILER, 
    DefaultTranspiler, 
    TRANSLOCO_MISSING_HANDLER, 
    TranslocoMissingHandler,
    TRANSLOCO_INTERCEPTOR,
    TranslocoInterceptor,
    TRANSLOCO_FALLBACK_STRATEGY,
    TranslocoFallbackStrategy
} from '@ngneat/transloco';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { environment } from '../../../environments/environment';
import { TranslocoHttpLoader } from 'app/core/transloco/transloco.http-loader';

export class CustomMissingHandler implements TranslocoMissingHandler {
    handle(key: string): string {
        return key;
    }
}

export class CustomInterceptor implements TranslocoInterceptor {
    preSaveTranslation(translation: Translation, lang: string): Translation {
        return translation;
    }
    preSaveTranslationKey(key: string, value: string, lang: string): string {
        return value;
    }
}

export class CustomFallbackStrategy implements TranslocoFallbackStrategy {
    getNextLangs(failedLang: string): string[] {
        return ['en'];
    }
}

@NgModule({
    exports  : [
        TranslocoModule
    ],
    providers: [
        {
            provide : TRANSLOCO_CONFIG,
            useValue: translocoConfig({
                availableLangs      : [
                    { id: 'en', label: 'English' },
                    { id: 'tr', label: 'Turkish' }
                ],
                defaultLang         : 'en',
                fallbackLang        : 'en',
                reRenderOnLangChange: true,
                prodMode            : environment.production
            })
        },
        {
            provide : TRANSLOCO_LOADER,
            useClass: TranslocoHttpLoader
        },
        {
            provide : TRANSLOCO_TRANSPILER,
            useClass: DefaultTranspiler
        },
        {
            provide  : TRANSLOCO_MISSING_HANDLER,
            useClass : CustomMissingHandler
        },
        {
            provide  : TRANSLOCO_INTERCEPTOR,
            useClass : CustomInterceptor
        },
        {
            provide  : TRANSLOCO_FALLBACK_STRATEGY,
            useClass : CustomFallbackStrategy
        },
        {
            provide   : APP_INITIALIZER,
            deps      : [TranslocoService],
            useFactory: (translocoService: TranslocoService): any => (): Promise<Translation> => {
                const defaultLang = translocoService.getDefaultLang();
                translocoService.setActiveLang(defaultLang);
                return translocoService.load(defaultLang).toPromise();
            },
            multi     : true
        }
    ]
})
export class TranslocoCoreModule {}
