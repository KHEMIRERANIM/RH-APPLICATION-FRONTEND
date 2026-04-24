import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DocumentService } from '../../services/document.service';
import { DialogService } from '../../../../core/services/dialog.service';
import { DocumentFormation } from '../../../../shared/models/formation.model';
import { FormateurService } from '../../formateurs/formateur.service';
import { HttpClient } from '@angular/common/http';

@Component({
    selector: 'app-documents-list',
    standalone: false,
    templateUrl: './documents-list.component.html',
    styleUrls: ['./documents-list.component.scss']
})
export class DocumentsListComponent implements OnInit {
    @Input() formationId!: string;
    @Input() formateurId!: string;
    
    documents: DocumentFormation[] = [];
    isLoading = false;
    typeFiltre = 'TOUS';
    showUploadModal = false;
    showRenduModal = false;
    isDownloading = false;
    isUploading = false;
    isRenduLoading = false;
    
    isFormateurFlag: boolean = false;
    currentUserEmail: string = '';
    
    uploadData = {
        titre: '',
        description: '',
        type: 'COURS',
        file: null as File | null
    };
    
    renduData = {
        documentId: '',
        documentTitre: '',
        file: null as File | null
    };
    
    mesRendus: { [key: string]: any } = {};
    
    // Stocker la date d'upload de l'exercice (quand le formateur l'a uploadé)
    dateUploadExercice: { [key: string]: Date } = {};
    
    // Timer pour le compte à rebours
    timers: { [key: string]: any } = {};
    tempsRestant: { [key: string]: string } = {};
    
    typeOptions = [
        { value: 'COURS', label: 'Cours', icon: 'fas fa-book', color: '#3b82f6' },
        { value: 'EXERCICE', label: 'Exercice', icon: 'fas fa-tasks', color: '#10b981' },
        { value: 'EXAMEN', label: 'Examen', icon: 'fas fa-file-alt', color: '#ef4444' },
        { value: 'RESSOURCE', label: 'Ressource', icon: 'fas fa-link', color: '#8b5cf6' }
    ];

    constructor(
        private documentService: DocumentService,
        private dialogService: DialogService,
        private route: ActivatedRoute,
        private formateurService: FormateurService,
        private http: HttpClient
    ) {}

    ngOnInit(): void {
        console.log('=== INIT DOCUMENTS LIST ===');
        this.loadCurrentUserEmail();
        this.checkIfFormateur();
        this.chargerDatesUploadExercice();
        
        this.route.params.subscribe(params => {
            if (params['formationId']) {
                this.formationId = params['formationId'];
                console.log('✅ formationId:', this.formationId);
                this.loadDocuments();
                this.loadMesRendus();
            } else if (this.formationId) {
                this.loadDocuments();
                this.loadMesRendus();
            }
        });
    }

    loadCurrentUserEmail(): void {
        const currentUserStr = localStorage.getItem('currentUser');
        if (currentUserStr) {
            try {
                const currentUser = JSON.parse(currentUserStr);
                this.currentUserEmail = currentUser.email || '';
                console.log('📧 Email:', this.currentUserEmail);
            } catch (e) {}
        }
    }

    checkIfFormateur(): void {
        const userId = localStorage.getItem('userId');
        const email = this.currentUserEmail;
        
        if (!userId && !email) return;

        this.formateurService.getFormateurs().subscribe({
            next: (formateurs) => {
                console.log('🔍 Formateurs:', formateurs);
                const formateur = formateurs.find(f =>
                    f.userId === userId || (email && f.email === email)
                );
                this.isFormateurFlag = !!formateur;
                if (this.isFormateurFlag && formateur) {
                    this.formateurId = formateur.id;
                    console.log('✅ Est formateur! ID:', this.formateurId);
                } else {
                    console.log('❌ N\'est pas formateur');
                }
            },
            error: (err) => { 
                console.error('Erreur:', err);
                this.isFormateurFlag = false; 
            }
        });
    }

    isFormateur(): boolean {
        return this.isFormateurFlag;
    }

    isEmploye(): boolean {
        return !this.isFormateurFlag;
    }

   loadDocuments(): void {
    if (!this.formationId) return;
    
    this.isLoading = true;
    this.documentService.getDocumentsByFormation(this.formationId).subscribe({
        next: (data) => {
            console.log(`✅ ${data.length} document(s) chargé(s)`);
            this.documents = data;
            
            // ✅ Initialiser les dates d'upload pour les exercices existants
            this.chargerDatesUploadExercice();
            
            this.demarrerTimers();
            this.isLoading = false;
        },
        error: (err) => {
            console.error('Erreur chargement documents:', err);
            this.isLoading = false;
        }
    });
}

    loadMesRendus(): void {
        const employeId = localStorage.getItem('userId');
        if (!employeId || this.isFormateur()) return;
        
        console.log('📥 Chargement rendus pour employeId:', employeId);
        
        this.documentService.getMesRendus(employeId).subscribe({
            next: (rendus) => {
                console.log('✅ Rendus chargés:', rendus);
                if (rendus && rendus.length > 0) {
                    rendus.forEach((rendu: any) => {
                        this.mesRendus[rendu.documentId] = rendu;
                    });
                    this.demarrerTimers();
                }
            },
            error: (err) => {
                console.error('Erreur chargement rendus:', err);
            }
        });
    }

    // Charger les dates d'upload des exercices depuis localStorage
  chargerDatesUploadExercice(): void {
    const saved = localStorage.getItem('datesUploadExercice');
    if (saved) {
        try {
            const dates = JSON.parse(saved);
            Object.keys(dates).forEach(key => {
                this.dateUploadExercice[key] = new Date(dates[key]);
            });
        } catch (e) {}
    }
    
    // ✅ Initialiser les dates pour les exercices existants qui n'ont pas de date
    this.documents.forEach(doc => {
        if (doc.type === 'EXERCICE' && !this.dateUploadExercice[doc.id]) {
            // Utiliser uploadedAt du document comme date de début du délai
            if (doc.uploadedAt) {
                this.dateUploadExercice[doc.id] = new Date(doc.uploadedAt);
                this.sauvegarderDateUploadExercice(doc.id);
                console.log(`📅 Date upload initialisée depuis uploadedAt pour ${doc.titre}: ${doc.uploadedAt}`);
            } else {
                // Si pas de uploadedAt, utiliser la date actuelle
                this.dateUploadExercice[doc.id] = new Date();
                this.sauvegarderDateUploadExercice(doc.id);
                console.log(`📅 Date upload initialisée (actuelle) pour ${doc.titre}`);
            }
        }
    });
}

    // Sauvegarder la date d'upload de l'exercice (appelé après upload par formateur)
    sauvegarderDateUploadExercice(documentId: string): void {
        this.dateUploadExercice[documentId] = new Date();
        localStorage.setItem('datesUploadExercice', JSON.stringify(
            Object.keys(this.dateUploadExercice).reduce((obj, key) => {
                obj[key] = this.dateUploadExercice[key];
                return obj;
            }, {} as any)
        ));
    }

    // Vérifier si le délai de 24h est dépassé (depuis l'upload du formateur)
    estDelaiDepasse(documentId: string): boolean {
        const dateUpload = this.dateUploadExercice[documentId];
        if (!dateUpload) return false;
        
        const maintenant = new Date();
        const diffHeures = (maintenant.getTime() - dateUpload.getTime()) / (1000 * 60 * 60);
        return diffHeures >= 24;
    }

    // Calculer le temps restant
    calculerTempsRestant(documentId: string): string {
        const dateUpload = this.dateUploadExercice[documentId];
        if (!dateUpload) return '';
        
        const maintenant = new Date();
        const diffMs = (dateUpload.getTime() + (24 * 60 * 60 * 1000)) - maintenant.getTime();
        
        if (diffMs <= 0) {
            return '⏰ Délai expiré';
        }
        
        const heures = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const secondes = Math.floor((diffMs % (1000 * 60)) / 1000);
        
        return `⏳ ${heures}h ${minutes}m ${secondes}s restants`;
    }

    // Démarrer les timers pour chaque exercice non rendu
    demarrerTimers(): void {
        // Arrêter tous les timers existants
        Object.keys(this.timers).forEach(key => {
            if (this.timers[key]) {
                clearInterval(this.timers[key]);
            }
        });
        
        this.documents.forEach(doc => {
            if (doc.type === 'EXERCICE' && !this.mesRendus[doc.id] && this.dateUploadExercice[doc.id]) {
                this.timers[doc.id] = setInterval(() => {
                    this.tempsRestant[doc.id] = this.calculerTempsRestant(doc.id);
                    this.tempsRestant = { ...this.tempsRestant };
                }, 1000);
                this.tempsRestant[doc.id] = this.calculerTempsRestant(doc.id);
            }
        });
    }

    openUploadModal(): void {
        if (!this.isFormateur()) {
            this.dialogService.alert({
                title: 'Accès refusé',
                message: 'Vous devez être formateur pour uploader des documents',
                type: 'warning'
            });
            return;
        }
        
        this.showUploadModal = true;
        this.uploadData = {
            titre: '',
            description: '',
            type: 'COURS',
            file: null
        };
    }

    openRenduModal(document: DocumentFormation): void {
        if (this.isFormateur()) {
            this.dialogService.alert({
                title: 'Accès refusé',
                message: 'Seuls les employés peuvent rendre des exercices',
                type: 'warning'
            });
            return;
        }
        
        // Vérifier si le délai est dépassé (depuis l'upload du formateur)
        if (this.estDelaiDepasse(document.id)) {
            this.dialogService.alert({
                title: 'Délai dépassé',
                message: 'Le délai de 24 heures pour rendre cet exercice est dépassé. Vous ne pouvez plus soumettre votre travail.',
                type: 'warning',
                confirmText: 'Fermer'
            });
            return;
        }
        
        // Vérifier si l'exercice a une date d'upload (le formateur l'a bien uploadé)
        if (!this.dateUploadExercice[document.id]) {
            this.dialogService.alert({
                title: 'Exercice non disponible',
                message: 'Cet exercice n\'est pas encore disponible ou a été récemment ajouté. Veuillez réessayer plus tard.',
                type: 'info',
                confirmText: 'Fermer'
            });
            return;
        }
        
        this.renduData = {
            documentId: document.id,
            documentTitre: document.titre,
            file: null
        };
        this.showRenduModal = true;
    }

    onFileSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                this.dialogService.alert({
                    title: 'Erreur',
                    message: 'Le fichier ne doit pas dépasser 10MB',
                    type: 'error'
                });
                return;
            }
            this.uploadData.file = file;
            console.log('📄 Fichier sélectionné:', file.name);
        }
    }

    onRenduFileSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                this.dialogService.alert({
                    title: 'Erreur',
                    message: 'Le fichier ne doit pas dépasser 10MB',
                    type: 'error'
                });
                return;
            }
            this.renduData.file = file;
            console.log('📄 Fichier de rendu sélectionné:', file.name);
        }
    }

    uploadDocument(): void {
    if (!this.isFormateur()) {
        this.dialogService.alert({
            title: 'Erreur',
            message: 'Vous devez être formateur',
            type: 'error'
        });
        return;
    }
    
    if (!this.uploadData.titre || !this.uploadData.file) {
        this.dialogService.alert({
            title: 'Erreur',
            message: 'Veuillez remplir tous les champs',
            type: 'error'
        });
        return;
    }

    this.isUploading = true;

    this.documentService.uploadDocument(
        this.formationId,
        this.formateurId,
        this.uploadData.titre,
        this.uploadData.description,
        this.uploadData.type,
        this.uploadData.file
    ).subscribe({
        next: (document) => {
            console.log('✅ Upload réussi:', document);
            
            // ✅ Si c'est un exercice, sauvegarder la date d'upload (uploadedAt)
            if (document.type === 'EXERCICE') {
                // Utiliser uploadedAt du document retourné par le backend
                const dateUpload = document.uploadedAt ? new Date(document.uploadedAt) : new Date();
                this.dateUploadExercice[document.id] = dateUpload;
                this.sauvegarderDateUploadExercice(document.id);
                this.demarrerTimers();
            }
            
            this.documents.push(document);
            this.showUploadModal = false;
            this.isUploading = false;
            this.dialogService.alert({
                title: 'Succès',
                message: document.type === 'EXERCICE' 
                    ? 'Exercice uploadé avec succès ! Le délai de 24 heures pour les employés commence maintenant.'
                    : 'Document uploadé avec succès',
                type: 'success'
            });
        },
        error: (err) => {
            console.error('❌ Erreur upload:', err);
            this.isUploading = false;
            this.dialogService.alert({
                title: 'Erreur',
                message: err.error?.message || 'Erreur lors de l\'upload',
                type: 'error'
            });
        }
    });
}
soumettreRendu(): void {
    if (!this.renduData.file) {
        this.dialogService.alert({
            title: 'Erreur',
            message: 'Veuillez sélectionner un fichier',
            type: 'error'
        });
        return;
    }

    const employeId = localStorage.getItem('userId');
    if (!employeId) {
        this.dialogService.alert({
            title: 'Erreur',
            message: 'Utilisateur non identifié',
            type: 'error'
        });
        return;
    }

    // Récupérer le nom et prénom de l'employé depuis localStorage
    let employeNom = '';
    let employePrenom = '';
    
    const currentUserStr = localStorage.getItem('currentUser');
    if (currentUserStr) {
        try {
            const currentUser = JSON.parse(currentUserStr);
            employeNom = currentUser.nom || '';
            employePrenom = currentUser.prenom || '';
            console.log('👤 Employé:', employePrenom, employeNom);
        } catch (e) {}
    }
    
    // Si pas trouvé, utiliser le userName
    if (!employeNom && !employePrenom) {
        const userName = localStorage.getItem('userName') || '';
        const nameParts = userName.split(' ');
        if (nameParts.length >= 2) {
            employePrenom = nameParts[0];
            employeNom = nameParts.slice(1).join(' ');
        } else {
            employePrenom = userName;
        }
    }

    this.isRenduLoading = true;

    this.documentService.soumettreRendu(
        this.renduData.documentId,
        employeId,
        this.renduData.file,
        employeNom,
        employePrenom
    ).subscribe({
        next: (rendu) => {
            console.log('✅ Rendu soumis:', rendu);
            // Stocker également le nom dans le rendu local
            rendu.employeNom = employeNom;
            rendu.employePrenom = employePrenom;
            this.mesRendus[this.renduData.documentId] = rendu;
            this.showRenduModal = false;
            this.isRenduLoading = false;
            
            // Arrêter le timer pour cet exercice
            if (this.timers[this.renduData.documentId]) {
                clearInterval(this.timers[this.renduData.documentId]);
                delete this.timers[this.renduData.documentId];
            }
            
            this.dialogService.alert({
                title: 'Succès',
                message: 'Exercice soumis avec succès',
                type: 'success'
            });
        },
        error: (err) => {
            console.error('❌ Erreur soumission:', err);
            this.isRenduLoading = false;
            this.dialogService.alert({
                title: 'Erreur',
                message: err.error?.message || 'Erreur lors de la soumission',
                type: 'error'
            });
        }
    });
}
    downloadDocument(doc: DocumentFormation): void {
        if (!doc || !doc.id) return;

        this.isDownloading = true;
        this.documentService.downloadDocument(doc.id).subscribe({
            next: (blob: Blob) => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = doc.fileName || `document_${doc.id}`;
                link.click();
                window.URL.revokeObjectURL(url);
                this.isDownloading = false;
            },
            error: (err) => {
                console.error('Erreur téléchargement:', err);
                this.isDownloading = false;
                this.dialogService.alert({
                    title: 'Erreur',
                    message: 'Impossible de télécharger le document',
                    type: 'error'
                });
            }
        });
    }

    deleteDocument(doc: DocumentFormation): void {
        if (!this.isFormateur()) return;

        this.dialogService.confirm({
            title: 'Suppression',
            message: `Supprimer "${doc.titre}" ?`,
            confirmText: 'Supprimer',
            cancelText: 'Annuler',
            type: 'warning'
        }).subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.documentService.deleteDocument(doc.id).subscribe({
                    next: () => {
                        this.documents = this.documents.filter(d => d.id !== doc.id);
                        this.dialogService.alert({
                            title: 'Succès',
                            message: 'Document supprimé',
                            type: 'success'
                        });
                    },
                    error: (err) => {
                        console.error('Erreur suppression:', err);
                        this.dialogService.alert({
                            title: 'Erreur',
                            message: 'Impossible de supprimer',
                            type: 'error'
                        });
                    }
                });
            }
        });
    }

    voirRendusEmployes(documentId: string): void {
        if (!this.isFormateur()) return;

        this.documentService.getRendusByDocument(documentId).subscribe({
            next: (rendus) => {
                if (!rendus || rendus.length === 0) {
                    this.dialogService.alert({
                        title: 'Aucun rendu',
                        message: 'Aucun employé n\'a encore rendu cet exercice',
                        type: 'info'
                    });
                    return;
                }
                this.afficherListeRendus(rendus);
            },
            error: (err) => {
                console.error('Erreur:', err);
                this.dialogService.alert({
                    title: 'Erreur',
                    message: 'Impossible de charger les rendus',
                    type: 'error'
                });
            }
        });
    }

    // Vérifier si l'utilisateur peut rendre l'exercice
    peutRendreExercice(doc: DocumentFormation): boolean {
        if (doc.type !== 'EXERCICE') return false;
        if (this.mesRendus[doc.id]) return false;
        if (!this.dateUploadExercice[doc.id]) return false;
        if (this.estDelaiDepasse(doc.id)) return false;
        return true;
    }

    // Obtenir le statut de l'exercice pour l'employé
    getExerciceStatut(doc: DocumentFormation): { texte: string; couleur: string; icone: string } {
        if (this.mesRendus[doc.id]) {
            return { texte: 'Rendu', couleur: '#10b981', icone: '✅' };
        }
        if (!this.dateUploadExercice[doc.id]) {
            return { texte: 'Bientôt disponible', couleur: '#f59e0b', icone: '⏳' };
        }
        if (this.estDelaiDepasse(doc.id)) {
            return { texte: 'Délai expiré', couleur: '#ef4444', icone: '⏰' };
        }
        return { texte: 'À rendre', couleur: '#3b82f6', icone: '📝' };
    }

    // Obtenir le nombre de rendus
    getRendusCount(documentId: string): number {
        let count = 0;
        Object.values(this.mesRendus).forEach((rendu: any) => {
            if (rendu.documentId === documentId) count++;
        });
        return count;
    }
afficherListeRendus(rendus: any[]): void {
    // Créer un conteneur modal personnalisé
    const modalDiv = document.createElement('div');
    modalDiv.style.position = 'fixed';
    modalDiv.style.top = '0';
    modalDiv.style.left = '0';
    modalDiv.style.right = '0';
    modalDiv.style.bottom = '0';
    modalDiv.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modalDiv.style.zIndex = '10000';
    modalDiv.style.display = 'flex';
    modalDiv.style.alignItems = 'center';
    modalDiv.style.justifyContent = 'center';
    
    const contentDiv = document.createElement('div');
    contentDiv.style.backgroundColor = 'white';
    contentDiv.style.borderRadius = '12px';
    contentDiv.style.width = '500px';
    contentDiv.style.maxWidth = '90%';
    contentDiv.style.maxHeight = '80vh';
    contentDiv.style.overflow = 'hidden';
    
    const headerDiv = document.createElement('div');
    headerDiv.style.padding = '16px 20px';
    headerDiv.style.borderBottom = '1px solid #e5e7eb';
    headerDiv.style.display = 'flex';
    headerDiv.style.justifyContent = 'space-between';
    headerDiv.style.alignItems = 'center';
    headerDiv.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    headerDiv.style.color = 'white';
    headerDiv.innerHTML = `
        <h3 style="margin:0;">📋 Rendus (${rendus.length})</h3>
        <button id="closeModalBtn" style="background:none; border:none; color:white; font-size:24px; cursor:pointer;">&times;</button>
    `;
    
    const bodyDiv = document.createElement('div');
    bodyDiv.style.padding = '20px';
    bodyDiv.style.maxHeight = '400px';
    bodyDiv.style.overflowY = 'auto';
    
    rendus.forEach(rendu => {
        const date = new Date(rendu.submittedAt).toLocaleDateString('fr-FR');
        const heure = new Date(rendu.submittedAt).toLocaleTimeString('fr-FR');
        
        // Afficher le nom complet de l'employé
        let nomComplet = '';
        if (rendu.employePrenom && rendu.employeNom) {
            nomComplet = `${rendu.employePrenom} ${rendu.employeNom}`;
        } else if (rendu.employeNom) {
            nomComplet = rendu.employeNom;
        } else if (rendu.employePrenom) {
            nomComplet = rendu.employePrenom;
        } else {
            nomComplet = rendu.employeId || 'Employé';
        }
        
        const renduItem = document.createElement('div');
        renduItem.style.borderBottom = '1px solid #e5e7eb';
        renduItem.style.padding = '12px';
        renduItem.style.display = 'flex';
        renduItem.style.justifyContent = 'space-between';
        renduItem.style.alignItems = 'center';
        renduItem.innerHTML = `
            <div>
                <strong>👤 ${nomComplet}</strong><br>
                <small style="color: #6b7280;">📅 Soumis le ${date} à ${heure}</small>
            </div>
            <span class="download-rendu-btn" data-id="${rendu.id}" 
                  style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; display: inline-block;">
                📥 Télécharger
            </span>
        `;
        bodyDiv.appendChild(renduItem);
    });
    
    contentDiv.appendChild(headerDiv);
    contentDiv.appendChild(bodyDiv);
    modalDiv.appendChild(contentDiv);
    document.body.appendChild(modalDiv);
    
    // Gérer la fermeture
    const closeBtn = document.getElementById('closeModalBtn');
    if (closeBtn) {
        closeBtn.onclick = () => {
            document.body.removeChild(modalDiv);
        };
    }
    
    // Gérer les téléchargements avec la méthode du service
    const downloadBtns = document.querySelectorAll('.download-rendu-btn');
    downloadBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = (e.target as HTMLElement).getAttribute('data-id');
            if (id) {
                this.telechargerRendu(id);
            }
        });
    });
    
    // Fermer en cliquant sur l'overlay
    modalDiv.onclick = (e) => {
        if (e.target === modalDiv) {
            document.body.removeChild(modalDiv);
        }
    };
}

    telechargerRendu(renduId: string): void {
        console.log('📥 Téléchargement du rendu:', renduId);
        
        this.documentService.telechargerRendu(renduId).subscribe({
            next: (blob: Blob) => {
                console.log('✅ Fichier reçu, taille:', blob.size, 'bytes');
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `rendu_${renduId}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                
                this.dialogService.alert({
                    title: 'Succès',
                    message: 'Téléchargement du rendu démarré',
                    type: 'success'
                });
            },
            error: (err) => {
                console.error('❌ Erreur téléchargement rendu:', err);
                this.dialogService.alert({
                    title: 'Erreur',
                    message: 'Impossible de télécharger le rendu: ' + (err.message || 'Erreur serveur'),
                    type: 'error',
                    confirmText: 'Fermer'
                });
            }
        });
    }

    onTypeFilterChange(event: Event): void {
        this.typeFiltre = (event.target as HTMLSelectElement).value;
    }

    onTitreChange(event: Event): void {
        this.uploadData.titre = (event.target as HTMLInputElement).value;
    }

    onDescriptionChange(event: Event): void {
        this.uploadData.description = (event.target as HTMLTextAreaElement).value;
    }

    onUploadTypeChange(event: Event): void {
        this.uploadData.type = (event.target as HTMLSelectElement).value;
    }

    getDocumentsFiltres(): DocumentFormation[] {
        if (this.typeFiltre === 'TOUS') {
            return this.documents;
        }
        return this.documents.filter(d => d.type === this.typeFiltre);
    }

    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getTypeInfo(type: string): any {
        return this.typeOptions.find(t => t.value === type) || this.typeOptions[0];
    }

    refreshDocuments(): void {
        this.loadDocuments();
    }
}