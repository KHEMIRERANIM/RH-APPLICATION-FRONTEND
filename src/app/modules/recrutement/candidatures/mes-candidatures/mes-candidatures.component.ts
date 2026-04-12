import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CandidatureService } from '../../services/candidature.service';
import { OffreService } from '../../services/offre.service';
import { EntretienService } from '../../services/entretien.service';
import { AuthService } from 'app/core/auth/auth.service';
import { Candidature, Offre, Entretien, STATUT_LABELS, STATUT_COLORS, KANBAN_COLUMNS } from '../../models/recrutement.models';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { ElementRef, ViewChild } from '@angular/core';

interface IWindow extends Window { webkitSpeechRecognition: any; }
const { webkitSpeechRecognition }: IWindow = <IWindow><unknown>window;

@Component({
  selector: 'app-mes-candidatures',
  templateUrl: './mes-candidatures.component.html',
})
export class MesCandidaturesComponent implements OnInit {

  candidatures: Candidature[] = [];
  filteredCandidatures: Candidature[] = [];
  offresMap: Record<string, Offre> = {};
  entretiensMap: Record<string, Entretien[]> = {};
  loading = true;

  stats = {
    total: 0,
    enCours: 0,
    acceptes: 0
  };

  activeFilter: string = 'TOUS';

  // Video Test
  showVideoModal = false;
  activeCandidatureForVideo: Candidature | null = null;
  videoStream: MediaStream | null = null;
  isRecording = false;
  uploadingVideo = false;

  recognition: any;
  transcript = '';

  @ViewChild('videoPlayer', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;

  STATUT_LABELS = STATUT_LABELS;
  STATUT_COLORS = STATUT_COLORS;
  KANBAN_COLUMNS = KANBAN_COLUMNS;

  constructor(
    private candidatureService: CandidatureService,
    private offreService: OffreService,
    private entretienService: EntretienService,
    private authService: AuthService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    const user = this.authService.currentUser;
    this.candidatureService.getMesCandidatures(user.id).subscribe({
      next: (data) => {
        this.candidatures = data;
        this.calculateStats();
        this.applyFilter('TOUS');

        // Charger les offres correspondantes
        const offresRequests = data.map(c =>
          this.offreService.getOffreById(c.offreId).pipe(catchError(() => of(null)))
        );
        // Charger les entretiens pour chaque candidature
        const entretiensRequests = data.map(c =>
          this.entretienService.getEntretiensParCandidature(c.id).pipe(catchError(() => of([])))
        );

        forkJoin([forkJoin(offresRequests), forkJoin(entretiensRequests)]).subscribe(([offres, entretiens]) => {
          offres.forEach((o, i) => {
            if (o) this.offresMap[data[i].offreId] = o;
          });
          entretiens.forEach((e, i) => {
            this.entretiensMap[data[i].id] = e;
          });
          this.loading = false;
        });
      },
      error: () => this.loading = false,
    });
  }

  calculateStats(): void {
    this.stats.total = this.candidatures.length;
    this.stats.enCours = this.candidatures.filter(c => !['ACCEPTE', 'REFUSE'].includes(c.statut)).length;
    this.stats.acceptes = this.candidatures.filter(c => c.statut === 'ACCEPTE').length;
  }

  applyFilter(filter: string): void {
    this.activeFilter = filter;
    if (filter === 'TOUS') {
      this.filteredCandidatures = this.candidatures;
    } else if (filter === 'EN_COURS') {
      this.filteredCandidatures = this.candidatures.filter(c => !['ACCEPTE', 'REFUSE'].includes(c.statut));
    } else {
      this.filteredCandidatures = this.candidatures.filter(c => c.statut === filter);
    }
  }

  getProgressStep(statut: string): number {
    return KANBAN_COLUMNS.indexOf(statut as any) + 1;
  }

  voirDetail(candidature: Candidature): void {
    this.router.navigate(['/recrutement/offres', candidature.offreId]);
  }

  supprimerCandidature(candidature: Candidature, event: Event): void {
    event.stopPropagation();
    if (!confirm('Voulez-vous vraiment supprimer cette candidature ?')) {
      return;
    }

    this.candidatureService.deleteCandidature(candidature.id).subscribe(() => {
      this.candidatures = this.candidatures.filter(c => c.id !== candidature.id);
      this.calculateStats();
      this.applyFilter(this.activeFilter);
      delete this.offresMap[candidature.offreId];
      delete this.entretiensMap[candidature.id];
    });
  }

  telechargerEntretien(entretien: Entretien): void {
    const contenu = [
      'Entretien',
      '-------------------------',
      `ID : ${entretien.id}`,
      `Candidature : ${entretien.candidatureId}`,
      `Recruteur : ${entretien.recruteurId}`,
      `Type : ${entretien.type}`,
      `Date / heure : ${new Date(entretien.dateHeure).toLocaleString()}`,
      `Durée : ${entretien.dureeMinutes} minutes`,
      `Lieu : ${entretien.lieu || 'Non spécifié'}`,
      `Lien visio : ${entretien.lienVisio || 'Aucun'}`,
      `Statut : ${entretien.statut}`,
      `Feedback global : ${entretien.feedbackGlobal || 'Aucun'}`,
      `Note globale : ${entretien.noteGlobale ?? 'N/A'}`,
      `Points forts : ${entretien.pointsForts?.join(', ') || 'Aucun'}`,
      `Points faibles : ${entretien.pointsFaibles?.join(', ') || 'Aucun'}`,
      `Recommandation : ${entretien.recommandeEmbauche ? 'Oui' : 'Non'}`,
      `Créé le : ${new Date(entretien.createdAt).toLocaleString()}`,
    ].join('\r\n');

    const blob = new Blob([contenu], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `entretien-${entretien.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // --- WEBCAM VIDEO TEST ---

  telechargerContrat(candidature: Candidature): void {
    if (!candidature) return;
    this.candidatureService.telechargerContratPdf(candidature.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contrat_${candidature.candidatId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      },
      error: (err) => console.error("Erreur téléchargement contrat", err)
    });
  }

  async ouvrirTestVideo(c: Candidature) {
    this.activeCandidatureForVideo = c;
    this.showVideoModal = true;
    this.transcript = '';

    // Init Speech Recognition API
    if (webkitSpeechRecognition) {
      this.recognition = new webkitSpeechRecognition();
      this.recognition.lang = 'en-US'; // English validation
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            this.transcript += event.results[i][0].transcript + " ";
          }
        }
      };
    }

    try {
      this.videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setTimeout(() => {
        if (this.videoElement?.nativeElement) {
          this.videoElement.nativeElement.srcObject = this.videoStream;
        }
      }, 300);
    } catch (err) {
      alert("Impossible d'accéder à la caméra. Vérifiez vos permissions.");
      this.fermerVideo();
    }
  }

  startRecording() {
    this.isRecording = true;
    this.transcript = '';
    if (this.recognition) {
      this.recognition.start();
    }
  }

  submitVideo() {
    if (!this.activeCandidatureForVideo) return;
    this.isRecording = false;
    this.uploadingVideo = true;

    if (this.recognition) {
      this.recognition.stop();
    }

    // Call Python NLP API, then Spring Boot
    this.candidatureService.analyzeSpeechPython(this.transcript).pipe(
      switchMap(pythonData => {
        console.log("Résultat Machine Learning (Python):", pythonData);
        // On renvoie le vrai score ML à SpringBoot
        return this.candidatureService.soumettreTestLangue(this.activeCandidatureForVideo!.id, pythonData.score);
      }),
      catchError(err => {
        console.error("Python API Error", err);
        // Fallback minimal si Flask est éteint
        return this.candidatureService.soumettreTestLangue(this.activeCandidatureForVideo!.id, 10.0);
      })
    ).subscribe({
      next: (updatedCandidature) => {
        const idx = this.candidatures.findIndex(x => x.id === updatedCandidature.id);
        if (idx > -1) {
          this.candidatures[idx] = updatedCandidature;
        }
        this.fermerVideo();
      },
      error: () => this.fermerVideo()
    });
  }

  fermerVideo() {
    if (this.recognition) this.recognition.stop();
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }
    this.showVideoModal = false;
    this.isRecording = false;
    this.uploadingVideo = false;
    this.activeCandidatureForVideo = null;
  }
}
