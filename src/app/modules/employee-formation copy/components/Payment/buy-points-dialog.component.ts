import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface BuyPointsDialogData {
  points: number;
  amount: number;
}

@Component({
  selector: 'app-buy-points-dialog',
  template: `
    <div class="buy-points-dialog">
      <div class="dialog-header">
        <h2>💰 Acheter des points</h2>
        <button class="close-btn" (click)="onCancel()">✕</button>
      </div>
      
      <div class="dialog-body">
        <p class="subtitle">Choisissez votre pack de points</p>
        
        <div class="points-packs">
          <div class="pack" (click)="selectPack(500, 5)">
            <div class="pack-points">⭐ 500 points</div>
            <div class="pack-price">17 DT</div>
            <div class="pack-badge">POPULAIRE</div>
          </div>
          
          <div class="pack recommended" (click)="selectPack(1000, 9)">
            <div class="pack-points">⭐ 1000 points</div>
            <div class="pack-price">34 DT</div>
            <div class="pack-badge">RECOMMANDÉ</div>
          </div>
          
          <div class="pack" (click)="selectPack(2000, 16)">
            <div class="pack-points">⭐ 2000 points</div>
            <div class="pack-price">67 DT</div>
            <div class="pack-badge">ÉCONOMIQUE</div>
          </div>
          
          <div class="pack" (click)="selectPack(5000, 39)">
            <div class="pack-points">⭐ 5000 points</div>
            <div class="pack-price">100 DT</div>
            <div class="pack-badge">BEST VALUE</div>
          </div>
        </div>
        
        <div class="custom-pack">
          <label>Ou entrez un montant personnalisé :</label>
          <div class="custom-input">
            <input 
              type="number" 
              [(ngModel)]="customPoints" 
              placeholder="Points souhaités"
              (input)="onCustomPointsChange()">
            <span class="estimated-price">≈ {{ estimatedPrice }} DT</span>
          </div>
          <button class="custom-btn" (click)="buyCustom()" [disabled]="!customPoints || customPoints < 100">
            Acheter {{ customPoints }} points
          </button>
        </div>
      </div>
      
      <div class="dialog-footer">
        <button class="cancel-btn" (click)="onCancel()">Annuler</button>
      </div>
    </div>
  `,
  styles: [`
    .buy-points-dialog {
      background: white;
      border-radius: 24px;
      width: 100%;
      max-width: 100%;
      overflow: hidden;
    }
    
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .dialog-header h2 {
      margin: 0;
      font-size: 22px;
      font-weight: 600;
    }
    
    .close-btn {
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .close-btn:hover {
      background: rgba(255,255,255,0.3);
    }
    
    .dialog-body {
      padding: 24px;
    }
    
    .subtitle {
      text-align: center;
      color: #64748b;
      margin-bottom: 20px;
      font-size: 14px;
    }
    
    .points-packs {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .pack {
      background: #f8fafc;
      border: 2px solid #e2e8f0;
      border-radius: 16px;
      padding: 16px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
    }
    
    .pack:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.1);
    }
    
    .pack.recommended {
      border-color: #f59e0b;
      background: linear-gradient(135deg, #fff7ed, #fffbeb);
    }
    
    .pack-points {
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 8px;
    }
    
    .pack-price {
      font-size: 24px;
      font-weight: 800;
      color: #3b82f6;
    }
    
    .pack-badge {
      position: absolute;
      top: -10px;
      right: 10px;
      background: #10b981;
      color: white;
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 20px;
      font-weight: 600;
    }
    
    .pack.recommended .pack-badge {
      background: #f59e0b;
    }
    
    .custom-pack {
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
      margin-top: 10px;
    }
    
    .custom-pack label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      margin-bottom: 10px;
    }
    
    .custom-input {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-bottom: 12px;
    }
    
    .custom-input input {
      flex: 1;
      padding: 10px 14px;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      font-size: 14px;
    }
    
    .custom-input input:focus {
      outline: none;
      border-color: #667eea;
    }
    
    .estimated-price {
      font-size: 14px;
      font-weight: 600;
      color: #10b981;
    }
    
    .custom-btn {
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: white;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    
    .custom-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .dialog-footer {
      padding: 16px 24px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
    }
    
    .cancel-btn {
      padding: 10px 20px;
      background: #f1f5f9;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-weight: 500;
    }
    
    .cancel-btn:hover {
      background: #e2e8f0;
    }
  `]
})
export class BuyPointsDialogComponent {
  customPoints: number = 0;
  estimatedPrice: number = 0;

  constructor(
    public dialogRef: MatDialogRef<BuyPointsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  selectPack(points: number, amount: number) {
    this.dialogRef.close({ points, amount });
  }

  onCustomPointsChange() {
    // 100 points = 1€
    this.estimatedPrice = Math.ceil(this.customPoints / 30);
  }

  buyCustom() {
    if (this.customPoints >= 100) {
      this.dialogRef.close({ 
        points: this.customPoints, 
        amount: this.estimatedPrice 
      });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}