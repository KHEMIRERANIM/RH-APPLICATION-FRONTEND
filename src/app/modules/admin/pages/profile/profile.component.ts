import { ChangeDetectorRef, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { UserService } from 'app/core/user/user.service';
import { User } from 'app/core/user/user.types';

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

    constructor(
        private _userService: UserService,
        private _formBuilder: FormBuilder,
        private _http: HttpClient,
        private _toastr: ToastrService,
        private _cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.profileForm = this._formBuilder.group({
            nom: ['', Validators.required],
            prenom: ['', Validators.required],
            email: [{value: '', disabled: true}],
            telephone: [''],
            adresse: [''],
            departement: [{value: '', disabled: true}],
            poste: [{value: '', disabled: true}],
            role: [{value: '', disabled: true}]
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
                        this.isAdmin = localUser.role === 'ADMIN' || localUser.role === 'admin';
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

    async updateProfile(): Promise<void> {
        if (this.profileForm.invalid) return;
        
        this.savingProfile = true;
        try {
            const photoUrl = await this.getPhotoBase64();
            
            const updatedUser: User = {
                ...this.user,
                ...this.profileForm.getRawValue(),
                avatar: photoUrl
            };
            
            this._userService.update(updatedUser).subscribe({
                next: () => {
                    this.savingProfile = false;
                    this.selectedFile = null;
                    this._toastr.success('Profil mis à jour avec succès !');
                    this._cdr.markForCheck();
                },
                error: () => {
                    this.savingProfile = false;
                    this._toastr.error('Erreur lors de la mise à jour du profil.');
                    this._cdr.markForCheck();
                }
            });
        } catch(e) {
            this.savingProfile = false;
            this._toastr.error('Erreur réseau.');
        }
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
        this._http.patch(`http://10.188.81.174:8081/api/users/${localUser.id}/password`, {
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
