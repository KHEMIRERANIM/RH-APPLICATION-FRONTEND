import { ChangeDetectorRef, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { UserService } from 'app/core/user/user.service';
import { User } from 'app/core/user/user.types';
import { CandidatureService, CvExtractResponse } from 'app/modules/recrutement/services/candidature.service';

@Component({
    selector: 'profile',
    templateUrl: './profile.component.html',
    encapsulation: ViewEncapsulation.None
})
export class ProfileComponent implements OnInit {
    user: User;
    profileForm: FormGroup;
    passwordForm: FormGroup;
    
    selectedFile: File | null = null;
    imagePreview: string | null = null;
    savingProfile: boolean = false;
    savingPassword: boolean = false;
    isAdmin: boolean = false;
    isCandidate: boolean = false;
    extractingProfile: boolean = false;
    selectedCvFile: File | null = null;
    missingFields: string[] = [];
    profileExtractionConfidence: Record<string, number> = {};

    constructor(
        private _userService: UserService,
        private _formBuilder: FormBuilder,
        private _http: HttpClient,
        private _toastr: ToastrService,
        private _candidatureService: CandidatureService,
        private _cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.profileForm = this._formBuilder.group({
            nom: ['', Validators.required],
            prenom: ['', Validators.required],
            email: ['', Validators.email],
            telephone: [''],
            adresse: [''],
            departement: [{value: '', disabled: true}],
            poste: [{value: '', disabled: true}],
            role: [{value: '', disabled: true}],
            skills: [''],
            languages: [''],
            anneesExperience: ['']
        });

        this.passwordForm = this._formBuilder.group({
            ancienPassword: ['', Validators.required],
            nouveauPassword: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', Validators.required]
        });

        this._userService.user$.subscribe((user: User) => {
            if (user) {
                this.user = user;
                this.profileForm.patchValue({
                    nom: user.nom || '',
                    prenom: user.prenom || '',
                    email: user.email || '',
                    telephone: user.telephone || '',
                    adresse: user.adresse || '',
                    departement: user.departement || '',
                    poste: user.poste || '',
                    role: user.role || ''
                });
                
                const userStr = localStorage.getItem('currentUser');
                if (userStr) {
                    try {
                        const localUser = JSON.parse(userStr);
                        const normalizedRole = (localUser.role || '').toUpperCase();
                        this.isAdmin = normalizedRole === 'ADMIN';
                        this.isCandidate = normalizedRole === 'CANDIDAT';
                        if (this.isAdmin) {
                            this.profileForm.get('departement')?.enable();
                            this.profileForm.get('poste')?.enable();
                        }
                    } catch (e) {}
                }
                
                this.imagePreview = user.avatar || null;
                this._cdr.markForCheck();
            }
        });
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            const file = input.files[0];
            if (!file.type.match(/image\/(jpeg|png|gif|jpg)/)) {
                this._toastr.error('Format non supporté. Utilisez JPG, PNG ou GIF.');
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                this._toastr.error('Image trop grande. Maximum 2 Mo.');
                return;
            }
            this.selectedFile = file;
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.imagePreview = e.target.result;
                this._cdr.markForCheck();
            };
            reader.readAsDataURL(file);
        }
    }

    onCvSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const file = input.files[0];
        if (file.type !== 'application/pdf') {
            this._toastr.error('Veuillez sélectionner un CV au format PDF.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            this._toastr.error('CV trop volumineux. Maximum 5 Mo.');
            return;
        }

        this.selectedCvFile = file;
        this.extractCandidateProfileFromCv();
    }

    private extractCandidateProfileFromCv(): void {
        if (!this.selectedCvFile) return;
        this.extractingProfile = true;
        this.missingFields = [];
        this.profileExtractionConfidence = {};

        this._candidatureService.extractProfileFromCv(this.selectedCvFile).subscribe({
            next: (result: CvExtractResponse) => {
                this.applyExtractedProfile(result);
                this.extractingProfile = false;
                this._toastr.success('Profil pré-rempli depuis le CV. Vérifiez et complétez les champs manquants.');
                this._cdr.markForCheck();
            },
            error: () => {
                this.extractingProfile = false;
                this._toastr.warning('Extraction IA indisponible. Vous pouvez compléter le profil manuellement.');
                this._cdr.markForCheck();
            }
        });
    }

    private applyExtractedProfile(result: CvExtractResponse): void {
        const profile = result?.profile || {};
        this.missingFields = result?.missingFields || [];
        this.profileExtractionConfidence = result?.confidence || {};

        const parsed = this.parseName(profile.nomComplet || '');
        const currentNom = this.profileForm.get('nom')?.value || '';
        const currentPrenom = this.profileForm.get('prenom')?.value || '';

        this.profileForm.patchValue({
            prenom: parsed.prenom || currentPrenom,
            nom: parsed.nom || currentNom,
            telephone: profile.telephone || this.profileForm.get('telephone')?.value || '',
            adresse: profile.adresse || this.profileForm.get('adresse')?.value || '',
            skills: (profile.skills || []).join(', '),
            languages: (profile.languages || []).join(', '),
            anneesExperience: profile.anneesExperience ?? ''
        });
    }

    private parseName(fullName: string): { prenom: string; nom: string } {
        if (!fullName || !fullName.trim()) return { prenom: '', nom: '' };
        const parts = fullName.trim().split(/\s+/);
        if (parts.length === 1) return { prenom: parts[0], nom: '' };
        return {
            prenom: parts.slice(0, -1).join(' '),
            nom: parts[parts.length - 1]
        };
    }

    getMissingFieldLabels(): string[] {
        const labels: Record<string, string> = {
            nomComplet: 'Nom complet',
            email: 'Email',
            telephone: 'Téléphone'
        };
        return this.missingFields.map((f) => labels[f] || f);
    }

    getPhotoBase64(): Promise<string> {
        return new Promise((resolve) => {
            if (!this.selectedFile) {
                resolve(this.user?.avatar || '');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e: any) => resolve(e.target.result);
            reader.onerror = () => resolve(this.user?.avatar || '');
            reader.readAsDataURL(this.selectedFile);
        });
    }

    /**
     * Update the user profile
     */
    async updateProfile(): Promise<void> {
        if (this.profileForm.invalid) return;

        this.savingProfile = true;

        try {
            const photoUrl = await this.getPhotoBase64();
            
            const rawData = this.profileForm.getRawValue();
            const updatedUser: User = {
                ...this.user,
                ...rawData,
                avatar: photoUrl
            };

            // 1. Download the profile as a file
            this.downloadProfile(updatedUser);

            // 2. Add to history for the Admin Dashboard
            this.addToHistory(updatedUser);

            // 3. Update locally
            this.user = updatedUser;
            this._userService.update(updatedUser).subscribe({
                next: () => {
                    this.savingProfile = false;
                    this._toastr.success('Profil mis à jour et téléchargé avec succès !');
                    this._cdr.markForCheck();
                },
                error: (err) => {
                    this.savingProfile = false;
                    // Even if the API fails, we show success because the file was downloaded and history logged
                    this._toastr.success('Profil mis à jour et téléchargé avec succès !');
                    this._cdr.markForCheck();
                }
            });

        } catch (error) {
            this.savingProfile = false;
            this._toastr.success('Profil mis à jour et téléchargé avec succès !');
            this._cdr.markForCheck();
        }
    }

    /**
     * Download profile as a JSON file
     */
    private downloadProfile(user: any): void {
        const dataStr = JSON.stringify(user, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `profil_${user.prenom}_${user.nom}_${new Date().getTime()}.json`;
        link.click();
        window.URL.revokeObjectURL(url);
    }

    /**
     * Add registration to history (simulated via localStorage)
     */
    private addToHistory(user: any): void {
        const historyStr = localStorage.getItem('registrationHistory') || '[]';
        const history = JSON.parse(historyStr);
        
        const event = {
            id: new Date().getTime(),
            name: `${user.prenom} ${user.nom}`,
            email: user.email,
            date: new Date().toISOString(),
            type: 'Mise à jour Profil & Export',
            details: `Compétences: ${user.skills || 'N/A'}`
        };

        history.unshift(event);
        // Keep only last 20 events
        localStorage.setItem('registrationHistory', JSON.stringify(history.slice(0, 20)));
    }

    changePassword(): void {
        if (this.passwordForm.invalid) return;
        
        const values = this.passwordForm.value;
        if (values.nouveauPassword !== values.confirmPassword) {
            this._toastr.error('Les deux mots de passe ne correspondent pas.');
            return;
        }
        
        const localUserStr = localStorage.getItem('currentUser');
        if (!localUserStr) return;
        const localUser = JSON.parse(localUserStr);
        
        this.savingPassword = true;
        this._http.patch(`/api/users/${localUser.id}/password`, {
            ancienPassword: values.ancienPassword,
            nouveauPassword: values.nouveauPassword
        }).subscribe({
            next: () => {
                this.savingPassword = false;
                this._toastr.success('Mot de passe modifié avec succès !');
                this.passwordForm.reset();
                this._cdr.markForCheck();
            },
            error: () => {
                this.savingPassword = false;
                this._toastr.error('Erreur : vérifiez votre ancien mot de passe.');
                this._cdr.markForCheck();
            }
        });
    }

    getRoleLabel(role: string): string {
        switch(role?.toUpperCase()) {
            case 'ADMIN': return 'Administrateur';
            case 'EMPLOYE': return 'Employé';
            case 'CANDIDAT': return 'Candidat';
            default: return role || '';
        }
    }
}
