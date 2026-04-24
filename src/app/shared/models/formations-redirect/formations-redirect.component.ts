// shared/models/formations-redirect/formations-redirect.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'app/core/auth/auth.service';

@Component({
    selector: 'app-formations-redirect',
    template: `<div class="flex items-center justify-center h-screen">Redirection...</div>`
})
export class FormationsRedirectComponent implements OnInit {
    constructor(
        private router: Router,
        private authService: AuthService
    ) {}

    ngOnInit(): void {
        const isAdmin = this.authService.isAdmin();
        
        console.log('=== REDIRECTION ===');
        console.log('isAdmin:', isAdmin);
        console.log('currentUser:', this.authService.currentUser);
        
        if (isAdmin) {
            console.log('Redirection vers: /apps/formations');
            this.router.navigate(['/apps/formations']);
        } else {
            console.log('Redirection vers: /employee/formations');
            this.router.navigate(['/employee/formations']);
        }
    }
}