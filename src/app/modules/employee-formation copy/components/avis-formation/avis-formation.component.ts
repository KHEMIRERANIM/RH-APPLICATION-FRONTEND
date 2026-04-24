import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AvisService } from '../../services/avis.service';
import { VoiceAnalysis } from '../../services/voice-sentiment.service';
import { DialogService } from '../../../../core/services/dialog.service';
import { VoiceAnalysisResult } from '../../services/voice-ai.service';

@Component({
    selector: 'app-avis-formation',
    templateUrl: './avis-formation.component.html',
    styleUrls: ['./avis-formation.component.scss']
})
export class AvisFormationComponent implements OnInit {
    @Input() formationId!: string;
    @Input() formationTitre!: string;
    
    avisForm: FormGroup;
    noteEtoiles: number = 0;
    hoverEtoile: number = 0;
    dejaAvis: boolean = false;
    avisExistant: any = null;
    statistiques: any = null;
    listeAvis: any[] = [];
    isLoading = false;
    formationTerminee: boolean = false;
    voiceAnalysis: VoiceAnalysisResult | null = null;
    
    // ✅ NOUVELLE PROPRIÉTÉ : Contrôle l'affichage du formulaire
    showCommentForm: boolean = false;

    constructor(
        private fb: FormBuilder,
        private avisService: AvisService,
        private dialogService: DialogService
    ) {
        this.avisForm = this.fb.group({
            titre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
            commentaire: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]]
        });
    }

    ngOnInit(): void {
        this.verifierAvisExistant();
        this.chargerStatistiques();
        this.chargerListeAvis();
    }

    // ✅ Récupère les initiales de l'utilisateur pour l'avatar
    getUserInitials(): string {
        const user = localStorage.getItem('currentUser');
        if (user) {
            try {
                const userData = JSON.parse(user);
                return `${userData.prenom?.charAt(0) || ''}${userData.nom?.charAt(0) || ''}`;
            } catch (e) {
                return '👤';
            }
        }
        return '👤';
    }

    getStarStyle(starIndex: number, note: number): any {
        if (note >= starIndex) {
            return { 'opacity': '1' };
        } else if (note > starIndex - 1) {
            const percentage = (note - (starIndex - 1)) * 100;
            return { 
                'background': `linear-gradient(90deg, #fbbf24 ${percentage}%, #d1d5db ${percentage}%)`,
                'background-clip': 'text',
                '-webkit-background-clip': 'text',
                'color': 'transparent'
            };
        } else {
            return { 'opacity': '0.3' };
        }
    }

    isStarFilled(starIndex: number, note: number): boolean {
        return note >= starIndex;
    }

    getStarFillPercentage(starIndex: number, note: number): number {
        if (note >= starIndex) return 100;
        if (note < starIndex - 1) return 0;
        return (note - (starIndex - 1)) * 100;
    }

    verifierAvisExistant(): void {
        const employeId = localStorage.getItem('userId');
        if (employeId && this.formationId) {
            this.avisService.aDejaAvis(this.formationId, employeId).subscribe({
                next: (existe) => {
                    this.dejaAvis = existe;
                    if (existe) {
                        this.avisService.getAvisByFormationAndEmploye(this.formationId, employeId).subscribe({
                            next: (avis) => {
                                this.avisExistant = avis;
                            }
                        });
                    }
                },
                error: (err) => console.error('Erreur vérification avis', err)
            });
        }
    }

    chargerStatistiques(): void {
        this.avisService.getStatistiquesAvis(this.formationId).subscribe({
            next: (stats) => {
                this.statistiques = stats;
            },
            error: (err) => console.error('Erreur chargement statistiques', err)
        });
    }

    chargerListeAvis(): void {
        this.avisService.getAvisByFormation(this.formationId).subscribe({
            next: (avis) => {
                this.listeAvis = avis.filter(a => a.valide);
            },
            error: (err) => console.error('Erreur chargement avis', err)
        });
    }

    setNote(note: number): void {
        this.noteEtoiles = note;
    }

    setHover(note: number): void {
        this.hoverEtoile = note;
    }

    resetHover(): void {
        this.hoverEtoile = 0;
    }

    onTranscriptReady(transcript: string): void {
        if (this.avisForm.get('commentaire')?.value === '') {
            this.avisForm.patchValue({ commentaire: transcript });
        }
    }

    onRatingSuggested(rating: number): void {
        this.setNote(rating);
        this.dialogService.alert({
            title: 'Note suggérée',
            message: `L'analyse de votre voix suggère une note de ${rating}/5. Vous pouvez la modifier si nécessaire.`,
            type: 'info',
            confirmText: 'OK'
        });
    }

    private getTitleFromEmotion(emotion: string): string {
        const titles: Record<string, string> = {
            'JOIE': 'Formation excellente !',
            'POSITIF': 'Bonne formation',
            'TRISTESSE': 'Formation décevante',
            'COLERE': 'Très insatisfait',
            'NEUTRE': 'Avis sur la formation'
        };
        return titles[emotion] || '';
    }

    onVoiceAnalysisCompleted(result: VoiceAnalysisResult): void {
        console.log('Résultat analyse:', result);
        
        let message = '';
        switch(result.emotion) {
            case 'EXCELLENT':
            case 'JOIE':
                message = `😊 Votre avis semble positif ! Note suggérée: ${result.suggestedRating}/5`;
                break;
            case 'COLERE':
                message = `😠 Nous sommes désolés que vous soyez mécontent. Note suggérée: ${result.suggestedRating}/5`;
                break;
            case 'TRISTESSE':
                message = `😢 Nous prenons en compte votre avis. Note suggérée: ${result.suggestedRating}/5`;
                break;
            default:
                message = `Note suggérée par l'analyse: ${result.suggestedRating}/5`;
        }
        
        this.dialogService.alert({
            title: 'Analyse de votre avis',
            message: message,
            type: 'info',
            confirmText: 'Appliquer'
        }).subscribe(() => {
            this.setNote(result.suggestedRating);
            if (result.transcript && !this.avisForm.get('commentaire')?.value) {
                this.avisForm.patchValue({ commentaire: result.transcript });
            }
        });
    }

    onSubmit(): void {
        if (this.dejaAvis) {
            this.dialogService.alert({
                title: 'Avis déjà donné',
                message: 'Vous avez déjà donné votre avis pour cette formation. Un seul avis par formation est autorisé.',
                type: 'warning',
                confirmText: 'OK'
            });
            return;
        }

        if (this.avisForm.invalid) {
            this.dialogService.alert({
                title: 'Formulaire incomplet',
                message: 'Veuillez remplir tous les champs correctement.',
                type: 'warning',
                confirmText: 'OK'
            });
            return;
        }

        if (this.noteEtoiles === 0) {
            this.dialogService.alert({
                title: 'Note manquante',
                message: 'Veuillez sélectionner une note entre 1 et 5 étoiles.',
                type: 'warning',
                confirmText: 'OK'
            });
            return;
        }

        const employeId = localStorage.getItem('userId');
        
        if (!employeId) {
            this.dialogService.alert({
                title: 'Non connecté',
                message: 'Veuillez vous connecter pour donner votre avis.',
                type: 'error',
                confirmText: 'OK'
            });
            return;
        }
        
        this.isLoading = true;
        
        this.avisService.ajouterAvis(
            this.formationId,
            employeId,
            this.noteEtoiles,
            this.avisForm.value.titre,
            this.avisForm.value.commentaire
        ).subscribe({
            next: (response) => {
                this.dialogService.alert({
                    title: 'Merci pour votre avis !',
                    message: 'Votre avis a été enregistré avec succès. Il sera visible après validation par l\'administrateur.',
                    type: 'success',
                    confirmText: 'Fermer'
                });
                this.dejaAvis = true;
                this.avisExistant = response.avis;
                this.chargerStatistiques();
                this.chargerListeAvis();
                this.avisForm.reset();
                this.noteEtoiles = 0;
                this.showCommentForm = false;  // ✅ Fermer le formulaire après envoi
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Erreur envoi avis', err);
                let errorMessage = 'Impossible d\'enregistrer votre avis.';
                
                if (err.error?.message) {
                    errorMessage = err.error.message;
                } else if (err.message) {
                    errorMessage = err.message;
                }
                
                this.dialogService.alert({
                    title: 'Erreur',
                    message: errorMessage,
                    type: 'error',
                    confirmText: 'Fermer'
                });
                this.isLoading = false;
            }
        });
    }
}