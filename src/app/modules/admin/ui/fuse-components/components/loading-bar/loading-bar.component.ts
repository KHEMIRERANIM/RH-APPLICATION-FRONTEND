import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { finalize } from 'rxjs/operators';
import { FuseLoadingBarService } from '@fuse/components/loading-bar';
import { FuseComponentsComponent } from 'app/modules/admin/ui/fuse-components/fuse-components.component';

@Component({
    selector   : 'loading-bar',
    templateUrl: './loading-bar.component.html'
})
export class LoadingBarComponent
{
    apiCallStatus: string = '-';
    mode: 'determinate' | 'indeterminate' = 'indeterminate';

    constructor(
        private _httpClient: HttpClient,
        private _fuseComponentsComponent: FuseComponentsComponent,
        private _fuseLoadingBarService: FuseLoadingBarService
    )
    {
    }

    toggleDrawer(): void
    {
        this._fuseComponentsComponent.matDrawer.toggle();
    }

    showLoadingBar(): void
    {
        this._fuseLoadingBarService.show();
    }

    hideLoadingBar(): void
    {
        this._fuseLoadingBarService.hide();
    }

    setAutoMode(change: MatSlideToggleChange): void
    {
        this._fuseLoadingBarService.setAutoMode(change.checked);
    }

    makeAPICall(): void
    {
        this.apiCallStatus = 'Waiting...';

        this._httpClient.get('https://jsonplaceholder.typicode.com/posts?_delay=2000')
            .pipe(finalize(() => {
                this.apiCallStatus = 'Finished!';
            }))
            .subscribe((response) => {
                console.log(response);
            });
    }

    toggleMode(): void
    {
        this._fuseLoadingBarService.show();
        this.mode = this.mode === 'indeterminate' ? 'determinate' : 'indeterminate';
        this._fuseLoadingBarService.setMode(this.mode);
    }

    setProgress(event: Event): void
    {
        const value = (event.target as HTMLInputElement).value;
        this._fuseLoadingBarService.setProgress(parseFloat(value));
    }
}
