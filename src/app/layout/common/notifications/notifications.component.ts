import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, TemplateRef, ViewChild, ViewContainerRef, ViewEncapsulation } from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { MatButton } from '@angular/material/button';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Notification } from 'app/layout/common/notifications/notifications.types';
import { NotificationsService } from 'app/layout/common/notifications/notifications.service';
import { HttpClient } from '@angular/common/http';
import { UserService } from 'app/services/user.service';
import { Router } from '@angular/router';

@Component({
    selector: 'notifications',
    templateUrl: './notifications.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    exportAs: 'notifications'
})
export class NotificationsComponent implements OnInit, OnDestroy {
    @ViewChild('notificationsOrigin') private _notificationsOrigin: MatButton;
    @ViewChild('notificationsPanel') private _notificationsPanel: TemplateRef<any>;

    notifications: Notification[];
    unreadCount: number = 0;
    employesMap: Map<string, string> = new Map();
    private _overlayRef: OverlayRef;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    /**
     * Constructor
     */
    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _notificationsService: NotificationsService,
        private _overlay: Overlay,
        private _viewContainerRef: ViewContainerRef,
        private _httpClient: HttpClient,
        private _userService: UserService,
        private _router: Router
    ) {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        // Load employees for mapping names
        this._userService.getAllEmployees().pipe(takeUntil(this._unsubscribeAll)).subscribe({
            next: (employees) => {
                employees.forEach((emp: any) => {
                    this.employesMap.set(String(emp.id), `${emp.prenom || emp.firstName || ''} ${emp.nom || emp.lastName || ''}`.trim());
                });

                // Si les notifications ont déjà été chargées, on met à jour les descriptions avec les noms
                if (this.notifications) {
                    this.notifications = this.notifications.map(notif => {
                        if (notif.type === 'DEMANDE_CONFIRMATION' || (notif.expediteurId && notif.type !== 'ALTERNATIVES_DISPONIBLES' && notif.type !== 'ANNULATION_TRAJET')) {
                            const nom = this._getEmployeeName(notif.expediteurId);
                            notif.description = notif.contenu ? `${nom} : ${notif.contenu}` : `Demande de ${nom}`;
                        }
                        if (notif.type === 'ALTERNATIVES_DISPONIBLES' || notif.type === 'ANNULATION_TRAJET') {
                            const nom = this._getEmployeeName(notif.expediteurId);
                            notif.description = notif.contenu ? `${nom} : ${notif.contenu}` : 'Des alternatives sont disponibles.';
                        }
                        return notif;
                    });
                }
                this._changeDetectorRef.markForCheck();
            }
        });

        // Subscribe to notification changes
        this._notificationsService.notifications$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((notifications: Notification[]) => {
                // Update descriptions with names if backend notification
                const processed = notifications.map(notif => {
                    if (notif.type === 'DEMANDE_CONFIRMATION' || (notif.expediteurId && notif.type !== 'ALTERNATIVES_DISPONIBLES' && notif.type !== 'ANNULATION_TRAJET')) {
                        const nom = this._getEmployeeName(notif.expediteurId);
                        notif.description = notif.contenu ? `${nom} : ${notif.contenu}` : `Demande de ${nom}`;
                    }
                    if (notif.type === 'ALTERNATIVES_DISPONIBLES' || notif.type === 'ANNULATION_TRAJET') {
                        const nom = this._getEmployeeName(notif.expediteurId);
                        notif.description = notif.contenu ? `${nom} : ${notif.contenu}` : 'Des alternatives sont disponibles.';
                    }
                    return notif;
                });

                // Load the notifications
                this.notifications = processed;

                // Calculate the unread count
                this._calculateUnreadCount();

                // Mark for check
                this._changeDetectorRef.markForCheck();
            });
    }

    private _getEmployeeName(id?: string): string {
        if (!id) return 'Inconnu';
        return this.employesMap.get(String(id)) || `Employé ${String(id).substring(0, 6)}`;
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();

        // Dispose the overlay
        if (this._overlayRef) {
            this._overlayRef.dispose();
        }
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Open the notifications panel
     */
    openPanel(): void {
        // Return if the notifications panel or its origin is not defined
        if (!this._notificationsPanel || !this._notificationsOrigin) {
            return;
        }

        // Create the overlay if it doesn't exist
        if (!this._overlayRef) {
            this._createOverlay();
        }

        // Attach the portal to the overlay
        this._overlayRef.attach(new TemplatePortal(this._notificationsPanel, this._viewContainerRef));
    }

    /**
     * Close the messages panel
     */
    closePanel(): void {
        this._overlayRef.detach();
    }

    /**
     * Mark all notifications as read
     */
    markAllAsRead(): void {
        // Mark all as read
        this._notificationsService.markAllAsRead().subscribe();
    }

    /**
     * Toggle read status of the given notification
     */
    toggleRead(notification: Notification): void {
        // Toggle the read status
        notification.read = !notification.read;

        // Update the notification
        this._notificationsService.update(notification.id, notification).subscribe();
    }

    /**
     * Delete the given notification
     */
    delete(notification: Notification): void {
        // Delete the notification
        this._notificationsService.delete(notification.id).subscribe();
    }

    /**
     * Répond à une demande de covoiturage depuis la notification
     */
    repondreReservation(notification: Notification, statut: 'CONFIRME' | 'ANNULE', event: Event): void {
        event.stopPropagation(); // Évite de déclencher le toggleRead paren

        if (!notification.reservationId) {
            alert("Cette ancienne notification ne possède pas d'identifiant de réservation. Vous devez créer une nouvelle demande de covoiturage pour tester ce bouton !");
            return;
        }

        // Appel d'API pour update le statut a CONFIRME ou ANNULE
        // On renvoie aussi l'employeId et trajetId au cas où le backend l'exigerait
        const payload = {
            statut: statut,
            trajetId: notification.trajetId,
            employeId: notification.expediteurId
        };

        this._httpClient.put(`http://10.188.81.174:8081/api/reservations/${notification.reservationId}`, payload)
            .subscribe({
                next: () => {
                    // Supprimer la notification ou la marquer comme lue
                    this.delete(notification);
                    alert(`Demande de réservation ${statut === 'CONFIRME' ? 'Acceptée ✅' : 'Refusée ❌'}`);
                },
                error: (err) => {
                    console.error(`Erreur ${statut} de la notification`, err);
                    alert("Erreur lors de la réponse. Regardez la console (F12).");
                }
            });
    }

    /**
     * Trouver une alternative suite à une annulation
     */
    trouverAlternative(notification: Notification, event: Event): void {
        event.stopPropagation();
        event.preventDefault();
        const trajetId = notification.trajetAnnuleId || notification.trajetId;
        if (!trajetId) {
            alert('Identifiant du trajet annulé introuvable dans la notification.');
            return;
        }
        this.closePanel();
        const q: Record<string, string> = { annulationTrajetId: trajetId };
        if (notification.reservationId) {
            q['reservationId'] = notification.reservationId;
        }
        this._router.navigate(['/apps/covoiturage/user'], { queryParams: q });
    }

    /**
     * Track by function for ngFor loops
     *
     * @param index
     * @param item
     */
    trackByFn(index: number, item: any): any {
        return item.id || index;
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Private methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Create the overlay
     */
    private _createOverlay(): void {
        // Create the overlay
        this._overlayRef = this._overlay.create({
            hasBackdrop: true,
            backdropClass: 'fuse-backdrop-on-mobile',
            scrollStrategy: this._overlay.scrollStrategies.block(),
            positionStrategy: this._overlay.position()
                .flexibleConnectedTo(this._notificationsOrigin._elementRef.nativeElement)
                .withLockedPosition(true)
                .withPush(true)
                .withPositions([
                    {
                        originX: 'start',
                        originY: 'bottom',
                        overlayX: 'start',
                        overlayY: 'top'
                    },
                    {
                        originX: 'start',
                        originY: 'top',
                        overlayX: 'start',
                        overlayY: 'bottom'
                    },
                    {
                        originX: 'end',
                        originY: 'bottom',
                        overlayX: 'end',
                        overlayY: 'top'
                    },
                    {
                        originX: 'end',
                        originY: 'top',
                        overlayX: 'end',
                        overlayY: 'bottom'
                    }
                ])
        });

        // Detach the overlay from the portal on backdrop click
        this._overlayRef.backdropClick().subscribe(() => {
            this._overlayRef.detach();
        });
    }

    /**
     * Calculate the unread count
     *
     * @private
     */
    private _calculateUnreadCount(): void {
        let count = 0;

        if (this.notifications && this.notifications.length) {
            count = this.notifications.filter(notification => !notification.read).length;
        }

        this.unreadCount = count;
    }
}
