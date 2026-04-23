import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { 
    DemandeConge, 
    DemandeCongeRequest, 
    ValidationCongeRequest,
    SoldeConge,
    BulletinSalaire,
    BulletinSalaireRequest,
    User,
    AlerteTendance,
    AdminStats,
    PredictionResponse,
    RecommandationEmployeResponse,
    Role
} from './academy.types';

@Injectable({
    providedIn: 'root'
})
export class AcademyService
{
    private apiUrl = 'http://localhost:8081/api';

    // Subjects
    private _demandes: BehaviorSubject<DemandeConge[]> = new BehaviorSubject<DemandeConge[]>([]);
    private _demandesEnAttente: BehaviorSubject<DemandeConge[]> = new BehaviorSubject<DemandeConge[]>([]);
    private _bulletins: BehaviorSubject<BulletinSalaire[]> = new BehaviorSubject<BulletinSalaire[]>([]);
    private _employes: BehaviorSubject<User[]> = new BehaviorSubject<User[]>([]);
    private _alertes: BehaviorSubject<AlerteTendance[]> = new BehaviorSubject<AlerteTendance[]>([]);
    private _stats: BehaviorSubject<AdminStats | null> = new BehaviorSubject<AdminStats | null>(null);

    constructor(private _httpClient: HttpClient)
    {
    }

    // Accessors
    get demandes$(): Observable<DemandeConge[]> {
        return this._demandes.asObservable();
    }

    get demandesEnAttente$(): Observable<DemandeConge[]> {
        return this._demandesEnAttente.asObservable();
    }

    get bulletins$(): Observable<BulletinSalaire[]> {
        return this._bulletins.asObservable();
    }

    get employes$(): Observable<User[]> {
        return this._employes.asObservable();
    }

    get alertes$(): Observable<AlerteTendance[]> {
        return this._alertes.asObservable();
    }

    get stats$(): Observable<AdminStats | null> {
        return this._stats.asObservable();
    }

    // Congé - Méthodes ADMIN
    getAllDemandes(): Observable<DemandeConge[]> {
        return this._httpClient.get<DemandeConge[]>(`${this.apiUrl}/conges`).pipe(
            map(demandes => {
                this._demandes.next(demandes || []);
                return demandes || [];
            }),
            catchError(error => {
                console.error('Erreur chargement demandes:', error);
                this._demandes.next([]);
                return of([]);
            })
        );
    }

    getDemandesEnAttente(managerId?: string): Observable<DemandeConge[]> {
        const url = managerId 
            ? `${this.apiUrl}/conges/manager/${managerId}/en-attente`
            : `${this.apiUrl}/conges/en-attente`;
        return this._httpClient.get<DemandeConge[]>(url).pipe(
            map(demandes => {
                this._demandesEnAttente.next(demandes || []);
                return demandes || [];
            }),
            catchError(error => {
                console.error('Erreur chargement demandes en attente:', error);
                this._demandesEnAttente.next([]);
                return of([]);
            })
        );
    }

    validerDemande(id: string, validation: ValidationCongeRequest): Observable<DemandeConge> {
        return this._httpClient.patch<DemandeConge>(`${this.apiUrl}/conges/${id}/valider`, validation).pipe(
            map(demande => {
                console.log('Validation réussie:', demande);
                this.refreshDemandes();
                return demande;
            }),
            catchError(error => {
                console.error('Erreur validation:', error);
                throw error;
            })
        );
    }

    detecterTendances(managerId?: string): Observable<{alertes: AlerteTendance[]}> {
        const url = managerId 
            ? `${this.apiUrl}/conges/manager/${managerId}/alertes`
            : `${this.apiUrl}/conges/alertes`;
        return this._httpClient.get<{alertes: AlerteTendance[]}>(url).pipe(
            catchError(error => {
                console.error('Erreur chargement alertes:', error);
                return of({alertes: []});
            })
        );
    }

    // Salaire - Méthodes ADMIN
    getAllBulletins(): Observable<BulletinSalaire[]> {
        return this._httpClient.get<BulletinSalaire[]>(`${this.apiUrl}/salaires`).pipe(
            map(bulletins => {
                this._bulletins.next(bulletins || []);
                return bulletins || [];
            }),
            catchError(error => {
                console.error('Erreur chargement bulletins:', error);
                this._bulletins.next([]);
                return of([]);
            })
        );
    }

    creerBulletin(request: BulletinSalaireRequest): Observable<BulletinSalaire> {
        return this._httpClient.post<BulletinSalaire>(`${this.apiUrl}/salaires`, request).pipe(
            map(bulletin => {
                this.refreshBulletins();
                return bulletin;
            })
        );
    }

    modifierBulletin(id: string, request: BulletinSalaireRequest): Observable<BulletinSalaire> {
        return this._httpClient.put<BulletinSalaire>(`${this.apiUrl}/salaires/${id}`, request).pipe(
            map(bulletin => {
                this.refreshBulletins();
                return bulletin;
            })
        );
    }

    supprimerBulletin(id: string): Observable<void> {
        return this._httpClient.delete<void>(`${this.apiUrl}/salaires/${id}`).pipe(
            map(() => {
                this.refreshBulletins();
            })
        );
    }

    getBulletinsByEmploye(employeId: string): Observable<BulletinSalaire[]> {
        return this._httpClient.get<BulletinSalaire[]>(`${this.apiUrl}/salaires/employe/${employeId}`).pipe(
            catchError(error => {
                console.error('Erreur chargement bulletins par employé:', error);
                return of([]);
            })
        );
    }

    // Utilisateurs - Méthodes ADMIN
    getAllEmployes(): Observable<User[]> {
        return this._httpClient.get<any>(`${this.apiUrl}/users`).pipe(
            map((response: any) => {
                const users = Array.isArray(response) ? response : [];
                const employes = users.filter((u: any) => u.role === 'EMPLOYE' || u.role === 'MANAGER');
                this._employes.next(employes);
                return employes;
            }),
            catchError(error => {
                console.error('Erreur chargement employes:', error);
                this._employes.next([]);
                return of([]);
            })
        );
    }

    getSoldeConge(employeId: string): Observable<SoldeConge> {
        return this._httpClient.get<SoldeConge>(`${this.apiUrl}/conges/solde/${employeId}`).pipe(
            catchError(error => {
                console.error('Erreur chargement solde:', error);
                return of(null as any);
            })
        );
    }

    // Statistiques Admin
    getAdminStats(): Observable<AdminStats> {
        return forkJoin({
            demandes: this._httpClient.get<DemandeConge[]>(`${this.apiUrl}/conges`),
            employes: this._httpClient.get<any>(`${this.apiUrl}/users`)
        }).pipe(
            map(({demandes, employes}) => {
                const users = Array.isArray(employes) ? employes : [];
                const demandesEnAttente = demandes.filter(d => d.statut === 'EN_ATTENTE');
                const demandesApprouvees = demandes.filter(d => d.statut === 'APPROUVE');
                const totalJours = demandesApprouvees.reduce((sum, d) => sum + d.nombreJours, 0);
                
                const stats: AdminStats = {
                    totalDemandesEnAttente: demandesEnAttente.length,
                    totalDemandesApprouvees: demandesApprouvees.length,
                    totalEmployes: users.filter((u: any) => u.role === 'EMPLOYE' || u.role === 'MANAGER').length,
                    moyenneJoursConge: demandesApprouvees.length > 0 ? totalJours / demandesApprouvees.length : 0
                };
                
                this._stats.next(stats);
                return stats;
            }),
            catchError(error => {
                console.error('Erreur chargement stats:', error);
                const emptyStats: AdminStats = {
                    totalDemandesEnAttente: 0,
                    totalDemandesApprouvees: 0,
                    totalEmployes: 0,
                    moyenneJoursConge: 0
                };
                this._stats.next(emptyStats);
                return of(emptyStats);
            })
        );
    }

    // Méthodes utilitaires
    private refreshDemandes(): void {
        this.getAllDemandes().subscribe();
        this.getDemandesEnAttente().subscribe();
    }

    private refreshBulletins(): void {
        this.getAllBulletins().subscribe();
    }

    loadAdminData(): void {
        this.getAllDemandes().subscribe();
        this.getDemandesEnAttente().subscribe();
        this.getAllBulletins().subscribe();
        this.getAllEmployes().subscribe();
        this.getAdminStats().subscribe();
    }

    getEmployeNom(employeId: string): string {
        const employes = this._employes.getValue();
        if (!employes || employes.length === 0) return employeId;
        const employe = employes.find(e => e.id === employeId);
        return employe ? `${employe.prenom} ${employe.nom}` : employeId;
    }

    getDemandeById(id: string): Observable<DemandeConge> {
        return this._httpClient.get<DemandeConge>(`${this.apiUrl}/conges/${id}`).pipe(
            catchError(error => {
                console.error('Erreur chargement demande par ID:', error);
                throw error;
            })
        );
    }

    getBulletinById(id: string): Observable<BulletinSalaire> {
        return this._httpClient.get<BulletinSalaire>(`${this.apiUrl}/salaires/${id}`).pipe(
            catchError(error => {
                console.error('Erreur chargement bulletin par ID:', error);
                throw error;
            })
        );
    }

    // =============================================================================
    // @ EMPLOYÉ - Méthodes
    // =============================================================================

    /**
     * Récupérer les demandes de l'employé connecté
     */
    getMesDemandes(employeId: string): Observable<DemandeConge[]> {
        if (!employeId) {
            console.error('getMesDemandes: employeId est null');
            return of([]);
        }
        return this._httpClient.get<DemandeConge[]>(`${this.apiUrl}/conges/employe/${employeId}`).pipe(
            catchError(error => {
                console.error('Erreur chargement mes demandes:', error);
                return of([]);
            })
        );
    }

    /**
     * Soumettre une nouvelle demande de congé
     */
    soumettreDemande(request: DemandeCongeRequest): Observable<DemandeConge> {
        return this._httpClient.post<DemandeConge>(`${this.apiUrl}/conges`, request).pipe(
            catchError(error => {
                console.error('Erreur soumission demande:', error);
                throw error;
            })
        );
    }

    /**
     * Modifier une demande de congé
     */
    modifierDemande(id: string, request: DemandeCongeRequest): Observable<DemandeConge> {
        return this._httpClient.put<DemandeConge>(`${this.apiUrl}/conges/${id}`, request).pipe(
            catchError(error => {
                console.error('Erreur modification demande:', error);
                throw error;
            })
        );
    }

    /**
     * Supprimer définitivement une demande de congé
     */
    supprimerDemande(id: string, employeId: string): Observable<void> {
        return this._httpClient.delete<void>(`${this.apiUrl}/conges/supprimer/${id}`).pipe(
            map(() => {
                this.getMesDemandes(employeId).subscribe();
                return;
            }),
            catchError(error => {
                console.error('Erreur suppression demande:', error);
                return of(void 0);
            })
        );
    }

    /**
     * Récupérer les bulletins de l'employé
     */
    getMesBulletins(employeId: string): Observable<BulletinSalaire[]> {
        if (!employeId) {
            console.error('getMesBulletins: employeId est null');
            return of([]);
        }
        return this._httpClient.get<BulletinSalaire[]>(`${this.apiUrl}/salaires/employe/${employeId}`).pipe(
            catchError(error => {
                console.error('Erreur chargement mes bulletins:', error);
                return of([]);
            })
        );
    }

    telechargerPDF(id: string): Observable<Blob> {
        return this._httpClient.get(`${this.apiUrl}/salaires/${id}/pdf`, {
            responseType: 'blob'
        });
    }

    /**
     * Soumettre une nouvelle demande de congé avec fichier
     */
    soumettreDemandeWithFile(formData: FormData): Observable<DemandeConge> {
        return this._httpClient.post<DemandeConge>(`${this.apiUrl}/conges/with-file`, formData).pipe(
            catchError(error => {
                console.error('Erreur soumission demande avec fichier:', error);
                throw error;
            })
        );
    }

    // ==================== IA PREDICTION ====================

    /**
     * Prédiction de charge pour l'admin
     */
    getPredictionCharge(mois?: number, annee?: number): Observable<PredictionResponse> {
        let url = `${this.apiUrl}/predictions/admin/charge`;
        if (mois && annee) {
            url += `?mois=${mois}&annee=${annee}`;
        }
        return this._httpClient.get<PredictionResponse>(url);
    }

    /**
     * Recommandations personnalisées pour l'employé
     */
    getRecommandationsEmploye(employeId: string): Observable<RecommandationEmployeResponse[]> {
        return this._httpClient.get<RecommandationEmployeResponse[]>(`${this.apiUrl}/predictions/employee/${employeId}/recommandations`);
    }

    /**
     * Générer des données synthétiques pour l'IA
     */
    genererDonneesSynthetiques(): Observable<string> {
        return this._httpClient.post<string>(`${this.apiUrl}/admin/generer-donnees`, {});
    }
}