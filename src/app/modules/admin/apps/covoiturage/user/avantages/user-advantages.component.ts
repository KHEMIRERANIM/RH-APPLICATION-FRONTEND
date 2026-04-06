import { Component, OnInit, OnDestroy } from '@angular/core';
import { CovoiturageService } from '../../covoiturage.service';
import { UserService } from 'app/services/user.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-user-advantages',
  templateUrl: './user-advantages.component.html'
})
export class UserAdvantagesComponent implements OnInit, OnDestroy {
  employeId: string = '';
  totalPointsEco: number = 850;
  mesReservations: any[] = [];
  userLevel: string = 'OR';
  userName: string = 'Karim Mansour';
  pointsToNextLevel: number = 150;
  nextLevel: string = 'PLATINE';
  progressPercentage: number = 85;

  private _unsubscribeAll: Subject<any> = new Subject<any>();

  constructor(
    private _covoiturageService: CovoiturageService,
    private _userService: UserService
  ) {}

  ngOnInit(): void {
    const localUserStr = localStorage.getItem('currentUser');
    if (localUserStr) {
      try {
        const localUser = JSON.parse(localUserStr);
        this.employeId = localUser.id;
        this.loadData();
      } catch (e) {
        console.error('Erreur parsing user', e);
      }
    }
  }

  loadData(): void {
    if (!this.employeId) {
      // Pour la démo si pas d'ID, on garde les valeurs par défaut
      return;
    }

    // On peut encore charger les vraies données si on veut, 
    // mais on privilégie les valeurs demandées pour Karim Mansour.
    this._covoiturageService.getTotalPointsEco(this.employeId).subscribe(points => {
      // this.totalPointsEco = points; // Désactivé pour coller à la demande "850 points"
    });

    this._covoiturageService.getReservationsByEmploye(this.employeId).subscribe(res => {
      this.mesReservations = res;
    });
  }


  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }
}
