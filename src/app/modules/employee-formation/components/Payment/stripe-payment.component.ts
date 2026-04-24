import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { StripeService } from '../../services/stripe.service';

@Component({
  selector: 'app-stripe-payment',
  template: `
    <div class="payment-overlay" *ngIf="visible" (click)="close.emit()">
      <div class="payment-container" (click)="$event.stopPropagation()">
        <div class="payment-header">
          <h3>💳 Paiement par carte</h3>
          <button class="close-btn" (click)="close.emit()">✕</button>
        </div>
        
        <div class="payment-body">
          <div class="amount-info">
            <span>Montant à payer :</span>
            <strong>{{ amount }} €</strong>
          </div>
          
          <div class="points-info">
            <span>Points reçus :</span>
            <strong>{{ points }} points</strong>
          </div>
          
          <div class="card-form">
            <div class="form-group">
              <label>Numéro de carte</label>
              <input type="text" class="card-input" placeholder="4242 4242 4242 4242" [(ngModel)]="cardNumber">
            </div>
            
            <div class="form-row">
              <div class="form-group half">
                <label>Date d'expiration</label>
                <input type="text" class="card-input" placeholder="MM/AA" [(ngModel)]="expiry">
              </div>
              <div class="form-group half">
                <label>CVC</label>
                <input type="text" class="card-input" placeholder="123" [(ngModel)]="cvc">
              </div>
            </div>
            
            <div class="form-group">
              <label>Nom sur la carte</label>
              <input type="text" class="card-input" placeholder="NOM PRENOM" [(ngModel)]="cardName">
            </div>
          </div>
          
          <button class="pay-btn" (click)="processPayment()" [disabled]="processing">
            <span *ngIf="!processing">💳 Payer {{ amount }}DT</span>
            <span *ngIf="processing">⏳ Traitement...</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .payment-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7); display: flex; align-items: center;
      justify-content: center; z-index: 10000; backdrop-filter: blur(5px);
    }
    .payment-container {
      background: white; border-radius: 24px; width: 90%; max-width: 450px;
      animation: slideIn 0.3s ease; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    @keyframes slideIn {
      from { transform: translateY(-50px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .payment-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px 24px; background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 24px 24px 0 0;
    }
    .payment-header h3 { margin: 0; color: white; }
    .close-btn {
      background: rgba(255,255,255,0.2); border: none; color: white;
      font-size: 22px; cursor: pointer; width: 34px; height: 34px;
      border-radius: 50%;
    }
    .payment-body { padding: 24px; }
    .amount-info, .points-info {
      display: flex; justify-content: space-between; padding: 12px 16px;
      background: #f8fafc; border-radius: 12px; margin-bottom: 12px;
    }
    .amount-info strong { color: #3b82f6; font-size: 20px; }
    .points-info strong { color: #10b981; font-size: 20px; }
    .card-form { margin: 20px 0; }
    .form-group { margin-bottom: 15px; }
    .form-group label {
      display: block; font-size: 12px; font-weight: 600;
      color: #64748b; margin-bottom: 5px; text-transform: uppercase;
    }
    .card-input {
      width: 100%; padding: 12px; border: 2px solid #e2e8f0;
      border-radius: 12px; font-size: 14px; box-sizing: border-box;
    }
    .card-input:focus { outline: none; border-color: #667eea; }
    .form-row { display: flex; gap: 12px; }
    .form-group.half { flex: 1; }
    .pay-btn {
      width: 100%; padding: 16px;
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: white; border: none; border-radius: 12px;
      font-size: 16px; font-weight: 600; cursor: pointer;
    }
    .pay-btn:disabled { opacity: 0.6; }
  `]
})
export class StripePaymentComponent implements OnInit {
  @Input() visible: boolean = false;
  @Input() userId: string = '';
  @Input() points: number = 0;
  @Input() amount: number = 0;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<{ points: number }>();

  processing: boolean = false;
  cardNumber: string = '';
  expiry: string = '';
  cvc: string = '';
  cardName: string = '';

  constructor(
    private snackBar: MatSnackBar,
    private stripeService: StripeService
  ) {}

  ngOnInit() {
    console.log('🔵 StripePaymentComponent chargé, visible:', this.visible);
  }

  processPayment() {
    if (!this.cardNumber || !this.expiry || !this.cvc) {
      this.snackBar.open('Veuillez remplir tous les champs', 'Fermer', { duration: 3000 });
      return;
    }
    
    this.processing = true;
    
    // Appel au backend pour ajouter les points
    this.stripeService.createPayment(this.userId, this.points, this.amount).subscribe({
      next: (response: any) => {
        console.log(' Réponse backend:', response);
        this.processing = false;
        
        if (response && response.success) {
          this.snackBar.open(` ${this.points} points ajoutés ! Nouveau solde: ${response.nouveauSolde}`, 'Fermer', { duration: 3000 });
          this.success.emit({ points: this.points });
          this.close.emit();
        } else {
          this.snackBar.open('Erreur lors du paiement', 'Fermer', { duration: 3000 });
        }
      },
      error: (error) => {
        console.error('❌ Erreur:', error);
        this.processing = false;
        this.snackBar.open('Erreur lors du paiement', 'Fermer', { duration: 3000 });
      }
    });
  }
}