import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-charte',
  templateUrl: './charte.component.html',
})

export class CharteComponent implements OnInit, AfterViewInit {

  @ViewChild('signatureCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  candidatureId: string = '';
  loading = true;
  dejaSignee = false;
  submitted = false;
  signing = false;
  errorMsg = '';

  today: Date = new Date();   // ✅ AJOUT IMPORTANT

  form!: FormGroup;
  isDrawing = false;
  hasSignature = false;

  private ctx!: CanvasRenderingContext2D;

  private api = `${window.location.protocol}//${window.location.hostname}:8081/api/recrutement/charte`;

  etapesCharte = [

    {
      titre: '1. Respect des horaires',
      texte: 'Le salarié s\'engage à respecter les horaires définis dans son contrat de travail.'
    },

    {
      titre: '2. Confidentialité',
      texte: 'Toute information relative à l\'entreprise, ses clients et ses projets est strictement confidentielle.'
    },

    {
      titre: '3. Code vestimentaire',
      texte: 'Une tenue professionnelle et soignée est requise dans les locaux de l\'entreprise.'
    },

    {
      titre: '4. Utilisation des ressources',
      texte: 'Les ressources informatiques et matérielles de l\'entreprise sont réservées à un usage professionnel.'
    },

    {
      titre: '5. Respect mutuel',
      texte: 'Tout comportement irrespectueux envers les collègues, clients ou partenaires est strictement interdit.'
    },

    {
      titre: '6. Politique de sécurité',
      texte: 'Le salarié s\'engage à respecter les règles de sécurité informatique et physique de l\'entreprise.'
    },

  ];

  constructor(

    private route: ActivatedRoute,

    private router: Router,

    private http: HttpClient,

    private fb: FormBuilder,

  ) {}

  ngOnInit(): void {

    let currentRoute = this.route.snapshot;
    while (currentRoute && !currentRoute.paramMap.has('candidatureId')) {
      currentRoute = currentRoute.parent as any;
    }
    this.candidatureId = currentRoute?.paramMap.get('candidatureId') || '';

    this.form = this.fb.group({

      nomComplet: ['', Validators.required],

      email: ['', [
        Validators.required,
        Validators.email
      ]],

      accepteCharte: [false, Validators.requiredTrue],

      accepteReglement: [false, Validators.requiredTrue],

    });

    // Vérifie si déjà signé

    this.http.get<any>(
      `${this.api}/${this.candidatureId}/status`
    ).subscribe({

      next: (res) => {

        this.dejaSignee = res.signee;

        this.loading = false;

      },

      error: () => this.loading = false,

    });

  }

  ngAfterViewInit(): void {

    setTimeout(() => this.initCanvas(), 500);

  }

  initCanvas(): void {

    if (!this.canvasRef) return;

    const canvas = this.canvasRef.nativeElement;

    canvas.width =
      canvas.offsetWidth || 400;

    canvas.height = 150;

    this.ctx =
      canvas.getContext('2d')!;

    this.ctx.strokeStyle = '#1e293b';

    this.ctx.lineWidth = 2;

    this.ctx.lineCap = 'round';

  }

  startDrawing(
    event: MouseEvent | TouchEvent
  ): void {

    this.isDrawing = true;

    const pos = this.getPos(event);

    this.ctx.beginPath();

    this.ctx.moveTo(pos.x, pos.y);

  }

  draw(
    event: MouseEvent | TouchEvent
  ): void {

    if (!this.isDrawing) return;

    event.preventDefault();

    const pos = this.getPos(event);

    this.ctx.lineTo(pos.x, pos.y);

    this.ctx.stroke();

    this.hasSignature = true;

  }

  stopDrawing(): void {

    this.isDrawing = false;

  }

  effacerSignature(): void {

    const canvas =
      this.canvasRef.nativeElement;

    this.ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    this.hasSignature = false;

  }

  private getPos(
    event: MouseEvent | TouchEvent
  ): { x: number; y: number } {

    const canvas =
      this.canvasRef.nativeElement;

    const rect =
      canvas.getBoundingClientRect();

    if (event instanceof TouchEvent) {

      return {

        x:
          event.touches[0].clientX
          - rect.left,

        y:
          event.touches[0].clientY
          - rect.top,

      };

    }

    return {

      x:
        (event as MouseEvent).clientX
        - rect.left,

      y:
        (event as MouseEvent).clientY
        - rect.top,

    };

  }

  submit(): void {

    if (
      this.form.invalid ||
      !this.hasSignature
    ) return;

    this.signing = true;

    const canvas =
      this.canvasRef.nativeElement;

    const signatureBase64 =
      canvas.toDataURL('image/png');

    const body = {

      ...this.form.value,

      signatureBase64,

      candidatureId:
        this.candidatureId,

    };

    this.http.post(

      `${this.api}/${this.candidatureId}/signer`,

      body

    ).subscribe({

      next: () => {

        this.signing = false;

        this.submitted = true;

      },

      error: (err) => {

        this.signing = false;

        this.errorMsg =
          err?.status === 400

            ? 'Cette charte a déjà été signée.'

            : 'Erreur lors de la signature.';

      },

    });

  }

}
