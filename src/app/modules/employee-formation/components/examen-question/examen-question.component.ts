// examen-question.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';

@Component({
    selector: 'app-examen-question',
    templateUrl: './examen-question.component.html',
    styleUrls: ['./examen-question.component.scss']
})
export class ExamenQuestionComponent {
    @Input() questionForm!: FormGroup;
    @Input() index!: number;
    @Input() typesQuestion: any[] = [];
    @Output() remove = new EventEmitter<void>();
    @Output() typeChange = new EventEmitter<number>();
    @Output() addOption = new EventEmitter<void>();
    @Output() removeOption = new EventEmitter<number>();

    // ✅ Créer des getters qui retournent FormControl
    get texteControl(): FormControl {
        return this.questionForm.get('texte') as FormControl;
    }

    get typeControl(): FormControl {
        return this.questionForm.get('type') as FormControl;
    }

    get pointsControl(): FormControl {
        return this.questionForm.get('points') as FormControl;
    }

    get correctAnswerControl(): FormControl {
        return this.questionForm.get('correctAnswer') as FormControl;
    }

    get codeTemplateControl(): FormControl {
        return this.questionForm.get('codeTemplate') as FormControl;
    }

    getOptions(): any {
        return this.questionForm.get('options');
    }

    onTypeChange(): void {
        this.typeChange.emit(this.index);
    }

    onRemove(): void {
        this.remove.emit();
    }

    onAddOption(): void {
        this.addOption.emit();
    }

    onRemoveOption(optionIndex: number): void {
        this.removeOption.emit(optionIndex);
    }
}