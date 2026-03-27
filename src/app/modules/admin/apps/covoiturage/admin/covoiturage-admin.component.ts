import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// ✅ PAS D'IMPORT D'ICÔNES

@Component({
  selector: 'app-covoiturage-admin',
  templateUrl: './covoiturage-admin.component.html',
  //styleUrls: ['./covoiturage-admin.component.css']
})
export class CovoiturageAdminComponent {
  // ✅ PAS DE PROPRIÉTÉS D'ICÔNES
  
  // Vos données et méthodes admin ici
  // Exemple:
  stats = {
    totalCarpools: 25,
    activeUsers: 120,
    pendingRequests: 3
  };
  
  carpoolList = [
    { id: 1, driver: "Fatma Ben Ali", route: "Ariana - Tunis", status: "active" },
    { id: 2, driver: "Ahmed Mansour", route: "La Marsa - Lac 2", status: "pending" }
  ];
  
  validateCarpool(id: number) {
    console.log('Valider covoiturage:', id);
  }
  
  rejectCarpool(id: number) {
    console.log('Rejeter covoiturage:', id);
  }
}