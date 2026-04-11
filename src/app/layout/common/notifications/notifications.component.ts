import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    OnDestroy,
    OnInit,
    TemplateRef,
    ViewChild,
    ViewContainerRef,
    ViewEncapsulation
} from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { MatButton } from '@angular/material/button';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Notification } from 'app/layout/common/notifications/notifications.types';
import { NotificationsService } from 'app/layout/common/notifications/notifications.service';

@Component({
    selector       : 'notifications',
    templateUrl    : './notifications.component.html',
    encapsulation  : ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    exportAs       : 'notifications'
})
export class NotificationsComponent implements OnInit, OnDestroy
{
    @ViewChild('notificationsOrigin') private _notificationsOrigin: MatButton;
    @ViewChild('notificationsPanel')  private _notificationsPanel: TemplateRef<any>;

    notifications: Notification[] = [];
    unreadCount: number = 0;

    private _overlayRef: OverlayRef;
    private _unsubscribeAll: Subject<void> = new Subject<void>();

    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _notificationsService: NotificationsService,
        private _overlay: Overlay,
        private _viewContainerRef: ViewContainerRef
    ) {}

    // ── Lifecycle ────────────────────────────────────────────────────────

    ngOnInit(): void
    {
        // ✅ CORRECTION PRINCIPALE : charger les données depuis le backend
        this._notificationsService.getAll()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe();

        // S'abonner au stream pour mettre à jour l'UI
        this._notificationsService.notifications$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((notifications: Notification[]) => {
                this.notifications = notifications;
                this._calculateUnreadCount();
                this._changeDetectorRef.markForCheck();
            });
    }

    ngOnDestroy(): void
    {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
        if (this._overlayRef) {
            this._overlayRef.dispose();
        }
    }

    // ── Public methods ───────────────────────────────────────────────────

    openPanel(): void
    {
        if (!this._notificationsPanel || !this._notificationsOrigin) { return; }
        if (!this._overlayRef) { this._createOverlay(); }
        this._overlayRef.attach(new TemplatePortal(this._notificationsPanel, this._viewContainerRef));
    }

    closePanel(): void
    {
        this._overlayRef.detach();
    }

    markAllAsRead(): void
    {
        this._notificationsService.markAllAsRead().subscribe();
    }

    toggleRead(notification: Notification): void
    {
        notification.read = !notification.read;
        this._notificationsService.update(notification.id, notification).subscribe();
    }

    delete(notification: Notification): void
    {
        this._notificationsService.delete(notification.id).subscribe();
    }

    trackByFn(index: number, item: any): any
    {
        return item.id || index;
    }

    // ── Private methods ──────────────────────────────────────────────────

    private _createOverlay(): void
    {
        this._overlayRef = this._overlay.create({
            hasBackdrop     : true,
            backdropClass   : 'fuse-backdrop-on-mobile',
            scrollStrategy  : this._overlay.scrollStrategies.block(),
            positionStrategy: this._overlay.position()
                .flexibleConnectedTo(this._notificationsOrigin._elementRef.nativeElement)
                .withLockedPosition(true)
                .withPush(true)
                .withPositions([
                    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top'    },
                    { originX: 'start', originY: 'top',    overlayX: 'start', overlayY: 'bottom' },
                    { originX: 'end',   originY: 'bottom', overlayX: 'end',   overlayY: 'top'    },
                    { originX: 'end',   originY: 'top',    overlayX: 'end',   overlayY: 'bottom' }
                ])
        });

        this._overlayRef.backdropClick()
            .subscribe(() => this._overlayRef.detach());
    }

    private _calculateUnreadCount(): void
    {
        this.unreadCount = this.notifications
            ? this.notifications.filter(n => !n.read).length
            : 0;
    }
}