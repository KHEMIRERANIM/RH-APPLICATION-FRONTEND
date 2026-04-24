import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
import { NotificationsService } from 'app/layout/common/notifications/notifications.service';
import { RoleService } from 'app/core/auth/role.service';

@Injectable({ providedIn: 'root' })
export class CommandeNotifService implements OnDestroy {
    private _timer: any;
    private _destroy$ = new Subject<void>();
    private readonly POLL_MS = 10_000;
    private readonly BACKEND = 'http://localhost:8081';

    constructor(
        private _http: HttpClient,
        private _notificationsService: NotificationsService,
        private _roleService: RoleService
    ) {}

    start(): void {
        if (this._timer) return;
        if (!this._roleService.isEmploye()) return;
        this._poll();
        this._timer = setInterval(() => this._poll(), this.POLL_MS);
    }

    stop(): void {
        if (this._timer) { clearInterval(this._timer); this._timer = null; }
    }

    ngOnDestroy(): void {
        this.stop();
        this._destroy$.next();
        this._destroy$.complete();
    }

    private _poll(): void {
        const userId = this._roleService.userId;
        if (!userId) return;
        this._http
            .get<any[]>(`${this.BACKEND}/api/commandes/user/${userId}`)
            .pipe(takeUntil(this._destroy$))
            .subscribe({
                next: (commandes) => this._sync(commandes),
                error: () => {}
            });
    }

    private _sync(commandes: any[]): void {
        const pretes = commandes.filter(c => c.statut === 'prete' && c.datePrete);

        pretes.forEach(c => {
            const raw: string = c.datePrete;
            const normalized = raw.replace(/(\.\d{1,2})$/, '$10').substring(0, 19);
            const datePrete = new Date(normalized.replace('T', ' '));
            if (isNaN(datePrete.getTime())) return;

            const minutes = Math.floor((Date.now() - datePrete.getTime()) / 60000);
            const minutesRestantes = Math.max(0, 2 - minutes);
            const enRetard = minutes >= 1;

            // ? Utilise codeRetrait du backend en priorité
            const code = c.codeRetrait || (c.id || '').slice(-4).toUpperCase();

            const notif: any = {
                id: 'commande-prete-' + c.id,
                icon: 'heroicons_outline:bell',
                title: enRetard
                    ? '?? Recuperez votre repas !'
                    : '??? Votre commande est prete !',
                description: enRetard
                    ? `Annulation dans <strong style="color:#dc2626">${minutesRestantes} min</strong> — Code : <strong style="letter-spacing:3px;color:#dc2626;font-size:1.1em">${code}</strong>`
                    : `Presentez ce code au comptoir : <strong style="letter-spacing:3px;color:#4f46e5;font-size:1.1em">${code}</strong>`,
                link: '/apps/restaurant/commandes',
                useRouter: true,
                read: false
            };

            this._notificationsService.pushLocal(notif);
        });

        const idsActifs = new Set(pretes.map(c => 'commande-prete-' + c.id));
        this._notificationsService.notifications$
            .pipe(take(1))
            .subscribe((notifs: any[]) => {
                notifs
                    .filter((n: any) => n.id.startsWith('commande-prete-') && !idsActifs.has(n.id))
                    .forEach((n: any) => this._notificationsService.removeLocal(n.id));
            });
    }
}
