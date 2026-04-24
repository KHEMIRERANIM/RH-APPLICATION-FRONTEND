// src/app/modules/employee/components/examens-list/examens-list.component.ts
import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ExamenService } from '../../services/examen.service';
import { DialogService } from '../../../../core/services/dialog.service';
import { Examen, ResultatExamen, Question, OptionQuestion } from '../../../../shared/models/formation.model';
import { FormateurService } from '../../formateurs/formateur.service';

@Component({
    selector: 'app-examens-list',
    templateUrl: './examens-list.component.html',
    styleUrls: ['./examens-list.component.scss']
})
export class ExamensListComponent implements OnInit, OnChanges {
    @Input() formationId!: string;
    @Input() inlineMode: boolean = false;
    
    examens: Examen[] = [];
    isLoading = false;
    isSubmitting = false;
    isFormateurFlag = false;
    userRole: string | null = null;
    
    // État UI
    showCreationForm = false;
    expandedExamenId: string | null = null;
    statistiquesExamen: { [key: string]: any } = {};
    
    // Nouvel examen - Version complète avec questions
    newExamen = {
        titre: '',
        description: '',
        questions: [] as any[]
    };
    
    // Types de questions disponibles
    typesQuestion = [
        { value: 'QCM', label: 'QCM (Choix multiple)', icon: '🔘' },
        { value: 'TEXTE', label: 'Question ouverte', icon: '📝' },
        { value: 'CODE', label: 'Exercice de code', icon: '💻' }
    ];
    
    // Modale résultats
    selectedExamen: Examen | null = null;
    showResultsModal = false;
    resultats: ResultatExamen[] = [];
    statistiques: any = null;
    isLoadingResults = false;

    constructor(
        private examenService: ExamenService,
        private router: Router,
        private route: ActivatedRoute,
        private dialogService: DialogService,
        private formateurService: FormateurService
    ) {}

    ngOnInit(): void {
        this.userRole = localStorage.getItem('userRole');
        this.checkIfFormateur();
        if (this.formationId) {
            this.loadExamens();
        }
        this.addQuestion(); // Ajouter une question par défaut
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['formationId'] && !changes['formationId'].firstChange && this.formationId) {
            this.loadExamens();
            this.resetUIState();
        }
    }

    resetUIState(): void {
        this.showCreationForm = false;
        this.expandedExamenId = null;
        this.resetForm();
    }
resetForm(): void {
    this.newExamen = {
        titre: '',
        description: '',
        questions: []
    };
    this.isEditing = false;
    this.editingExamen = null;
    this.addQuestion();
}

toggleCreationForm(): void {
    this.showCreationForm = !this.showCreationForm;
    if (!this.showCreationForm) {
        this.resetForm();
    }
}

    // ==================== GESTION DES QUESTIONS ====================
    
    addQuestion(): void {
        this.newExamen.questions.push({
            id: Date.now(),
            texte: '',
            type: 'QCM',
            points: 1,
            options: [
                { id: Date.now() + 1, texte: '', estCorrect: false },
                { id: Date.now() + 2, texte: '', estCorrect: false }
            ],
            correctAnswer: '',
            codeTemplate: ''
        });
    }

    removeQuestion(index: number): void {
        this.newExamen.questions.splice(index, 1);
    }

    moveQuestionUp(index: number): void {
        if (index > 0) {
            const temp = this.newExamen.questions[index];
            this.newExamen.questions[index] = this.newExamen.questions[index - 1];
            this.newExamen.questions[index - 1] = temp;
        }
    }

    moveQuestionDown(index: number): void {
        if (index < this.newExamen.questions.length - 1) {
            const temp = this.newExamen.questions[index];
            this.newExamen.questions[index] = this.newExamen.questions[index + 1];
            this.newExamen.questions[index + 1] = temp;
        }
    }

    duplicateQuestion(index: number): void {
        const original = this.newExamen.questions[index];
        const cloned = JSON.parse(JSON.stringify(original));
        cloned.id = Date.now();
        if (cloned.options) {
            cloned.options = cloned.options.map((opt: any) => ({ ...opt, id: Date.now() + Math.random() }));
        }
        this.newExamen.questions.splice(index + 1, 0, cloned);
    }

    // ==================== GESTION DES OPTIONS QCM ====================
    
    addOption(questionIndex: number): void {
        this.newExamen.questions[questionIndex].options.push({
            id: Date.now(),
            texte: '',
            estCorrect: false
        });
    }

    removeOption(questionIndex: number, optionIndex: number): void {
        const options = this.newExamen.questions[questionIndex].options;
        if (options.length > 2) {
            options.splice(optionIndex, 1);
        } else {
            this.dialogService.alert({
                title: 'Impossible',
                message: 'Une question QCM doit avoir au moins 2 options',
                type: 'warning'
            });
        }
    }

    onTypeChange(questionIndex: number): void {
        const question = this.newExamen.questions[questionIndex];
        if (question.type === 'QCM') {
            question.correctAnswer = '';
            question.codeTemplate = '';
            if (!question.options || question.options.length === 0) {
                question.options = [
                    { id: Date.now() + 1, texte: '', estCorrect: false },
                    { id: Date.now() + 2, texte: '', estCorrect: false }
                ];
            }
        } else if (question.type === 'TEXTE') {
            question.options = [];
            question.codeTemplate = '';
        } else if (question.type === 'CODE') {
            question.options = [];
            question.correctAnswer = '';
        }
    }

    // ==================== VALIDATION ET CRÉATION ====================
    
    validateQuestions(): boolean {
        for (let i = 0; i < this.newExamen.questions.length; i++) {
            const q = this.newExamen.questions[i];
            
            if (!q.texte.trim()) {
                this.dialogService.alert({
                    title: 'Erreur',
                    message: `La question ${i + 1} n'a pas de texte`,
                    type: 'warning'
                });
                return false;
            }
            
            if (q.type === 'QCM') {
                let hasCorrect = false;
                for (const opt of q.options) {
                    if (!opt.texte.trim()) {
                        this.dialogService.alert({
                            title: 'Erreur',
                            message: `La question ${i + 1} a une option vide`,
                            type: 'warning'
                        });
                        return false;
                    }
                    if (opt.estCorrect) hasCorrect = true;
                }
                if (!hasCorrect) {
                    this.dialogService.alert({
                        title: 'Erreur',
                        message: `La question ${i + 1} doit avoir au moins une option correcte`,
                        type: 'warning'
                    });
                    return false;
                }
            }
            
            if (q.type === 'TEXTE' && !q.correctAnswer?.trim()) {
                this.dialogService.alert({
                    title: 'Erreur',
                    message: `La question ${i + 1} n'a pas de réponse correcte`,
                    type: 'warning'
                });
                return false;
            }
        }
        return true;
    }

   onSubmitExamen(): void {
    if (!this.newExamen.titre.trim()) {
        this.dialogService.alert({
            title: 'Erreur',
            message: 'Veuillez saisir un titre',
            type: 'warning'
        });
        return;
    }
    
    if (this.newExamen.questions.length === 0) {
        this.dialogService.alert({
            title: 'Erreur',
            message: 'Ajoutez au moins une question',
            type: 'warning'
        });
        return;
    }
    
    if (!this.validateQuestions()) {
        return;
    }

    this.isSubmitting = true;
    
    // ✅ Calculer la date limite (1 jour après la création)
    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() + 1); // +1 jour
    
    // Construire les questions au format attendu par l'API
    const questions: Question[] = this.newExamen.questions.map((q, idx) => {
        const question: Question = {
            id: `q_${Date.now()}_${idx}`,
            texte: q.texte,
            type: q.type,
            points: q.points || 1,
            options: [],
            correctAnswer: q.correctAnswer,
            codeTemplate: q.codeTemplate
        };
        
        if (q.type === 'QCM' && q.options) {
            question.options = q.options.map((opt: any, optIdx: number) => ({
                id: `opt_${Date.now()}_${idx}_${optIdx}`,
                texte: opt.texte,
                estCorrect: opt.estCorrect
            }));
        }
        
        return question;
    });
    
    const examenData: any = {
        id: `ex_${Date.now()}`,
        formationId: this.formationId,
        titre: this.newExamen.titre,
        description: this.newExamen.description || 'Aucune description',
        dureeMinutes: 60,
        dateLimite: dateLimite,  // ✅ Date limite ajoutée
        questions: questions,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    
    this.examenService.createExamen(examenData).subscribe({
        next: () => {
            this.isSubmitting = false;
            this.loadExamens();
            this.toggleCreationForm();
            this.dialogService.alert({
                title: 'Succès',
                message: 'Examen créé avec succès. Date limite: ' + dateLimite.toLocaleDateString(),
                type: 'success'
            });
        },
        error: (err) => {
            console.error('Erreur création', err);
            this.isSubmitting = false;
            this.dialogService.alert({
                title: 'Erreur',
                message: 'Impossible de créer l\'examen',
                type: 'error'
            });
        }
    });
}
// Ajouter une propriété pour l'édition
editingExamen: Examen | null = null;
isEditing = false;

// Méthode pour ouvrir le formulaire d'édition
editExamenWithForm(examen: Examen): void {
    if (!this.isFormateurFlag) {
        this.dialogService.alert({
            title: 'Accès refusé',
            message: 'Seuls les formateurs peuvent modifier des examens',
            type: 'warning'
        });
        return;
    }
    
    this.isEditing = true;
    this.editingExamen = examen;
    
    // Remplir le formulaire avec les données de l'examen
    this.newExamen = {
        titre: examen.titre,
        description: examen.description || '',
        questions: examen.questions.map(q => ({
            id: q.id,
            texte: q.texte,
            type: q.type,
            points: q.points,
            options: q.options ? [...q.options] : [],
            correctAnswer: q.correctAnswer || '',
            codeTemplate: q.codeTemplate || ''
        }))
    };
    
    this.showCreationForm = true;
}

// Méthode pour mettre à jour l'examen
onUpdateExamen(): void {
    if (!this.newExamen.titre.trim()) {
        this.dialogService.alert({
            title: 'Erreur',
            message: 'Veuillez saisir un titre',
            type: 'warning'
        });
        return;
    }
    
    if (this.newExamen.questions.length === 0) {
        this.dialogService.alert({
            title: 'Erreur',
            message: 'Ajoutez au moins une question',
            type: 'warning'
        });
        return;
    }
    
    if (!this.validateQuestions()) {
        return;
    }

    this.isSubmitting = true;
    
    const questions: Question[] = this.newExamen.questions.map((q, idx) => {
        const question: Question = {
            id: q.id || `q_${Date.now()}_${idx}`,
            texte: q.texte,
            type: q.type,
            points: q.points || 1,
            options: [],
            correctAnswer: q.correctAnswer,
            codeTemplate: q.codeTemplate
        };
        
        if (q.type === 'QCM' && q.options) {
            question.options = q.options.map((opt: any, optIdx: number) => ({
                id: opt.id || `opt_${Date.now()}_${idx}_${optIdx}`,
                texte: opt.texte,
                estCorrect: opt.estCorrect
            }));
        }
        
        return question;
    });
    
    const examenData: any = {
        titre: this.newExamen.titre,
        description: this.newExamen.description || 'Aucune description',
        dureeMinutes: 60,
        dateLimite: this.editingExamen?.dateLimite || new Date(),
        questions: questions,
        updatedAt: new Date()
    };
    
    this.examenService.updateExamen(this.editingExamen!.id, examenData).subscribe({
        next: () => {
            this.isSubmitting = false;
            this.loadExamens();
            this.toggleCreationForm();
            this.dialogService.alert({
                title: 'Succès',
                message: 'Examen mis à jour avec succès',
                type: 'success'
            });
        },
        error: (err) => {
            console.error('Erreur mise à jour', err);
            this.isSubmitting = false;
            this.dialogService.alert({
                title: 'Erreur',
                message: 'Impossible de mettre à jour l\'examen',
                type: 'error'
            });
        }
    });
}
    checkIfFormateur(): void {
        const userId = localStorage.getItem('userId');
        const currentUserStr = localStorage.getItem('currentUser');
        let email: string | null = null;

        if (currentUserStr) {
            try {
                const userData = JSON.parse(currentUserStr);
                email = userData.email || null;
            } catch (e) {
                console.error('Erreur parsing currentUser:', e);
            }
        }

        if (!userId && !email) {
            this.isFormateurFlag = false;
            return;
        }

        this.formateurService.getFormateurs().subscribe({
            next: (formateurs) => {
                const formateur = formateurs.find(f =>
                    (userId && f.userId === userId) ||
                    (email && f.email === email)
                );
                this.isFormateurFlag = !!formateur;
            },
            error: (err) => {
                console.error('Erreur vérification formateur', err);
                this.isFormateurFlag = false;
            }
        });
    }

    loadExamens(): void {
        if (!this.formationId) return;
        
        this.isLoading = true;
        this.examenService.getExamensByFormation(this.formationId).subscribe({
            next: (data) => {
                this.examens = data;
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Erreur chargement examens', err);
                this.dialogService.alert({
                    title: 'Erreur',
                    message: 'Impossible de charger les examens',
                    type: 'error'
                });
                this.isLoading = false;
            }
        });
    }

    toggleExamenDetails(examenId: string): void {
        if (this.expandedExamenId === examenId) {
            this.expandedExamenId = null;
        } else {
            this.expandedExamenId = examenId;
        }
    }

    editExamen(examenId: string): void {
        if (!this.isFormateurFlag) {
            this.dialogService.alert({
                title: 'Accès refusé',
                message: 'Seuls les formateurs peuvent modifier des examens',
                type: 'warning'
            });
            return;
        }
        
        if (this.inlineMode) {
            this.router.navigate(['/employee/formations', this.formationId, 'examens', examenId, 'edit']);
        } else {
            this.router.navigate([examenId, 'edit'], { relativeTo: this.route });
        }
    }

    viewResults(examen: Examen): void {
        this.selectedExamen = examen;
        this.showResultsModal = true;
        this.loadResultatsForExamen(examen.id);
    }

    loadResultatsForExamen(examenId: string): void {
        this.isLoadingResults = true;
        
        this.examenService.getResultatsByExamen(examenId).subscribe({
            next: (resultats) => {
                this.resultats = resultats.sort((a, b) => b.note - a.note);
                this.isLoadingResults = false;
            },
            error: (err) => {
                console.error('Erreur chargement résultats', err);
                this.isLoadingResults = false;
            }
        });
    }

    closeResultsModal(): void {
        this.showResultsModal = false;
        this.selectedExamen = null;
        this.resultats = [];
    }

    deleteExamen(examen: Examen): void {
        if (!this.isFormateurFlag) {
            this.dialogService.alert({
                title: 'Accès refusé',
                message: 'Seuls les formateurs peuvent supprimer des examens',
                type: 'warning'
            });
            return;
        }

        this.dialogService.confirm({
            title: 'Supprimer l\'examen',
            message: `Êtes-vous sûr de vouloir supprimer l'examen "${examen.titre}" ?`,
            confirmText: 'Supprimer',
            cancelText: 'Annuler',
            type: 'warning'
        }).subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.examenService.deleteExamen(examen.id).subscribe({
                    next: () => {
                        this.loadExamens();
                        this.dialogService.alert({
                            title: 'Succès',
                            message: 'Examen supprimé',
                            type: 'success'
                        });
                    },
                    error: (err) => {
                        console.error('Erreur suppression', err);
                        this.dialogService.alert({
                            title: 'Erreur',
                            message: 'Impossible de supprimer l\'examen',
                            type: 'error'
                        });
                    }
                });
            }
        });
    }

    passerExamen(examenId: string): void {
        this.router.navigate(['/employee/examens', examenId, 'passer']);
    }

    peutPasserExamen(): boolean {
        return this.userRole === 'EMPLOYE';
    }

    getTotalPoints(examen: Examen): number {
        if (!examen.questions || examen.questions.length === 0) return 0;
        return examen.questions.reduce((total, q) => total + (q.points || 1), 0);
    }

    isFormateur(): boolean {
        return this.isFormateurFlag;
    }

    getTauxReussite(): number {
        if (!this.resultats.length) return 0;
        const reussis = this.resultats.filter(r => r.note >= 10).length;
        return Math.round((reussis / this.resultats.length) * 100);
    }

    getNoteMoyenne(): number {
        if (!this.resultats.length) return 0;
        const somme = this.resultats.reduce((acc, r) => acc + r.note, 0);
        return Math.round((somme / this.resultats.length) * 10) / 10;
    }

    getNoteMin(): number {
        if (!this.resultats.length) return 0;
        return Math.min(...this.resultats.map(r => r.note));
    }

    getNoteMax(): number {
        if (!this.resultats.length) return 0;
        return Math.max(...this.resultats.map(r => r.note));
    }

    getNoteClass(note: number): string {
        if (note >= 15) return 'note-excellent';
        if (note >= 12) return 'note-bien';
        if (note >= 10) return 'note-passable';
        return 'note-insuffisant';
    }

    getNoteIcon(note: number): string {
        if (note >= 15) return '🏆';
        if (note >= 12) return '👍';
        if (note >= 10) return '✅';
        return '⚠️';
    }

    getPourcentage(note: number): number {
        return Math.round((note / 20) * 100);
    }

    getStatutText(note: number): string {
        return note >= 10 ? 'Réussi' : 'Échoué';
    }

    exporterResultats(): void {
        const csv = this.convertToCSV(this.resultats);
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resultats_${this.selectedExamen?.titre}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.dialogService.alert({
            title: 'Succès',
            message: 'Exportation terminée',
            type: 'success'
        });
    }

    convertToCSV(data: ResultatExamen[]): string {
        const headers = ['Nom', 'Prénom', 'Email', 'Note /20', 'Pourcentage', 'Statut', 'Date soumission'];
        const rows = data.map(r => [
            this.escapeCSV(r.employeNom || ''),
            this.escapeCSV(r.employePrenom || ''),
            this.escapeCSV(r.employeEmail || ''),
            r.note.toString(),
            this.getPourcentage(r.note) + '%',
            this.getStatutText(r.note),
            new Date(r.submittedAt).toLocaleString('fr-FR')
        ]);
        return [headers, ...rows].map(row => row.join(';')).join('\n');
    }

    private escapeCSV(value: string): string {
        if (value.includes(';') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }
    // Dans examens-list.component.ts, ajouter cette méthode
getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index); // A, B, C, D...
}

// Ajouter aussi cette méthode pour vérifier si une question QCM a une option correcte
hasCorrectOption(question: any): boolean {
    if (!question.options) return false;
    return question.options.some((opt: any) => opt.estCorrect === true);
}
}