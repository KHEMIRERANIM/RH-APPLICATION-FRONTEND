import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'academy-redirect',
    template: ``
})
export class AcademyRedirectComponent implements OnInit {
    constructor(private router: Router) {}

    ngOnInit(): void {
        const userStr = localStorage.getItem('currentUser');
        let role = 'EMPLOYE';
        
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                role = user.role;
            } catch(e) {}
        }
        
        if (role === 'ADMIN') {
            this.router.navigate(['/apps/academy/admin']);
        } else {
            this.router.navigate(['/apps/academy/employee']);
        }
    }
}