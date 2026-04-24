// components/recommendations/recommendations.component.ts
import { Component, OnInit } from '@angular/core';
import { RecommendationService, TechnologyRecommendation, PersonalizedRecommendation } from '../recommendation.service';
import { AuthService } from '../../../../../core/auth/auth.service';
import { DialogService } from '../../../../../core/services/dialog.service';

@Component({
  selector: 'app-recommendations',
  templateUrl: './recommendations.component.html',
  styleUrls: ['./recommendations.component.scss']
})
export class RecommendationsComponent implements OnInit {
  technologyRecommendations: TechnologyRecommendation[] = [];
  personalizedRecommendation: PersonalizedRecommendation | null = null;
  trendingTechnologies: string[] = [];
  isLoading = false;
  selectedTab: 'personnel' | 'technologies' | 'tendances' = 'personnel';
  
  constructor(
    private recommendationService: RecommendationService,
    private authService: AuthService,
    private dialogService: DialogService
  ) {}
  
  ngOnInit(): void {
    this.loadAllRecommendations();
  }
  
  loadAllRecommendations(): void {
    this.isLoading = true;
    
    const employeId = this.authService.getCurrentUserId();
    
    Promise.all([
      this.recommendationService.getPersonalizedRecommendations(employeId).toPromise(),
      this.recommendationService.getTechnologyRecommendations().toPromise(),
      this.recommendationService.getTrendingTechnologies().toPromise()
    ]).then(([personalized, technologies, trending]) => {
      this.personalizedRecommendation = personalized;
      this.technologyRecommendations = technologies || [];
      this.trendingTechnologies = trending || [];
      this.isLoading = false;
    }).catch(error => {
      console.error('Erreur chargement recommandations', error);
      this.isLoading = false;
      this.dialogService.alert({
        title: 'Erreur',
        message: 'Impossible de charger les recommandations',
        type: 'error',
        confirmText: 'Fermer'
      });
    });
  }
  
  getPriorityColor(priority: string): string {
    switch(priority) {
      case 'HAUTE': return '#ef4444';
      case 'MOYENNE': return '#f59e0b';
      default: return '#10b981';
    }
  }
  
  getScoreClass(score: number): string {
    if (score >= 80) return 'high-score';
    if (score >= 60) return 'medium-score';
    return 'low-score';
  }
  
  suggestFormation(tech: string): void {
    this.dialogService.confirm({
      title: 'Créer une formation',
      message: `Souhaitez-vous proposer la création d'une formation sur "${tech}" ?`,
      confirmText: 'Proposer',
      cancelText: 'Annuler',
      type: 'info'
    }).toPromise().then(confirmed => {
      if (confirmed) {
        // Rediriger vers le formulaire de création avec le titre pré-rempli
        // this.router.navigate(['/formations/nouvelle'], { queryParams: { titre: tech } });
        this.dialogService.alert({
          title: 'Proposition envoyée',
          message: `La formation "${tech}" a été proposée au service RH.`,
          type: 'success',
          confirmText: 'Fermer'
        });
      }
    });
  }
}