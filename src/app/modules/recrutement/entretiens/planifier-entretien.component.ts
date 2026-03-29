import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { EntretienService } from "../services/entretien.service";
import { CandidatureService } from "../services/candidature.service";
import { AuthService } from "app/core/auth/auth.service";
import { Candidature, TypeEntretien } from "../models/recrutement.models";

@Component({
  selector: "app-planifier-entretien",
  templateUrl: "./planifier-entretien.component.html",
})
export class PlanifierEntretienComponent implements OnInit {
  form: FormGroup;
  candidature: Candidature | null = null;
  loading = false;
  submitted = false;
  errorMsg = "";
  typesEntretien: TypeEntretien[] = ["TELEPHONIQUE", "VISIO", "PRESENTIEL"];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private entretienService: EntretienService,
    private candidatureService: CandidatureService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const candidatureId = this.route.snapshot.queryParamMap.get("candidatureId");
    this.form = this.fb.group({
      candidatureId: [candidatureId, Validators.required],
      recruteurId: [this.authService.currentUser?.id, Validators.required],
      type: ["VISIO", Validators.required],
      dateHeure: ["", Validators.required],
      dureeMinutes: [60, [Validators.required, Validators.min(15)]],
      lieu: [""],
      lienVisio: [""],
    });
    if (candidatureId) {
      this.candidatureService.getCandidatureById(candidatureId).subscribe({
        next: (c) => this.candidature = c,
      });
    }
  }

  get showLienVisio(): boolean { return this.form.get("type")?.value === "VISIO"; }
  get showLieu(): boolean { return this.form.get("type")?.value === "PRESENTIEL"; }

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.entretienService.planifierEntretien(this.form.value).subscribe({
      next: () => { this.submitted = true; this.loading = false; },
      error: (e) => { this.loading = false; this.errorMsg = e?.error || "Erreur"; },
    });
  }

  retour(): void {
    if (this.candidature) {
      this.router.navigate(["/recrutement/admin/pipeline", this.candidature.offreId]);
    } else {
      this.router.navigate(["/recrutement/admin/offres"]);
    }
  }
}
