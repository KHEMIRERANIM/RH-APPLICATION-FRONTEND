// src/app/modules/employee/components/examen-form/examen-form.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ExamenService } from '../../services/examen.service';
import { DialogService } from '../../../../core/services/dialog.service';
import { Examen, Question, OptionQuestion } from '../../../../shared/models/formation.model';

@Component({
    selector: 'app-examen-form',
    templateUrl: './examen-form.component.html',
    styleUrls: ['./examen-form.component.scss']
})
export class ExamenFormComponent implements OnInit {
    examenForm!: FormGroup;
    formationId: string = '';
    examenId: string | null = null;
    isEditMode = false;
    isLoading = false;
    
    typesQuestion = [
        { value: 'QCM', label: 'QCM (Choix multiple)', icon: '🔘' },
        { value: 'TEXTE', label: 'Question ouverte', icon: '📝' },
        { value: 'CODE', label: 'Exercice de code', icon: '💻' }
    ];

    constructor(
        private fb: FormBuilder,
        private examenService: ExamenService,
        private route: ActivatedRoute,
        private router: Router,
        private dialogService: DialogService
    ) {}

    ngOnInit(): void {
        this.initForm();
        
        this.route.params.subscribe(params => {
            this.formationId = params['formationId'];
            this.examenId = params['examenId'];
            this.isEditMode = !!this.examenId;
            
            if (this.isEditMode && this.examenId) {
                this.loadExamen();
            }
        });
    }

    initForm(): void {
        this.examenForm = this.fb.group({
            titre: ['', [Validators.required, Validators.minLength(3)]],
            description: ['', Validators.required],
            dureeMinutes: [60, [Validators.required, Validators.min(5), Validators.max(240)]],
            dateLimite: ['', Validators.required],
            questions: this.fb.array([])
        });
    }

    get questions(): FormArray {
        return this.examenForm.get('questions') as FormArray;
    }

    // ✅ Générer un ID unique
    private generateUniqueId(): string {
        return Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
    }

    createQuestionForm(question?: Question): FormGroup {
        return this.fb.group({
            id: [question?.id || this.generateUniqueId()],
            texte: [question?.texte || '', Validators.required],
            type: [question?.type || 'QCM', Validators.required],
            points: [question?.points || 1, [Validators.required, Validators.min(1)]],
            options: this.fb.array([]),
            correctAnswer: [question?.correctAnswer || ''],
            codeTemplate: [question?.codeTemplate || '']
        });
    }

    createOptionForm(option?: OptionQuestion): FormGroup {
        return this.fb.group({
            id: [option?.id || this.generateUniqueId()],
            texte: [option?.texte || '', Validators.required],
            estCorrect: [option?.estCorrect || false]
        });
    }

    getOptions(questionIndex: number): FormArray {
        return this.questions.at(questionIndex).get('options') as FormArray;
    }

    addQuestion(): void {
        this.questions.push(this.createQuestionForm());
    }

    removeQuestion(index: number): void {
        this.dialogService.confirm({
            title: 'Supprimer la question',
            message: 'Êtes-vous sûr de vouloir supprimer cette question ?',
            confirmText: 'Supprimer',
            cancelText: 'Annuler',
            type: 'warning'
        }).subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.questions.removeAt(index);
            }
        });
    }

    addOption(questionIndex: number): void {
        const options = this.getOptions(questionIndex);
        options.push(this.createOptionForm());
    }

    removeOption(questionIndex: number, optionIndex: number): void {
        const options = this.getOptions(questionIndex);
        options.removeAt(optionIndex);
    }

    onTypeChange(questionIndex: number): void {
        const questionForm = this.questions.at(questionIndex);
        const type = questionForm.get('type')?.value;
        
        if (type === 'QCM') {
            questionForm.get('correctAnswer')?.setValue('');
            questionForm.get('codeTemplate')?.setValue('');
        } else if (type === 'TEXTE') {
            const options = this.getOptions(questionIndex);
            while (options.length) {
                options.removeAt(0);
            }
            questionForm.get('codeTemplate')?.setValue('');
        } else if (type === 'CODE') {
            const options = this.getOptions(questionIndex);
            while (options.length) {
                options.removeAt(0);
            }
            questionForm.get('correctAnswer')?.setValue('');
        }
    }

    loadExamen(): void {
        if (!this.examenId) return;
        
        this.isLoading = true;
        this.examenService.getExamenById(this.examenId).subscribe({
            next: (examen) => {
                this.examenForm.patchValue({
                    titre: examen.titre,
                    description: examen.description,
                    dureeMinutes: examen.dureeMinutes,
                    dateLimite: this.formatDateForInput(examen.dateLimite)
                });
                
                if (examen.questions && examen.questions.length > 0) {
                    for (const question of examen.questions) {
                        const questionForm = this.createQuestionForm(question);
                        this.questions.push(questionForm);
                        
                        if (question.type === 'QCM' && question.options) {
                            const optionsArray = questionForm.get('options') as FormArray;
                            for (const option of question.options) {
                                optionsArray.push(this.createOptionForm(option));
                            }
                        }
                    }
                }
                
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Erreur chargement examen', err);
                this.dialogService.alert({
                    title: 'Erreur',
                    message: 'Impossible de charger l\'examen',
                    type: 'error'
                });
                this.isLoading = false;
            }
        });
    }

    formatDateForInput(date: any): string {
        if (!date) return '';
        const d = new Date(date);
        return d.toISOString().slice(0, 16);
    }

    onSubmit(): void {
        if (this.examenForm.invalid) {
            this.examenForm.markAllAsTouched();
            this.dialogService.alert({
                title: 'Formulaire invalide',
                message: 'Veuillez remplir tous les champs obligatoires',
                type: 'warning'
            });
            return;
        }

        const formValue = this.examenForm.value;
        const examenData: Partial<Examen> = {
            formationId: this.formationId,
            titre: formValue.titre,
            description: formValue.description,
            dureeMinutes: formValue.dureeMinutes,
            dateLimite: new Date(formValue.dateLimite),
            questions: this.prepareQuestions()
        };

        this.isLoading = true;

        if (this.isEditMode && this.examenId) {
            this.examenService.updateExamen(this.examenId, examenData).subscribe({
                next: () => {
                    this.dialogService.alert({
                        title: 'Succès',
                        message: 'Examen modifié avec succès',
                        type: 'success'
                    });
                    this.router.navigate(['/employee/formations', this.formationId, 'examens']);
                    this.isLoading = false;
                },
                error: (err) => {
                    console.error('Erreur mise à jour', err);
                    this.dialogService.alert({
                        title: 'Erreur',
                        message: 'Impossible de modifier l\'examen',
                        type: 'error'
                    });
                    this.isLoading = false;
                }
            });
        } else {
            this.examenService.createExamen(examenData).subscribe({
                next: () => {
                    this.dialogService.alert({
                        title: 'Succès',
                        message: 'Examen créé avec succès',
                        type: 'success'
                    });
                    this.router.navigate(['/employee/formations', this.formationId, 'examens']);
                    this.isLoading = false;
                },
                error: (err) => {
                    console.error('Erreur création', err);
                    this.dialogService.alert({
                        title: 'Erreur',
                        message: 'Impossible de créer l\'examen',
                        type: 'error'
                    });
                    this.isLoading = false;
                }
            });
        }
    }

    prepareQuestions(): Question[] {
        const questions: Question[] = [];
        
        for (let i = 0; i < this.questions.length; i++) {
            const q = this.questions.at(i).value;
            const question: Question = {
                id: q.id || this.generateUniqueId(),
                texte: q.texte,
                type: q.type,
                points: q.points,
                options: [],
                correctAnswer: q.correctAnswer,
                codeTemplate: q.codeTemplate
            };
            
            if (q.type === 'QCM' && q.options && q.options.length > 0) {
                question.options = q.options.map((opt: any) => ({
                    ...opt,
                    id: opt.id || this.generateUniqueId()
                }));
            }
            
            questions.push(question);
        }
        
        return questions;
    }

    onCancel(): void {
        this.router.navigate(['/employee/formations', this.formationId, 'examens']);
    }
}