// services/exam-monitoring.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, of } from 'rxjs';  // ✅ AJOUTER of
import { timeout, catchError } from 'rxjs/operators';  // ✅ AJOUTER ces imports
import { FraudEvent, FraudResponse, BlockedStatus } from '../../../shared/models/fraudFormation.models';

@Injectable({ providedIn: 'root' })
export class ExamMonitoringService implements OnDestroy {
  private apiUrl = 'http://localhost:8081/api/fraud';
  private events: FraudEvent[] = [];
  
  private fraudAlertSubject = new Subject<FraudEvent>();
  private warningCountSubject = new Subject<number>();
  private blockedSubject = new Subject<boolean>();
  private remainingAttemptsSubject = new Subject<number>();
  
  private examenId: string = '';
  private employeId: string = '';
  private employeNom: string = '';
  private employePrenom: string = '';
  private employeEmail: string = '';
  private isActive: boolean = false;

  constructor(private http: HttpClient) {}

  startMonitoring(examenId: string, employe: { id: string; nom: string; prenom: string; email: string }) {
    // ✅ NETTOYER LES VALEURS
    this.examenId = examenId?.trim() || '';
    this.employeId = employe.id?.trim() || '';
    this.employeNom = employe.nom?.trim() || 'Employé';
    this.employePrenom = employe.prenom?.trim() || '';
    this.employeEmail = employe.email?.trim() || '';
    this.isActive = true;

    console.log('🚀 startMonitoring appelé avec:', { 
      examenId: this.examenId, 
      employeId: this.employeId,
      nom: this.employeNom
    });

    // ✅ Vérifier que les IDs sont valides AVANT de faire l'appel
    if (!this.examenId || !this.employeId) {
      console.error('❌ IDs invalides, surveillance non démarrée');
      this.isActive = false;
      return;
    }

    // Vérifier si déjà bloqué avant de commencer
    this.checkBlockedStatus().subscribe(status => {
      console.log('📊 Statut blocage initial:', status);
      if (status.blocked) {
        this.blockedSubject.next(true);
        this.isActive = false;
      }
    });

    // Écouteurs d'événements
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('blur', this.onWindowBlur);
    window.addEventListener('focus', this.onWindowFocus);
    window.addEventListener('beforeunload', this.onBeforeUnload);

    console.log('🔍 Surveillance anti-fraude démarrée pour:', this.employePrenom, this.employeNom);
  }

  private onVisibilityChange = () => {
    if (!this.isActive) return;
    
    if (document.visibilityState === 'hidden') {
      this.logEvent(
        'VISIBILITY_HIDDEN',
        '⚠️ Vous avez quitté la page examen (nouvel onglet ou fenêtre)'
      );
    } else {
      console.log('✅ Retour sur la page examen');
    }
  };

  private onWindowBlur = () => {
    if (!this.isActive) return;
    
    this.logEvent(
      'WINDOW_BLUR',
      '⚠️ Vous avez quitté la fenêtre examen (Alt+Tab ou nouvelle fenêtre)'
    );
  };

  private onWindowFocus = () => {
    if (!this.isActive) return;
    console.log('✅ Focus revenu sur la fenêtre examen');
  };

  private onBeforeUnload = (event: BeforeUnloadEvent) => {
    if (!this.isActive) return;
    
    const fraudEvent: FraudEvent = {
      examenId: this.examenId,
      employeId: this.employeId,
      employeNom: this.employeNom,
      employePrenom: this.employePrenom,
      employeEmail: this.employeEmail,
      eventType: 'FOCUS_LOST',
      timestamp: Date.now(),
      description: '🚪 Fermeture ou rechargement de la page examen'
    };
    
    // Envoi synchrone avant fermeture
    navigator.sendBeacon(`${this.apiUrl}/event`, JSON.stringify(fraudEvent));
  };

  private logEvent(eventType: FraudEvent['eventType'], description: string) {
    const event: FraudEvent = {
      examenId: this.examenId,
      employeId: this.employeId,
      employeNom: this.employeNom,
      employePrenom: this.employePrenom,
      employeEmail: this.employeEmail,
      eventType: eventType,
      timestamp: Date.now(),
      description: description
    };

    console.log(`📝 Log événement: ${eventType}`, event);

    this.events.push(event);
    this.fraudAlertSubject.next(event);
    
    this.sendToBackend(event).subscribe({
      next: (response) => {
        console.log(`📡 Violation ${response.totalViolations}/3 - ${response.message}`);
        this.warningCountSubject.next(response.totalViolations);
        this.remainingAttemptsSubject.next(response.remainingAttempts);
        
        if (response.blocked) {
          this.blockedSubject.next(true);
          this.isActive = false;
          alert('❌ Votre examen a été bloqué ! Vous avez quitté la page trop de fois.');
        }
      },
      error: (err) => console.error('Erreur envoi événement:', err)
    });
  }

  private sendToBackend(event: FraudEvent) {
    return this.http.post<FraudResponse>(`${this.apiUrl}/event`, event);
  }

  checkBlockedStatus() {
    // ✅ CRITIQUE : Vérifier que les IDs existent AVANT l'appel
    if (!this.examenId || !this.employeId || this.examenId === '' || this.employeId === '') {
        console.warn('⚠️ IDs manquants pour checkBlockedStatus', {
            examenId: this.examenId,
            employeId: this.employeId
        });
        // Retourner un observable par défaut sans faire d'appel HTTP
        return of({ 
            blocked: false, 
            violationCount: 0, 
            maxViolations: 3, 
            remainingAttempts: 3 
        });
    }
    
    const url = `${this.apiUrl}/blocked/${this.examenId}/${this.employeId}`;
    console.log('🔍 Vérification blocage - URL:', url);
    
    return this.http.get<BlockedStatus>(url).pipe(
        timeout(10000),
        catchError(error => {
            console.error('Erreur checkBlockedStatus:', error);
            return of({ blocked: false, violationCount: 0, maxViolations: 3, remainingAttempts: 3 });
        })
    );
  }

  getFraudAlerts() {
    return this.fraudAlertSubject.asObservable();
  }

  getWarningCount() {
    return this.warningCountSubject.asObservable();
  }

  getBlockedStatus() {
    return this.blockedSubject.asObservable();
  }

  getRemainingAttempts() {
    return this.remainingAttemptsSubject.asObservable();
  }

  getViolationCount() {
    return this.events.length;
  }

  stopMonitoring() {
    this.isActive = false;
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('blur', this.onWindowBlur);
    window.removeEventListener('focus', this.onWindowFocus);
    window.removeEventListener('beforeunload', this.onBeforeUnload);
    console.log('🛑 Surveillance anti-fraude arrêtée');
  }

  ngOnDestroy() {
    this.stopMonitoring();
  }
}