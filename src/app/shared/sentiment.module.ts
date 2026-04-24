// src/app/shared/sentiment.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SentimentAnalysisComponent } from '../modules/employee-formation/components/analyse-de-sentiment/sentiment-analysis.component';

@NgModule({
    declarations: [
        SentimentAnalysisComponent
    ],
    imports: [
        CommonModule
    ],
    exports: [
        SentimentAnalysisComponent
    ]
})
export class SharedSentimentModule { }