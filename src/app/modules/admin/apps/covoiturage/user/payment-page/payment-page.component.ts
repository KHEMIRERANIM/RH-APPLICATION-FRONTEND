import { Component, OnInit, ViewEncapsulation, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { PaiementService } from '../../services/paiement.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { loadStripe, Stripe, StripeElements, StripeCardNumberElement, StripeCardExpiryElement, StripeCardCvcElement } from '@stripe/stripe-js';
import { CovoiturageService } from '../../covoiturage.service';
import { UserService } from '../../../../../../services/user.service';

@Component({
  selector: 'app-payment-page',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  templateUrl: './payment-page.component.html',
  encapsulation: ViewEncapsulation.None,
  styles: [`
    app-payment-page {
      display: flex;
      flex-direction: column;
      width: 100%;
      min-height: 100vh;
      font-family: 'Inter', sans-serif;
    }
    .animate-fade-in {
      animation: fadeIn 0.4s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-spin {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    input::placeholder {
      color: #94a3b8;
      opacity: 0.7;
    }
  `]
})
export class PaymentPageComponent implements OnInit {
  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private cardNumberElement: StripeCardNumberElement | null = null;
  private cardExpiryElement: StripeCardExpiryElement | null = null;
  private cardCvcElement: StripeCardCvcElement | null = null;

  private allEmployees: any[] = [];

  stripeError: string | null = null;
  reservation: any;
  trajet: any;
  vehicleImage: string = 'assets/images/checkout/vehicle.png';
  today: Date = new Date();

  // Steps: 'trajet' | 'payment' | 'confirmation'
  currentStep: string = 'trajet';
  currentStepIndex: number = 0;

  // Form fields (Step 2)
  private _email: string = '';
  get email(): string { return this._email; }
  set email(value: string) {
    this._email = value;
    this.checkAutoFill();
  }

  cardNumber: string = '';
  expiry: string = '';
  cvc: string = '';
  cardName: string = '';
  country: string = 'Tunisie';
  postalCode: string = '1000';

  isProcessing: boolean = false;

  constructor(
    private _router: Router,
    private _paiementService: PaiementService,
    private _userService: UserService,
    private _toastrService: ToastrService
  ) {
    // getCurrentNavigation() fonctionne uniquement si le composant est instancié
    // pendant la navigation active. Pour les composants standalone, utiliser
    // history.state comme source principale.
    const navState = this._router.getCurrentNavigation()?.extras?.state;
    const historyState = history.state;

    this.reservation = navState?.['reservation'] ?? historyState?.['reservation'] ?? null;
    this.trajet      = navState?.['trajet']      ?? historyState?.['trajet']      ?? null;
  }

  async ngOnInit(): Promise<void> {
    if (!this.reservation) {
      this._toastrService.error('Informations de réservation manquantes');
      this._router.navigate(['/apps/covoiturage/user/dashboard']);
      return;
    }
    
    // Initial data from reservation
    this.email = this.reservation.email || this.reservation.emailPassager || '';
    this.cardName = this.reservation.name || this.reservation.passagerNom || '';

    // Load employees for pre-fill
    this._userService.getAllEmployees().subscribe({
      next: (res) => {
        this.allEmployees = res || [];
        if (this.email) {
          this.autoFillUserData(this.email);
        }
      }
    });

    // Initialize Stripe (optional here since we use raw card API, but kept for future use)
    try {
      this.stripe = await loadStripe('pk_test_51TKnJOJ6WU6KB9t0mTaynzPFgt2Nysr6hJX9UWdQUuuZaVXQxMRShHAtry5Qry9iSCUMuJE6ImXlbwT93V8viQI1003MfP2kI8');
    } catch(e) {}
  }

  autoFillUserData(email: string): void {
    if (!email) return;
    
    const user = this.allEmployees.find(u => 
      String(u.email).toLowerCase().trim() === email.toLowerCase().trim()
    );

    if (user) {
      this.cardName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      
      // AUTO-FILL CARD DATA FOR DEMO
      if (email === 'janvierranim@gmail.com') {
        this.cardNumber = '4242 4242 4242 4242';
        this.expiry = '12/26';
        this.cvc = '123';
        this._toastrService.success(`Bienvenue Ranim, vos coordonnées bancaires ont été pré-remplies.`);
      } else {
        this._toastrService.info(`Bienvenue ${this.cardName}, vos informations ont été pré-remplies.`);
      }
    }
  }

  checkAutoFill(): void { }

  ngAfterViewInit(): void { }

  nextStep(): void {
    if (this.currentStep === 'trajet') {
      this.currentStep = 'payment';
      this.currentStepIndex = 1;
    } else if (this.currentStep === 'payment') {
      this.handlePayment();
    }
  }

  prevStep(): void {
    if (this.currentStep === 'payment') {
      this.currentStep = 'trajet';
      this.currentStepIndex = 0;
    }
  }

  async handlePayment(): Promise<void> {
    if (!this.email || !this.cardNumber || !this.expiry || !this.cvc) {
      this._toastrService.warning('Veuillez remplir tous les champs de paiement');
      return;
    }

    this.isProcessing = true;

    let stripeTokenId = '';

    // LOGIQUE DE DÉMO : Utilisation de tokens de test Stripe
    // Pour éviter les blocages de sécurité sur les numéros bruts
    if (this.cardNumber.replace(/\s/g, '').startsWith('4242')) {
      stripeTokenId = 'tok_visa'; // Token de test universel Stripe (toujours succès)
    } else {
      // Pour les autres cartes, on essaierait Normally de tokeniser, 
      // mais pour la démo, on utilise un token de test pour garantir le succès
      stripeTokenId = 'tok_visa';
    }

    // 2. Envoyer le Token ID à notre backend
    const paymentData = {
      reservationId: this.reservation.id,
      montant: this.reservation.price || this.trajet.prix,
      stripeToken: stripeTokenId
    };

    this._paiementService.createStripePaymentDirect(paymentData).subscribe({
      next: (response: any) => {
        this.isProcessing = false;
        if (response.status === 'succeeded') {
          this._toastrService.success('Paiement réussi (Simulé via Stripe Test Token) !');
          this.currentStep = 'confirmation';
          this.currentStepIndex = 2;
        } else {
          this._toastrService.error('Échec du paiement: ' + (response.error || 'Erreur inconnue'));
        }
      },
      error: (err) => {
        this.isProcessing = false;
        const errMsg = err.error?.error || err.message || 'Erreur serveur';
        this._toastrService.error('Erreur Paiement', errMsg);
        console.error('Payment API Error:', err);
      }
    });
  }


  formatAddress(address: string | undefined): string {
    if (!address) return 'Non spécifié';
    // On garde seulement les 2 ou 3 premières parties plus significatives (Ex: Bardo, Tunis)
    const parts = address.split(',').map(p => p.trim());
    if (parts.length <= 1) return address;
    
    // On ignore les codes postaux et pays si possible pour l'affichage court
    const filtered = parts.filter(p => !/^\d{4,5}$/.test(p) && p.toLowerCase() !== 'tunisie');
    return filtered.slice(0, 2).join(', ');
  }

  formatCardNumber(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    let matched = value.match(/.{1,4}/g);
    this.cardNumber = matched ? matched.join(' ').slice(0, 19) : value;
  }

  formatExpiry(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      this.expiry = value.slice(0, 2) + ' / ' + value.slice(2, 4);
    } else {
      this.expiry = value;
    }
  }

  formatCvc(event: any): void {
    const value = event.target.value.replace(/\D/g, '').slice(0, 3);
    this.cvc = value;
    event.target.value = value;
  }

  handleConfirm(): void {
    // Return to the main application dashboard (with layout)
    this._router.navigate(['/apps/covoiturage/user/dashboard']);
  }

  goBack(): void {
    if (this.currentStep === 'trajet') {
      // Return to the main application dashboard (with layout)
      this._router.navigate(['/apps/covoiturage/user/dashboard']);
    } else {
      this.prevStep();
    }
  }
}
