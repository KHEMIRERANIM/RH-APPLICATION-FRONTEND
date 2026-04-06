import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CareerService } from '../../services/career.service';
import { EvolutionPlanService } from '../../services/evolution-plan.service';
import { EvolutionPlan, EvolutionPlanStatus, Competence } from '../../models/evolution-plan.model';
import {
  EmployeeCertification, CertificationType,
  CertificationStatus, EvaluationMethod
} from '../../models/certification.model';
import { Career } from '../../models/career.model';

@Component({
  selector: 'app-employee-plan',
  templateUrl: './employee-plan.component.html',
  styleUrls: ['./employee-plan.component.scss']
})
export class EmployeePlanComponent implements OnInit {

  plan!: EvolutionPlan;
  careers: Career[] = [];
  isLoading = true;
  user: any = {};
  activeTab: string = 'poste';

  tabs = [
    { key: 'poste',       label: '🎯 Poste cible'       },
    { key: 'competences', label: '🧠 Mes compétences'    },
    { key: 'tech',        label: '⚙️ Certifs Techniques' },
    { key: 'soft',        label: '🤝 Soft Skills'        },
  ];

  newComp:   Partial<Competence>            = { niveau: 'INTERMEDIAIRE' };
  newCertif: Partial<EmployeeCertification> = { statut: CertificationStatus.NON_COMMENCE };

  showAddTech = false;
  showAddSoft = false;

  constructor(
    private planService: EvolutionPlanService,
    private careerService: CareerService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.user = JSON.parse(localStorage.getItem('currentUser') || '{}');

    this.careerService.getAll().subscribe(careers => {
      this.careers = careers;

      // Pré-sélectionner le poste actuel depuis le profil
      const currentCareer = careers.find(c =>
        c.title?.toLowerCase().trim() === this.user.poste?.toLowerCase().trim()
      );

      this.planService.getMyPlan().subscribe({
        next: plans => {
          if (plans && plans.length > 0) {
            this.plan = plans[0];
            // Si pas de poste actuel défini, prendre depuis le profil
            if (!this.plan.currentCareerId && currentCareer) {
              this.plan.currentCareerId    = currentCareer.id;
              this.plan.currentCareerTitle = currentCareer.title;
            }
          } else {
            this.plan = {
              employeeId:           this.user.id ?? '',
              targetCareerId:       '',
              status:               EvolutionPlanStatus.DRAFT,
              competencesActuelles: [],
              certifications:       [],
              currentCareerId:      currentCareer?.id ?? '',
              currentCareerTitle:   currentCareer?.title ?? this.user.poste ?? ''
            };
          }
          this.isLoading = false;
        },
        error: () => {
          this.plan = {
            employeeId:           this.user.id ?? '',
            targetCareerId:       '',
            status:               EvolutionPlanStatus.DRAFT,
            competencesActuelles: [],
            certifications:       [],
            currentCareerId:      currentCareer?.id ?? '',
            currentCareerTitle:   currentCareer?.title ?? this.user.poste ?? ''
          };
          this.isLoading = false;
        }
      });
    });
  }

  get certifsTech(): EmployeeCertification[] {
    return (this.plan?.certifications ?? []).filter(c => c.type === CertificationType.TECHNIQUE);
  }

  get certifsSoft(): EmployeeCertification[] {
    return (this.plan?.certifications ?? []).filter(c => c.type === CertificationType.SOFT_SKILL);
  }

  onTargetCareerChange(): void {
    const career = this.careers.find(c => c.id === this.plan.targetCareerId);
    this.plan.targetCareerTitle = career?.title;
  }

  savePoste(): void {
    if (!this.plan.targetCareerId) {
      this.snack('Veuillez choisir un poste cible', true);
      return;
    }
    this.save('Poste cible enregistré');
  }

  addCompetence(): void {
    if (!this.newComp.nom?.trim()) return;
    if (!this.plan.competencesActuelles) this.plan.competencesActuelles = [];
    this.plan.competencesActuelles.push({ ...this.newComp } as Competence);
    this.newComp = { niveau: 'INTERMEDIAIRE' };
  }

  removeCompetence(i: number): void {
    this.plan.competencesActuelles.splice(i, 1);
  }

  saveCompetences(): void {
    if (!this.plan.id) { this.save('Compétences enregistrées'); return; }
    this.planService.saveCompetences(this.plan.id, this.plan.competencesActuelles)
      .subscribe({
        next: p  => { this.plan = p; this.snack('Compétences enregistrées'); },
        error: () => this.snack('Erreur', true)
      });
  }

  saveCertif(c: EmployeeCertification): void {
    if (!this.plan.id) { this.save('Plan enregistré'); return; }
    const obs = c.id
      ? this.planService.updateCertification(this.plan.id, c.id, c)
      : this.planService.addCertification(this.plan.id, c);
    obs.subscribe({
      next: p  => { this.plan = p; this.snack('Certif enregistrée'); },
      error: () => this.snack('Erreur', true)
    });
  }

  uploadCertifFile(event: Event, certif: EmployeeCertification): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !this.plan.id || !certif.id) return;
    this.planService.uploadCertifFile(this.plan.id, certif.id, file).subscribe({
      next: (res: any) => {
        certif.fichierNom = res.fileName;
        certif.fichierUrl = res.fileUrl;
        this.snack('Fichier uploadé');
      },
      error: () => this.snack('Erreur upload', true)
    });
  }

  addExtraCertif(type: string): void {
    if (!this.newCertif.nom?.trim()) {
      this.snack('Veuillez saisir un nom', true);
      return;
    }
    if (!this.plan.certifications) this.plan.certifications = [];

    const certif: EmployeeCertification = {
      nom:           this.newCertif.nom!,
      type:          type as CertificationType,
      niveauRequis:  'INTERMEDIAIRE' as any,
      obligatoire:   false,
      methodeEval:   type === 'SOFT_SKILL'
                       ? EvaluationMethod.AUTO_EVAL
                       : EvaluationMethod.CERTIFICATION,
      statut:        this.newCertif.statut ?? CertificationStatus.NON_COMMENCE,
      dateObtention: this.newCertif.dateObtention
    };

    if (this.plan.id) {
      this.planService.addCertification(this.plan.id, certif).subscribe({
        next: p => {
          this.plan = p;
          this.snack('Certif ajoutée');
          this.newCertif  = { statut: CertificationStatus.NON_COMMENCE };
          this.showAddTech = false;
          this.showAddSoft = false;
        },
        error: () => this.snack('Erreur', true)
      });
    } else {
      this.plan.certifications.push(certif);
      this.newCertif  = { statut: CertificationStatus.NON_COMMENCE };
      this.showAddTech = false;
      this.showAddSoft = false;
      this.snack('Certif ajoutée — cliquez Enregistrer pour sauvegarder');
    }
  }

  private save(msg: string): void {
    const obs = this.plan.id
      ? this.planService.update(this.plan.id, this.plan)
      : this.planService.create(this.plan);
    obs.subscribe({
      next: p  => { this.plan = p; this.snack(msg); },
      error: () => this.snack('Erreur sauvegarde', true)
    });
  }

  statusLabel(s: any): string {
    return ({
      NON_COMMENCE: 'Non commencé',
      EN_COURS:     'En cours',
      OBTENU:       'Obtenu'
    } as any)[s] ?? s;
  }

  private snack(msg: string, isError = false): void {
    this.snackBar.open(msg, 'OK', {
      duration: 3000,
      panelClass: isError ? ['snack-error'] : []
    });
  }
}