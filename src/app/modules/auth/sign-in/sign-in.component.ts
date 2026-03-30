import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, NgForm, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { fuseAnimations } from '@fuse/animations';
import { FuseAlertType } from '@fuse/components/alert';
import { AuthService } from 'app/core/auth/auth.service';

export type DemoProfile = 'admin' | 'employe' | 'candidat';

@Component({
    selector     : 'auth-sign-in',
    templateUrl  : './sign-in.component.html',
    styleUrls    : ['./sign-in.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations   : fuseAnimations
})
export class AuthSignInComponent implements OnInit
{
    @ViewChild('signInNgForm') signInNgForm: NgForm;

    readonly demoProfiles: { id: DemoProfile; label: string; subtitle: string; email: string; icon: string }[] = [
        {
            id      : 'admin',
            label   : 'Administrateur',
            subtitle: 'Gestion complète',
            email   : 'jean.dupont@entreprise.com',
            icon    : 'heroicons_outline:shield-check'
        },
        {
            id      : 'employe',
            label   : 'Employé',
            subtitle: 'Espace collaborateur',
            email   : 'marie.martin@entreprise.com',
            icon    : 'heroicons_outline:user'
        },
        {
            id      : 'candidat',
            label   : 'Candidat',
            subtitle: 'Recrutement',
            email   : 'pierre.bernard@email.com',
            icon    : 'heroicons_outline:briefcase'
        }
    ];

    selectedProfile: DemoProfile = 'admin';

    alert: { type: FuseAlertType; message: string } = {
        type   : 'success',
        message: ''
    };
    signInForm: FormGroup;
    showAlert: boolean = false;

    constructor(
        private _activatedRoute: ActivatedRoute,
        private _authService: AuthService,
        private _formBuilder: FormBuilder,
        private _router: Router
    )
    {
    }

    ngOnInit(): void
    {
        this.signInForm = this._formBuilder.group({
    email     : ['admin@entreprise.tn', [Validators.required, Validators.email]],
    password  : ['admin123', Validators.required],
    rememberMe: ['']
});
    }

    selectProfile(profile: DemoProfile): void
    {
        const p = this.demoProfiles.find(x => x.id === profile);
        this.signInForm.patchValue({ email: p?.email });
    }

    signIn(): void
    {
        if ( this.signInForm.invalid )
        {
            return;
        }

        this.signInForm.disable();
        this.showAlert = false;

        this._authService.signIn(this.signInForm.value)
            .subscribe(
                () => {
                    const user = this._authService.currentUser;
                    const redirectURL = this._activatedRoute.snapshot.queryParamMap.get('redirectURL') || '/signed-in-redirect';
                    this._router.navigateByUrl(redirectURL);
                },
                () => {
                    this.signInForm.enable();
                    this.signInNgForm.resetForm();
                    this.alert = {
                        type   : 'error',
                        message: 'Email ou mot de passe incorrect'
                    };
                    this.showAlert = true;
                }
            );
    }
}
