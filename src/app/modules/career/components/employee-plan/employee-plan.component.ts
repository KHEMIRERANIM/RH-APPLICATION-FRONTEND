import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CareerService } from '../../services/career.service';
import { EvolutionPlanService } from '../../services/evolution-plan.service';
import { EvolutionPlan, EvolutionPlanStatus, Competence, parseCompetences } from '../../models/evolution-plan.model';
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
  newCertifFile:     File | null = null;
  newCertifFileName: string      = '';
  showAddTech = false;
  showAddSoft = false;

  constructor(
    private planService:   EvolutionPlanService,
    private careerService: CareerService,
    private snackBar:      MatSnackBar
  ) {}

  ngOnInit(): void {
    this.user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    this.loadData();
  }

  private loadData(): void {
    this.isLoading = true;
    this.careerService.getAll().subscribe({
      next: careers => {
        this.careers = careers;
        const userPoste = this.user?.poste?.toLowerCase()?.trim() || '';
        // ✅ Chercher le Career correspondant au poste de l'employé
        let currentCareer: Career | undefined;
        if (userPoste) {
          currentCareer =
            careers.find((c: Career) =>
              c.title?.toLowerCase().trim() === userPoste
            ) ||
            careers.find((c: Career) =>
              c.title?.toLowerCase().includes(userPoste)
            ) ||
            careers.find((c: Career) =>
              userPoste.includes(c.title?.toLowerCase() ?? '')
            );
        }
        this.planService.getMyPlan().subscribe({
          next: plans => {
            if (plans && plans.length > 0) {
              const raw = plans[0];
              this.plan = {
                ...raw,
                competencesActuelles: parseCompetences(raw),
                currentCareerId:    currentCareer?.id    ?? raw.currentCareerId    ?? '',
                currentCareerTitle: currentCareer?.title ?? this.user?.poste ?? raw.currentCareerTitle ?? 'Poste non défini'
              };
              // ✅ Enrichir le titre du poste cible si manquant
              if (this.plan.targetCareerId && !this.plan.targetCareerTitle) {
                const target = careers.find(c => c.id === this.plan.targetCareerId);
                if (target) this.plan.targetCareerTitle = target.title;
              }
            } else {
              // Pas encore de plan — créer un plan vide avec le poste de l'employé
              this.plan = {
                employeeId:           this.user.id ?? '',
                targetCareerId:       '',
                status:               EvolutionPlanStatus.DRAFT,
                competencesActuelles: [],
                certifications:       [],
                currentCareerId:      currentCareer?.id ?? '',
                currentCareerTitle:   currentCareer?.title ?? this.user?.poste ?? 'Poste non défini'
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
              currentCareerTitle:   currentCareer?.title ?? this.user?.poste ?? 'Poste non défini'
            };
            this.isLoading = false;
          }
        });
      },
      error: () => { this.isLoading = false; }
    });
  }

  // ── Getters ───────────────────────────────────────────────────────────
  get certifsTech(): EmployeeCertification[] {
    return (this.plan?.certifications ?? [])
      .filter(c => c.type === CertificationType.TECHNIQUE);
  }

  get certifsSoft(): EmployeeCertification[] {
    return (this.plan?.certifications ?? [])
      .filter(c => c.type === CertificationType.SOFT_SKILL);
  }

  get posteActuel(): string {
    return this.plan?.currentCareerTitle
        || this.user?.poste
        || 'Non défini';
  }

  // ── Poste ─────────────────────────────────────────────────────────────
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

  // ── Compétences ───────────────────────────────────────────────────────
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
    if (!this.plan.competencesActuelles?.length) {
      this.snack('Ajoutez au moins une compétence', true);
      return;
    }
    if (!this.plan.id) {
      this.save('Compétences enregistrées');
      return;
    }
    this.planService.saveCompetences(this.plan.id, this.plan.competencesActuelles)
      .subscribe({
        next: p => {
          const parsed = parseCompetences(p);
          this.plan = {
            ...p,
            competencesActuelles: parsed,
            currentCareerTitle:   this.posteActuel,
            currentCareerId:      this.plan.currentCareerId
          };
          this.snack('Compétences enregistrées (' + parsed.length + ')');
        },
        error: () => this.snack('Erreur sauvegarde', true)
      });
  }

  // ── Certifications ────────────────────────────────────────────────────
  saveCertif(c: EmployeeCertification): void {
    if (!this.plan.id) { this.save('Plan enregistré'); return; }
    const obs = c.id
      ? this.planService.updateCertification(this.plan.id, c.id, c)
      : this.planService.addCertification(this.plan.id, c);
    obs.subscribe({
      next: p => {
        this.plan = {
          ...p,
          competencesActuelles: parseCompetences(p),
          currentCareerTitle:   this.posteActuel
        };
        this.snack('Certif enregistrée');
      },
      error: () => this.snack('Erreur', true)
    });
  }

  uploadCertifFile(event: Event, certif: EmployeeCertification): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !this.plan.id || !certif.id) return;
    this.planService.uploadCertifFile(this.plan.id, certif.id, file).subscribe({
      next: (res: any) => {
        certif.fichierNom = res.fileName ?? certif.fichierNom;
        certif.fichierUrl = res.fileUrl  ?? certif.fichierUrl;
        this.snack('Fichier uploadé');
      },
      error: () => this.snack('Erreur upload', true)
    });
  }

  onNewCertifFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.newCertifFile     = file;
    this.newCertifFileName = file.name;
  }

  clearNewCertifFile(): void {
    this.newCertifFile     = null;
    this.newCertifFileName = '';
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
      dateObtention: this.newCertif.dateObtention,
      fichierNom:    this.newCertifFileName || undefined
    };
    if (this.plan.id) {
      this.planService.addCertification(this.plan.id, certif).subscribe({
        next: p => {
          this.plan = {
            ...p,
            competencesActuelles: parseCompetences(p),
            currentCareerTitle:   this.posteActuel
          };
          if (this.newCertifFile) {
            const created = p.certifications[p.certifications.length - 1];
            if (created?.id) {
              this.planService.uploadCertifFile(this.plan.id!, created.id, this.newCertifFile)
                .subscribe({
                  next:  () => this.snack('Certif ajoutée avec fichier ✓'),
                  error: () => this.snack('Certif ajoutée — erreur upload', true)
                });
            }
          } else {
            this.snack('Certif ajoutée ✓');
          }
          this.resetNewCertifForm();
        },
        error: () => this.snack('Erreur', true)
      });
    } else {
      this.plan.certifications.push(certif);
      this.save('Plan enregistré avec la certif');
      this.resetNewCertifForm();
    }
  }

  private resetNewCertifForm(): void {
    this.newCertif         = { statut: CertificationStatus.NON_COMMENCE };
    this.newCertifFile     = null;
    this.newCertifFileName = '';
    this.showAddTech       = false;
    this.showAddSoft       = false;
  }

  // ── Sauvegarde globale ────────────────────────────────────────────────
  private save(msg: string): void {
    const obs = this.plan.id
      ? this.planService.update(this.plan.id, this.plan)
      : this.planService.create(this.plan);
    obs.subscribe({
      next: p => {
        this.plan = {
          ...p,
          competencesActuelles: parseCompetences(p),
          currentCareerTitle:   this.posteActuel,
          currentCareerId:      this.plan.currentCareerId
        };
        this.snack(msg);
      },
      error: () => this.snack('Erreur sauvegarde', true)
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  statusLabel(s: any): string {
    return ({
      NON_COMMENCE: 'Non commencé',
      EN_COURS:     'En cours',
      OBTENU:       'Obtenu'
    } as any)[s] ?? s;
  }

  private snack(msg: string, isError = false): void {
    this.snackBar.open(msg, 'OK', {
      duration:   3000,
      panelClass: isError ? ['snack-error'] : []
    });
  }
}