import { Component } from '@angular/core';

@Component({
  selector: 'app-inter-sites',
  standalone: false,
  template: `
    <div class="flex flex-col flex-auto min-w-0 bg-slate-50">
      <!-- Header -->
      <div class="flex flex-col shadow-sm bg-white border-b border-gray-200">
        <div class="flex flex-col flex-0 p-6 sm:p-10 space-y-1">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-3xl font-black text-slate-800 tracking-tight">Transports Inter-sites</h2>
              <p class="text-slate-500 font-medium">Réservez vos trajets professionnels entre les différents sites de l'entreprise.</p>
            </div>
            <button [routerLink]="['/apps/covoiturage/user/dashboard']"
                    class="inline-flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors border border-slate-200">
              <mat-icon svgIcon="feather:arrow-left" class="icon-size-5 mr-2"></mat-icon>
              Retour
            </button>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-auto p-6 sm:p-10">
        <div class="max-w-2xl mx-auto">
          <div class="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200 border border-slate-100 space-y-8">
            <div class="flex items-center gap-4 mb-2">
              <div class="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-2xl">🏢</div>
              <h3 class="text-xl font-black text-slate-800">Nouvelle Demande Inter-sites</h3>
            </div>

            <div class="space-y-6">
              <!-- Point de départ -->
              <div class="space-y-2">
                <label class="text-sm font-black text-slate-400 uppercase tracking-widest pl-1">Point de départ</label>
                <div class="relative">
                  <mat-icon svgIcon="feather:map-pin" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 icon-size-5"></mat-icon>
                  <input type="text" placeholder="Entrez le lieu de départ..." 
                         class="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700">
                </div>
              </div>



              <!-- Destination (Zone de saisie) -->
              <div class="space-y-2">
                <label class="text-sm font-black text-slate-400 uppercase tracking-widest pl-1">Destination</label>
                <div class="relative">
                  <mat-icon svgIcon="feather:flag" class="absolute left-4 top-4 text-slate-400 icon-size-5"></mat-icon>
                  <textarea rows="4" placeholder="Où allez-vous ? Précisez l'adresse ou le site de destination..." 
                            class="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700 resize-none"></textarea>
                </div>
              </div>

              <button class="w-full h-16 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 group">
                <mat-icon svgIcon="feather:search" class="icon-size-6 group-hover:scale-110 transition-transform"></mat-icon>
                RECHERCHER UN TRAJET
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class InterSitesComponent { }
