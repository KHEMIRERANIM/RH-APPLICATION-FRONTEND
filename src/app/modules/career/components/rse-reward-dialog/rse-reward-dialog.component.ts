import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-rse-reward-dialog',
  templateUrl: './rse-reward-dialog.component.html',
  styleUrls: ['./rse-reward-dialog.component.scss']
})
export class RseRewardDialogComponent {

  rewards = [
    { icon: '🎓', title: 'Formation Gratuite', desc: 'Accès libre à la formation certifiante de votre choix.' },
    { icon: '🍽️', title: 'Repas Offert', desc: 'Un déjeuner gastronomique offert dans un de nos restaurants partenaires.' },
    { icon: '✈️', title: 'Voyage à -50%', desc: 'Bénéficiez de 50% de réduction sur votre prochain séjour.' },
    { icon: '🎟️', title: 'Abonnement', desc: 'Abonnement transport ou sport à moitié prix pendant 6 mois.' }
  ];

  selectedReward: number | null = null;

  constructor(public dialogRef: MatDialogRef<RseRewardDialogComponent>) {}

  selectReward(index: number) {
    this.selectedReward = index;
  }

  claimReward() {
    this.dialogRef.close(true);
  }

  close() {
    this.dialogRef.close(false);
  }
}
