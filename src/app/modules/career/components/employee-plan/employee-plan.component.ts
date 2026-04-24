import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CareerService } from '../../services/career.service';
import { EvolutionPlanService } from '../../services/evolution-plan.service';
import {
  EvolutionPlan,
  EvolutionPlanStatus,
  Competence,
  parseCompetences
} from '../../models/evolution-plan.model';
import {
  EmployeeCertification,
  CertificationType,
  CertificationStatus,
  EvaluationMethod
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
    { key: 'poste', label: '🎯 Poste cible' },
    { key: 'competences', label: '🧠 Mes compétences' },
    { key: 'tech', label: '⚙️ Certifs Techniques' },
    { key: 'soft', label: '🤝 Soft Skills' }
  ];

  newComp: Partial<Competence> = { niveau: 'INTERMEDIAIRE' };
  newCertif: Partial<EmployeeCertification> = {
    statut: CertificationStatus.NON_COMMENCE
  };

  newCertifFile: File | null = null;
  newCertifFileName: string = '';
  showAddTech = false;
  showAddSoft = false;

  constructor(
    private planService: EvolutionPlanService,
    private careerService: CareerService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    console.log('[EmployeePlan] currentUser =', this.user);
    console.log('[EmployeePlan] poste récupéré =', this.user?.poste);
    this.loadData();
  }

  /**
   * Retourne le vrai poste utilisateur avec priorité absolue au champ `poste`.
   */
  private getUserPoste(): string {
    const u = this.user || {};

    const raw =
      u.poste ??
      u.jobTitle ??
      u.position ??
      u.currentPosition ??
      u.titre ??
      u.role_metier ??
      '';

    return String(raw).trim();
  }

  private loadData(): void {
    this.isLoading = true;

    this.careerService.getAll().subscribe({
      next: (careers) => {
        this.careers = careers;

        const userPoste = this.getUserPoste();
        const userPosteLower = userPoste.toLowerCase().trim();

        let currentCareer: Career | undefined;
        if (userPosteLower) {
          currentCareer =
            careers.find((c: Career) => c.title?.toLowerCase().trim() === userPosteLower) ||
            careers.find((c: Career) => c.title?.toLowerCase().includes(userPosteLower)) ||
            careers.find((c: Career) => userPosteLower.includes(c.title?.toLowerCase().trim() ?? ''));
        }

        console.log('[EmployeePlan] currentCareer matché =', currentCareer);

        this.planService.getMyPlan().subscribe({
          next: (plans) => {
            if (plans && plans.length > 0) {
              const raw = plans[0];

              this.plan = {
                ...raw,
                competencesActuelles: parseCompetences(raw),
                currentCareerId: currentCareer?.id ?? raw.currentCareerId ?? '',
                currentCareerTitle: userPoste || raw.currentCareerTitle || 'Non défini'
              };

              if (this.plan.targetCareerId && !this.plan.targetCareerTitle) {
                const target = careers.find(c => c.id === this.plan.targetCareerId);
                if (target) {
                  this.plan.targetCareerTitle = target.title;
                }
              }
            } else {
              this.plan = {
                employeeId: this.user.id ?? '',
                targetCareerId: '',
                status: EvolutionPlanStatus.DRAFT,
                competencesActuelles: [],
                certifications: [],
                currentCareerId: currentCareer?.id ?? '',
                currentCareerTitle: userPoste || 'Non défini'
              };
            }

            console.log('[EmployeePlan] plan.currentCareerTitle =', this.plan.currentCareerTitle);
            this.isLoading = false;
          },
          error: (err) => {
            console.error('[EmployeePlan] erreur getMyPlan =', err);

            this.plan = {
              employeeId: this.user.id ?? '',
              targetCareerId: '',
              status: EvolutionPlanStatus.DRAFT,
              competencesActuelles: [],
              certifications: [],
              currentCareerId: currentCareer?.id ?? '',
              currentCareerTitle: userPoste || 'Non défini'
            };

            this.isLoading = false;
          }
        });
      },
      error: (err) => {
        console.error('[EmployeePlan] erreur getAll careers =', err);
        this.isLoading = false;
      }
    });
  }

  get certifsTech(): EmployeeCertification[] {
    return (this.plan?.certifications ?? []).filter(
      c => c.type === CertificationType.TECHNIQUE
    );
  }

  get certifsSoft(): EmployeeCertification[] {
    return (this.plan?.certifications ?? []).filter(
      c => c.type === CertificationType.SOFT_SKILL
    );
  }

  get posteActuel(): string {
    return this.getUserPoste().trim() || this.plan?.currentCareerTitle?.trim() || 'Non défini';
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
    if (!this.newComp.nom?.trim()) {
      return;
    }

    if (!this.plan.competencesActuelles) {
      this.plan.competencesActuelles = [];
    }

    this.plan.competencesActuelles.push({
      ...this.newComp
    } as Competence);

    this.newComp = { niveau: 'INTERMEDIAIRE' };
  }

  removeCompetence(i: number): void {
    this.plan.competencesActuelles.splice(i, 1);
  }

  saveCompetences(): void {
    if (!this.plan.competencesActuelles?.length) {
      this.snack('Ajoutez au moins une compétence', true);
      return;
    }

    if (!this.plan.id) {
      this.snack('Plan introuvable', true);
      return;
    }

    this.planService.saveCompetences(this.plan.id, this.plan.competencesActuelles)
      .subscribe({
        next: (p) => {
          this.plan = {
            ...p,
            competencesActuelles: parseCompetences(p),
            currentCareerTitle: this.posteActuel,
            currentCareerId: this.plan.currentCareerId
          };
          this.snack('Compétences enregistrées');
        },
        error: (err) => {
          console.error('Erreur saveCompetences:', err);
          this.snack('Erreur lors de la sauvegarde des compétences', true);
        }
      });
  }

  saveCertif(c: EmployeeCertification): void {
    if (!this.plan.id) {
      this.save('Plan enregistré');
      return;
    }

    console.log('CERTIF AVANT SAVE =', c);

    const obs = c.id
      ? this.planService.updateCertification(this.plan.id, c.id, c)
      : this.planService.addCertification(this.plan.id, c);

    obs.subscribe({
      next: (p) => {
        console.log('PLAN RETOUR SAVE CERTIF =', p);
        console.log('CERTIFS RETOUR =', p.certifications);

        this.plan = {
          ...p,
          competencesActuelles: parseCompetences(p),
          currentCareerTitle: this.posteActuel
        };

        this.snack('Certification enregistrée');
      },
      error: (err) => {
        console.error(err);
        this.snack('Erreur lors de la sauvegarde', true);
      }
    });
  }

  uploadCertifFile(event: Event, certif: EmployeeCertification): void {
    const file = (event.target as HTMLInputElement).files?.[0];

    console.log('UPLOAD certif =', certif);
    console.log('UPLOAD certif.id =', certif?.id);
    console.log('UPLOAD plan.id =', this.plan?.id);

    if (!file) {
      this.snack('Aucun fichier sélectionné', true);
      return;
    }

    if (!this.plan.id) {
      this.snack('Plan introuvable', true);
      return;
    }

    if (!certif.id) {
      this.snack('Veuillez d’abord enregistrer la certification', true);
      return;
    }

    this.planService.uploadCertifFile(this.plan.id, certif.id, file).subscribe({
      next: (res: any) => {
        certif.fichierNom = res.fileName ?? certif.fichierNom;
        certif.fichierUrl = res.fileUrl ?? certif.fichierUrl;
        this.snack('Fichier uploadé avec succès');
      },
      error: (err) => {
        console.error(err);
        this.snack('Erreur lors de l\'upload du fichier', true);
      }
    });
  }

  onNewCertifFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }

    this.newCertifFile = file;
    this.newCertifFileName = file.name;
  }

  clearNewCertifFile(): void {
    this.newCertifFile = null;
    this.newCertifFileName = '';
  }

  addExtraCertif(type: string): void {
    if (!this.newCertif.nom?.trim()) {
      this.snack('Veuillez saisir un nom pour la certification', true);
      return;
    }

    const certif: EmployeeCertification = {
      nom: this.newCertif.nom!,
      type: type as CertificationType,
      niveauRequis: 'INTERMEDIAIRE' as any,
      obligatoire: false,
      methodeEval:
        type === 'SOFT_SKILL'
          ? EvaluationMethod.AUTO_EVAL
          : EvaluationMethod.CERTIFICATION,
      statut: this.newCertif.statut ?? CertificationStatus.NON_COMMENCE,
      dateObtention: this.newCertif.dateObtention,
      fichierNom: this.newCertifFileName || undefined
    };

    if (!this.plan.id) {
      if (!this.plan.certifications) {
        this.plan.certifications = [];
      }

      this.plan.certifications.push(certif);
      this.save('Plan enregistré avec la certification');
      this.resetNewCertifForm();
      return;
    }

    this.planService.addCertification(this.plan.id, certif).subscribe({
      next: (updatedPlan) => {
        this.plan = {
          ...updatedPlan,
          competencesActuelles: parseCompetences(updatedPlan),
          currentCareerTitle: this.posteActuel
        };

        const createdCertif =
          this.plan.certifications[this.plan.certifications.length - 1];

        if (this.newCertifFile && createdCertif?.id) {
          this.planService
            .uploadCertifFile(this.plan.id!, createdCertif.id, this.newCertifFile)
            .subscribe({
              next: () => {
                this.snack('Certification ajoutée avec fichier ✓');
                this.resetNewCertifForm();
              },
              error: (err) => {
                console.error('Erreur upload:', err);
                this.snack(
                  'Certification ajoutée - Erreur lors de l\'upload du fichier',
                  true
                );
                this.resetNewCertifForm();
              }
            });
        } else {
          this.snack('Certification ajoutée avec succès ✓');
          this.resetNewCertifForm();
        }
      },
      error: (err) => {
        console.error(err);
        this.snack('Erreur lors de l\'ajout de la certification', true);
      }
    });
  }

  openFile(fileUrl: string): void {
    if (!fileUrl) {
      this.snack('Fichier introuvable', true);
      return;
    }

    const fullUrl = fileUrl.startsWith('http')
      ? fileUrl
      : `http://localhost:8081${fileUrl}`;

    window.open(fullUrl, '_blank');
  }

  private resetNewCertifForm(): void {
    this.newCertif = { statut: CertificationStatus.NON_COMMENCE };
    this.newCertifFile = null;
    this.newCertifFileName = '';
    this.showAddTech = false;
    this.showAddSoft = false;
  }

  private save(msg: string): void {
    const obs = this.plan.id
      ? this.planService.update(this.plan.id, this.plan)
      : this.planService.create(this.plan);

    obs.subscribe({
      next: (p) => {
        this.plan = {
          ...p,
          competencesActuelles: parseCompetences(p),
          currentCareerTitle: this.posteActuel,
          currentCareerId: this.plan.currentCareerId
        };
        this.snack(msg);
      },
      error: () => this.snack('Erreur lors de la sauvegarde', true)
    });
  }

  statusLabel(s: any): string {
    return (
      {
        NON_COMMENCE: 'Non commencé',
        EN_COURS: 'En cours',
        OBTENU: 'Obtenu'
      } as any
    )[s] ?? s;
  }

  private snack(msg: string, isError = false): void {
    this.snackBar.open(msg, 'OK', {
      duration: 3000,
      panelClass: isError ? ['snack-error'] : []
    });
  }
}