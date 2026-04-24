import { Component, OnDestroy, OnInit, ViewChild, TemplateRef, ViewEncapsulation, AfterViewInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CalendarService } from './calendar.service';
import { FormationService } from '../../../../services/formation.service';
import { Formation } from '../../../../shared/models/formation.model';
import { Calendar, CalendarSettings, CalendarWeekday } from './calendar.types';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import moment from 'moment';
import { FullCalendarComponent } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { DialogService } from '../../../../core/services/dialog.service';
import { Router } from '@angular/router';
import { FormateurService } from '../../../employee-formation/formateurs/formateur.service';
import { ParticipantService, ParticipantInscription } from '../../../employee-formation/services/participant.service';


declare const google: any;

// À ajouter avant @Component
interface KPIsData {
  // KPIs classiques
  tauxRemplissageMoyen: number;
  tauxReussiteGlobal: number;
employeLePlusActif: EmployeActifDTO | null;
  totalInscrits: number;
  totalCertifies: number;
  totalAbandons: number;
  npsMoyen: number;
  chiffreAffairesTotal: number;
  tauxRemplissageParFormation: { [key: string]: number };
  tauxReussiteParFormation: { [key: string]: number };
  
  // KPI IA
  tauxRisqueEchecGlobal: number;
  risqueEchecParFormation: { [key: string]: number };
  alertesFormations: { [key: string]: any };
}
interface EmployeActifDTO {
  employeId: string;
  nom: string;
  prenom: string;
  email: string;
  nombreInscriptions: number;
  formationsSuivies: string[];
}
interface AlerteFormation {
  risque: number;
  recommandation: string;
  action: string;
}

@Component({
    selector: 'calendar',
    templateUrl: './calendar.component.html',
    encapsulation: ViewEncapsulation.None
})
export class CalendarComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('fullCalendar') fullCalendar!: FullCalendarComponent;
    @ViewChild('eventPanel') eventPanel!: TemplateRef<any>;

    calendars: Calendar[] = [];
    events: any[] = [];
    formations: Formation[] = [];
    formateursList: any[] = [];
    isLoadingFormateurs: boolean = false;
    settings!: CalendarSettings;
    weekdays!: CalendarWeekday[];
    view: string = 'dayGridMonth';
    viewTitle: string = 'Formations';
    drawerOpened: boolean = true;
    drawerMode: 'side' | 'over' = 'side';
    panelMode: 'view' | 'add' | 'edit' = 'view';
    eventForm!: FormGroup;
    selectedEvent: any = null;
    recurrenceStatus: string = '';
    eventEditMode: string = 'single';

    startHour: Date = new Date();
    endHour: Date = new Date();
    isAdmin: boolean = true;
      kpisData: KPIsData | null = null;
    isLoadingKPIs: boolean = false;
    showKPIsPanel: boolean = false;
    
    // Graphiques KPIs
    kpiBarChartData: any = null;
    kpiRiskChartData: any = null;
    kpiDonutChartData: any = null;
    // Google Maps
    map: any;
    marker: any;
    geocoder: any;
    autocomplete: any;
    mapInitialized: boolean = false;
    mapLoadError: boolean = false;
    mapLoading: boolean = true;
    mapCenter: { lat: number; lng: number } = { lat: 36.8065, lng: 10.1815 };
    mapZoom: number = 12;

    calendarPlugins = [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin];

    calendarOptions: any = {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: '',
            center: '',
            right: ''
        },
        height: '100%',
        plugins: this.calendarPlugins,
        events: [],
        dateClick: this.onDateClick.bind(this),
        eventClick: this.onEventClick.bind(this),
        eventRender: this.onEventRender.bind(this),
        firstDay: 1,
        locale: 'fr'
    };

    typeColors: { [key: string]: string } = {
        'TECHNIQUE': '#3b82f6',
        'MANAGERIAL': '#10b981',
        'RSE': '#8b5cf6',
        'SOFT_SKILLS': '#f59e0b',
        'SECURITE': '#ef4444'
    };

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(
        private calendarService: CalendarService,
        private formationService: FormationService,
        private formateurService: FormateurService,
        public dialog: MatDialog,
        private fb: FormBuilder,
        private dialogService: DialogService,
            private participantService: ParticipantService, 
        private ngZone: NgZone,
        private cdr: ChangeDetectorRef,
        private router: Router
    ) {
        this.initForm();
    }

    private initForm(): void {
        this.eventForm = this.fb.group({
            title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
            description: ['', [Validators.maxLength(500)]],
            start: [null, [Validators.required]],
            end: [null, [Validators.required]],
            calendarId: ['1', [Validators.required]],
            allDay: [false],
            formateurId: [null],
            nombrePlaces: [10, [Validators.min(1), Validators.max(100)]],
            placesDisponibles: [10, [Validators.min(0)]],
            lieu: [''],
            lienVisio: [''],
            lienGoogleMaps: [''],
            dureeHeures: [{ value: 0, disabled: true }],
            prerequisFormationId: [null]
        }, {
            validators: [
                this.dateRangeValidator.bind(this), 
                this.dateNotInPastValidator.bind(this),
                this.customValidators.bind(this)
            ]
        });

        this.startHour.setHours(9, 0, 0, 0);
        this.endHour.setHours(17, 0, 0, 0);

        this.eventForm.get('start')?.valueChanges.subscribe(() => {
            this.calculerDureeAvecHeures();
        });

        this.eventForm.get('end')?.valueChanges.subscribe(() => {
            this.calculerDureeAvecHeures();
        });

        this.eventForm.get('lieu')?.valueChanges.subscribe(value => {
            if (value && value.trim() !== '') {
                const encodedAddress = encodeURIComponent(value);
                const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
                this.eventForm.patchValue({ lienGoogleMaps: mapsLink }, { emitEvent: false });
            } else {
                this.eventForm.patchValue({ lienGoogleMaps: '' }, { emitEvent: false });
            }
        });

        this.eventForm.get('title')?.valueChanges.subscribe(title => {
            if (title && title.trim() !== '') {
                const jitsiLink = this.generateJitsiLinkFromTitle(title);
                this.eventForm.patchValue({ lienVisio: jitsiLink }, { emitEvent: false });
            }
        });
    }
  

    // Ajouter cette méthode dans calendar.component.ts
getNombreInscritsReel(formation: Formation): number {
    if (!formation || !formation.id) return 0;
    
    // Chercher dans la liste déjà chargée
    if (this.participantsList && this.participantsList.length > 0) {
        return this.participantsList.filter(p => 
            p.statut !== 'Terminé' && p.statut !== 'TERMINE' && p.statut !== 'Annulé'
        ).length;
    }
    
    // Sinon retourner la différence (fallback)
    return (formation.nombrePlaces || 0) - (formation.placesDisponibles || 0);
}
    /**
     * Validateur personnalisé unique
     * ✅ FIX 1 : on exclut la formation en cours d'édition (selectedEvent.id)
     *            pour éviter qu'elle se détecte elle-même comme conflit.
     * ✅ FIX 2 : on applique startHour/endHour aux dates pour avoir les
     *            vrais créneaux horaires (sinon minuit par défaut → pas de
     *            chevauchement détecté entre formations du même formateur).
     */
    private customValidators(group: AbstractControl): ValidationErrors | null {
        const errors: ValidationErrors = {};

        const start = group.get('start')?.value;
        const end = group.get('end')?.value;
        const categoryId = group.get('calendarId')?.value;
        const formateurId = group.get('formateurId')?.value;

        // ID de la formation en cours d'édition (undefined en mode ajout)
        const excludeId = this.panelMode === 'edit' && this.selectedEvent?.id
            ? this.selectedEvent.id
            : undefined;

        if (start && end) {
            // Construire les datetimes complets avec les heures saisies,
            // exactement comme dans addEvent() / updateEvent()
            const startDateTime = moment(start).set({
                hour: this.startHour.getHours(),
                minute: this.startHour.getMinutes(),
                second: 0
            }).toDate();

            const endDateTime = moment(end).set({
                hour: this.endHour.getHours(),
                minute: this.endHour.getMinutes(),
                second: 0
            }).toDate();

            if (categoryId) {
                const hasOverlap = this.checkOverlapWithSameCategory(startDateTime, endDateTime, categoryId, excludeId);
                if (hasOverlap) {
                    errors['sameCategoryOverlap'] = true;
                }
            }

            if (formateurId) {
                const isAvailable = this.checkFormateurAvailability(formateurId, startDateTime, endDateTime, excludeId);
                if (!isAvailable) {
                    errors['formateurUnavailable'] = true;
                }
            }
        }

        return Object.keys(errors).length ? errors : null;
    }

    /**
     * Vérifie s'il existe un chevauchement avec une autre formation de la MÊME CATÉGORIE
     */
    private checkOverlapWithSameCategory(startDate: Date, endDate: Date, categoryId: string, excludeId?: string): boolean {
        if (!this.formations.length) return false;
        
        const newStart = moment(startDate);
        const newEnd = moment(endDate);
        const newType = this.getTypeFromCalendarId(categoryId);
        
        for (const formation of this.formations) {
            if (excludeId && formation.id === excludeId) {
                continue;
            }
            
            if (formation.type === newType) {
                const existingStart = moment(formation.dateDebut);
                const existingEnd = moment(formation.dateFin);
                
                const hasOverlap = newStart.isBefore(existingEnd) && newEnd.isAfter(existingStart);
                
                if (hasOverlap) {
                    console.log(`❌ Conflit catégorie: ${formation.titre} (${formation.type}) du ${existingStart.format('DD/MM/YYYY HH:mm')} au ${existingEnd.format('DD/MM/YYYY HH:mm')}`);
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Vérifie si un formateur est disponible
     * FIX FINAL : le backend ne retourne jamais formateurId (undefined),
     * on compare donc par le NOM du formateur (formation.formateur).
     */
    private checkFormateurAvailability(formateurId: string, startDate: Date, endDate: Date, excludeId?: string): boolean {
        if (!formateurId || !this.formations.length) return true;

        // Résoudre le nom complet du formateur sélectionné
        const formateur = this.formateursList.find(f => String(f.id) === String(formateurId));
        if (!formateur) return true;

        const formateurNom = `${formateur.prenom} ${formateur.nom}`;
        const newStart = moment(startDate);
        const newEnd = moment(endDate);

        console.log(`🔍 Vérif formateur "${formateurNom}" | ${newStart.format('DD/MM/YYYY HH:mm')} → ${newEnd.format('DD/MM/YYYY HH:mm')}`);

        for (const formation of this.formations) {
            if (excludeId && String(formation.id) === String(excludeId)) continue;

            // Comparer par nom car formateurId n'est pas retourné par le backend
            if (formation.formateur && formation.formateur.trim() === formateurNom.trim()) {
                const existingStart = moment(formation.dateDebut);
                const existingEnd = moment(formation.dateFin);
                const hasOverlap = newStart.isBefore(existingEnd) && newEnd.isAfter(existingStart);

                console.log(`  → "${formation.titre}" | ${existingStart.format('DD/MM/YYYY HH:mm')} → ${existingEnd.format('DD/MM/YYYY HH:mm')} | overlap=${hasOverlap}`);

                if (hasOverlap) {
                    console.log(`❌ Formateur ${formateurNom} déjà occupé par: "${formation.titre}"`);
                    return false;
                }
            }
        }

        console.log(`✅ Formateur ${formateurNom} disponible`);
        return true;
    }

    loadFormateurs(): void {
        this.isLoadingFormateurs = true;
        this.formateurService.getFormateurs().subscribe({
            next: (formateurs) => {
                this.formateursList = formateurs.filter(f => f.status === 'ACTIF');
                console.log('✅ Formateurs chargés:', this.formateursList);
                this.isLoadingFormateurs = false;
            },
            error: (err) => {
                console.error('Erreur chargement formateurs', err);
                this.isLoadingFormateurs = false;
            }
        });
    }

    getFormateurNom(formateurId: string): string {
        const formateur = this.formateursList.find(f => f.id === formateurId);
        return formateur ? `${formateur.prenom} ${formateur.nom}` : '';
    }

    calculerDureeAvecHeures(): void {
        const startDate = this.eventForm.get('start')?.value;
        const endDate = this.eventForm.get('end')?.value;

        if (startDate && endDate) {
            const startDateTime = moment(startDate).set({
                hour: this.startHour.getHours(),
                minute: this.startHour.getMinutes()
            });
            const endDateTime = moment(endDate).set({
                hour: this.endHour.getHours(),
                minute: this.endHour.getMinutes()
            });
            
            const dureeHeures = endDateTime.diff(startDateTime, 'hours', true);
            this.eventForm.patchValue({ dureeHeures: Math.ceil(dureeHeures) }, { emitEvent: false });
        } else {
            this.eventForm.patchValue({ dureeHeures: 0 }, { emitEvent: false });
        }
    }

    onStartHourChange(event: any): void {
        const time = event.target.value;
        const [hours, minutes] = time.split(':');
        this.startHour.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        this.calculerDureeAvecHeures();
        this.eventForm.updateValueAndValidity();
    }

    onEndHourChange(event: any): void {
        const time = event.target.value;
        const [hours, minutes] = time.split(':');
        this.endHour.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        this.calculerDureeAvecHeures();
        this.eventForm.updateValueAndValidity();
    }

    generateJitsiLinkFromTitle(title: string): string {
        if (!title || title.trim() === '') {
            return '';
        }

        const cleanTitle = title
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        const finalTitle = cleanTitle.substring(0, 40);
        const timestamp = Date.now().toString().slice(-4);

        return `https://meet.jit.si/formation-${finalTitle}-${timestamp}`;
    }

    dateRangeValidator(group: AbstractControl): ValidationErrors | null {
        const start = group.get('start')?.value;
        const end = group.get('end')?.value;

        if (start && end) {
            const startDate = moment(start);
            const endDate = moment(end);

            if (endDate.isBefore(startDate)) {
                return { dateRangeInvalid: true };
            }

            const duration = endDate.diff(startDate, 'days');
            if (duration > 30) {
                return { durationTooLong: true };
            }
        }
        return null;
    }

    dateNotInPastValidator(group: AbstractControl): ValidationErrors | null {
        const start = group.get('start')?.value;

        if (start) {
            const startDate = moment(start);
            const today = moment().startOf('day');

            if (startDate.isBefore(today)) {
                return { dateInPast: true };
            }
        }
        return null;
    }

    hasError(fieldName: string, errorType: string): boolean {
        const field = this.eventForm.get(fieldName);
        return field ? field.hasError(errorType) && (field.dirty || field.touched) : false;
    }

    getErrorMessage(fieldName: string): string {
        const field = this.eventForm.get(fieldName);

        if (field?.hasError('required')) {
            return 'Ce champ est requis';
        }
        if (field?.hasError('minlength')) {
            return 'Minimum ' + field.errors?.['minlength'].requiredLength + ' caractères';
        }
        if (field?.hasError('maxlength')) {
            return 'Maximum ' + field.errors?.['maxlength'].requiredLength + ' caractères';
        }
        return '';
    }

    getFormErrorMessage(): string {
        if (this.eventForm.hasError('dateRangeInvalid')) {
            return 'La date de fin doit être postérieure à la date de début';
        }
        if (this.eventForm.hasError('durationTooLong')) {
            return 'La durée de la formation ne peut pas dépasser 30 jours';
        }
        if (this.eventForm.hasError('dateInPast')) {
            return 'La date de début ne peut pas être dans le passé';
        }
        if (this.eventForm.hasError('sameCategoryOverlap')) {
            const category = this.getCategoryNameFromId(this.eventForm.get('calendarId')?.value);
            return `⚠️ Une autre formation de catégorie "${category}" a déjà lieu pendant cette période.`;
        }
        if (this.eventForm.hasError('formateurUnavailable')) {
            const formateurId = this.eventForm.get('formateurId')?.value;
            const formateur = this.formateursList.find(f => f.id === formateurId);
            const formateurNom = formateur ? `${formateur.prenom} ${formateur.nom}` : 'Ce formateur';
            return `⚠️ ${formateurNom} est déjà occupé pendant cette période.`;
        }
        return '';
    }

    private getCategoryNameFromId(calendarId: string): string {
        const categoryMap: { [key: string]: string } = {
            '1': 'Technique',
            '2': 'Managerial',
            '3': 'RSE',
            '4': 'Soft Skills',
            '5': 'Sécurité'
        };
        return categoryMap[calendarId] || 'Inconnue';
    }

    ngOnInit(): void {
        this.loadFormations();
        this.loadFormateurs();
        this.loadParticipantsForKPIs();
        this.loadKPIs();
        this.calendarService.calendars$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((calendars) => {
                this.calendars = calendars || [];
            });

        this.calendarService.settings$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((settings) => {
                this.settings = settings;
            });

        this.calendarService.weekdays$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((weekdays) => {
                this.weekdays = weekdays;
            });
    }

    ngAfterViewInit(): void {
        this.checkGoogleMapsLoaded();
    }

    updateMapLocation(address: string): void {
        if (!address || !this.map || !this.mapInitialized || typeof google === 'undefined') return;

        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: address, componentRestrictions: { country: 'tn' } }, (results: any, status: any) => {
            if (status === 'OK' && results && results[0]) {
                const location = results[0].geometry.location;
                const lat = location.lat();
                const lng = location.lng();

                this.ngZone.run(() => {
                    this.mapCenter = { lat: lat, lng: lng };
                    this.map.setCenter(this.mapCenter);
                    this.marker.setPosition(this.mapCenter);
                    this.map.setZoom(15);

                    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                    this.eventForm.patchValue({ lienGoogleMaps: mapsLink }, { emitEvent: false });
                    this.cdr.detectChanges();
                });
            }
        });
    }

    genererLienManuellement(): void {
        const lieu = this.eventForm.get('lieu')?.value;
        if (lieu && lieu.trim() !== '') {
            const encodedAddress = encodeURIComponent(lieu);
            const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
            this.eventForm.patchValue({ lienGoogleMaps: mapsLink });

            this.dialogService.alert({
                title: 'Lien généré',
                message: 'Le lien Google Maps a été généré avec succès.',
                type: 'success',
                confirmText: 'Fermer'
            });
        } else {
            this.dialogService.alert({
                title: 'Adresse manquante',
                message: 'Veuillez d\'abord saisir une adresse.',
                type: 'warning',
                confirmText: 'Fermer'
            });
        }
    }

    loadFormations(): void {
        this.formationService.getAllFormations().subscribe({
            next: (formations) => {
                this.formations = formations;
                this.events = this.convertToEvents(formations);
                this.calendarOptions.events = this.events;
                if (this.fullCalendar?.getApi()) {
                    this.fullCalendar.getApi().removeAllEvents();
                    this.fullCalendar.getApi().addEventSource(this.events);
                }
                console.log('✅ Formations chargées:', this.formations.length);
            },
            error: (err) => {
                console.error('Erreur chargement formations', err);
                this.dialogService.alert({
                    title: 'Erreur',
                    message: 'Impossible de charger les formations.',
                    type: 'error',
                    confirmText: 'Fermer'
                });
            }
        });
    }

    convertToEvents(formations: Formation[]): any[] {
        return formations.map(formation => ({
            id: formation.id,
            title: formation.titre,
            start: moment(formation.dateDebut).format(),
            end: moment(formation.dateFin).format(),
            description: formation.description,
            calendarId: this.getCalendarIdByType(formation.type),
            allDay: false,
            backgroundColor: this.typeColors[formation.type] || '#3b82f6',
            borderColor: this.typeColors[formation.type] || '#3b82f6',
            textColor: '#ffffff',
            extendedProps: {
                ...formation,
                formateur: formation.formateur,
                formateurId: formation.formateurId,
                placesDisponibles: formation.placesDisponibles,
                nombrePlaces: formation.nombrePlaces,
                type: formation.type,
                lieu: formation.lieu,
                lienVisio: formation.lienVisio,
                lienGoogleMaps: formation.lienGoogleMaps,
                prerequisFormationId: formation.prerequisFormationId,
                prerequisFormationTitre: formation.prerequisFormationTitre
            }
        }));
    }

    getCalendarIdByType(type: string): string {
        const typeMap: { [key: string]: string } = {
            'TECHNIQUE': '1',
            'MANAGERIAL': '2',
            'RSE': '3',
            'SOFT_SKILLS': '4',
            'SECURITE': '5'
        };
        return typeMap[type] || '1';
    }

    getTypeFromCalendarId(calendarId: string): string {
        const typeMap: { [key: string]: string } = {
            '1': 'TECHNIQUE',
            '2': 'MANAGERIAL',
            '3': 'RSE',
            '4': 'SOFT_SKILLS',
            '5': 'SECURITE'
        };
        return typeMap[calendarId] || 'TECHNIQUE';
    }

    getFormationsDisponiblesCommePrerequisFor(excludeId?: string): Formation[] {
        return this.formations.filter(f => f.id !== excludeId);
    }

    getTitrePrerequisSelectionne(): string {
        const id = this.eventForm.get('prerequisFormationId')?.value;
        if (!id) return '';
        return this.formations.find(f => f.id === id)?.titre || '';
    }

    onDateClick(event: any): void {
        this.panelMode = 'add';
        this.selectedEvent = null;

        this.startHour.setHours(9, 0, 0, 0);
        this.endHour.setHours(17, 0, 0, 0);

        this.eventForm.reset({
            title: '',
            description: '',
            start: event.date,
            end: event.date,
            allDay: true,
            calendarId: '1',
            formateurId: null,
            nombrePlaces: 10,
            placesDisponibles: 10,
            lieu: '',
            lienVisio: '',
            lienGoogleMaps: '',
            dureeHeures: 0,
            prerequisFormationId: null
        });
        this.openEventPanel();
    }

    onEventClick(event: any): void {
        const formation = this.formations.find(f => f.id === event.event.id);
        if (formation) {
            this.selectedEvent = {
                id: formation.id,
                title: formation.titre,
                description: formation.description,
                start: moment(formation.dateDebut),
                end: moment(formation.dateFin),
                calendarId: this.getCalendarIdByType(formation.type),
                allDay: false,
                formation: formation,
                formateurId: formation.formateurId
            };
            this.panelMode = 'view';
            this.openEventPanel();
        }
    }

    onEventRender(eventInfo: any): void {
        const eventEl = eventInfo.el;
        const event = eventInfo.event;

        const title = event.title || '';
        const startDate = event.start ? moment(event.start).format('DD/MM/YYYY HH:mm') : '';
        const endDate = event.end ? moment(event.end).format('DD/MM/YYYY HH:mm') : '';
        const formateur = event.extendedProps?.formateur || '';
        const places = event.extendedProps?.placesDisponibles || 0;

        const tooltipText = `${title}\nFormateur: ${formateur}\nDate: ${startDate} - ${endDate}\nPlaces disponibles: ${places}`;
        eventEl.setAttribute('title', tooltipText);
        eventEl.classList.add('formation-event');
    }

    copierLien(lien: string): void {
        navigator.clipboard.writeText(lien).then(() => {
            this.dialogService.alert({
                title: 'Lien copié',
                message: 'Le lien a été copié dans le presse-papier.',
                type: 'success',
                confirmText: 'Fermer'
            });
        }).catch(() => {
            this.dialogService.alert({
                title: 'Erreur',
                message: 'Impossible de copier le lien.',
                type: 'error',
                confirmText: 'Fermer'
            });
        });
    }

    async addEvent(): Promise<void> {
        Object.keys(this.eventForm.controls).forEach(key => {
            this.eventForm.get(key)?.markAsTouched();
        });

        if (this.eventForm.valid) {
            const formValue = this.eventForm.value;
            
            const startDateTime = moment(formValue.start)
                .set({
                    hour: this.startHour.getHours(),
                    minute: this.startHour.getMinutes()
                })
                .toDate();
                
            const endDateTime = moment(formValue.end)
                .set({
                    hour: this.endHour.getHours(),
                    minute: this.endHour.getMinutes()
                })
                .toDate();
            
            // Vérification de la même catégorie
            const hasSameCategoryOverlap = this.checkOverlapWithSameCategory(
                startDateTime, 
                endDateTime, 
                formValue.calendarId
            );
            
            if (hasSameCategoryOverlap) {
                const categoryName = this.getCategoryNameFromId(formValue.calendarId);
                await this.dialogService.alert({
                    title: '❌ Conflit de catégorie',
                    message: `Une autre formation de catégorie "${categoryName}" a déjà lieu pendant cette période.\n\nDeux formations de même catégorie ne peuvent pas se dérouler en même temps.`,
                    type: 'warning',
                    confirmText: 'Fermer'
                }).toPromise();
                return;
            }
            
            // Vérification de la disponibilité du formateur
            if (formValue.formateurId) {
                const isFormateurAvailable = this.checkFormateurAvailability(
                    formValue.formateurId, 
                    startDateTime, 
                    endDateTime
                );
                
                if (!isFormateurAvailable) {
                    const formateur = this.formateursList.find(f => f.id === formValue.formateurId);
                    const formateurNom = formateur ? `${formateur.prenom} ${formateur.nom}` : 'Ce formateur';
                    await this.dialogService.alert({
                        title: '❌ Formateur non disponible',
                        message: `${formateurNom} est déjà occupé pendant cette période.\n\nVeuillez choisir un autre créneau horaire ou un autre formateur.`,
                        type: 'warning',
                        confirmText: 'Fermer'
                    }).toPromise();
                    return;
                }
            }
            
            const selectedFormateur = this.formateursList.find(f => f.id === formValue.formateurId);
            const formateurNom = selectedFormateur ? `${selectedFormateur.prenom} ${selectedFormateur.nom}` : '';

            let lienVisio = formValue.lienVisio;
            if (!lienVisio || lienVisio === '') {
                lienVisio = this.generateJitsiLinkFromTitle(formValue.title);
            }

            const prerequisId = formValue.prerequisFormationId || null;
            const prerequisTitre = prerequisId
                ? (this.formations.find(f => f.id === prerequisId)?.titre || '')
                : '';

            const newFormation: Formation = {
                titre: formValue.title.trim(),
                description: formValue.description?.trim() || '',
                objectifs: '',
                preRequis: '',
                type: this.getTypeFromCalendarId(formValue.calendarId),
                dureeHeures: Math.ceil(moment(endDateTime).diff(moment(startDateTime), 'hours', true)),
                nombrePlaces: formValue.nombrePlaces || 10,
                placesDisponibles: formValue.placesDisponibles || 10,
                niveau: 'DEBUTANT',
                formateur: formateurNom,
                formateurId: formValue.formateurId,
                formateurBio: '',
                lieu: formValue.lieu || '',
                lienVisio: lienVisio,
                lienGoogleMaps: formValue.lienGoogleMaps || '',
                dateDebut: startDateTime,
                dateFin: endDateTime,
                dateLimiteInscription: moment(startDateTime).subtract(1, 'days').toDate(),
                active: true,
                prerequisFormationId: prerequisId,
                prerequisFormationTitre: prerequisTitre
            };

            this.formationService.createFormation(newFormation).subscribe({
                next: () => {
                    this.loadFormations();
                    this.dialog.closeAll();
                    this.dialogService.alert({
                        title: '✅ Formation créée',
                        message: `La formation "${newFormation.titre}" a été créée avec succès.`,
                        type: 'success',
                        confirmText: 'Fermer'
                    });
                },
                error: (err) => {
                    console.error('Erreur création:', err);
                    this.dialogService.alert({
                        title: '❌ Échec de la création',
                        message: err.error?.message || 'Une erreur est survenue lors de la création.',
                        type: 'error',
                        confirmText: 'Fermer'
                    });
                }
            });
        } else {
            const errorMsg = this.getFormErrorMessage();
            if (errorMsg) {
                this.dialogService.alert({
                    title: 'Formulaire invalide',
                    message: errorMsg,
                    type: 'warning',
                    confirmText: 'Fermer'
                });
            } else {
                this.dialogService.alert({
                    title: 'Formulaire incomplet',
                    message: 'Veuillez remplir tous les champs obligatoires correctement.',
                    type: 'warning',
                    confirmText: 'Fermer'
                });
            }
        }
    }

    async updateEvent(): Promise<void> {
        if (this.eventForm.valid && this.selectedEvent && this.selectedEvent.id) {
            const formValue = this.eventForm.value;
            
            const startDateTime = moment(formValue.start)
                .set({
                    hour: this.startHour.getHours(),
                    minute: this.startHour.getMinutes()
                })
                .toDate();
                
            const endDateTime = moment(formValue.end)
                .set({
                    hour: this.endHour.getHours(),
                    minute: this.endHour.getMinutes()
                })
                .toDate();
            
            // Vérification de la même catégorie (en excluant la formation en cours)
            const hasSameCategoryOverlap = this.checkOverlapWithSameCategory(
                startDateTime, 
                endDateTime, 
                formValue.calendarId,
                this.selectedEvent.id
            );
            
            if (hasSameCategoryOverlap) {
                const categoryName = this.getCategoryNameFromId(formValue.calendarId);
                await this.dialogService.alert({
                    title: '❌ Conflit de catégorie',
                    message: `Une autre formation de catégorie "${categoryName}" a déjà lieu pendant cette période.\n\nDeux formations de même catégorie ne peuvent pas se dérouler en même temps.`,
                    type: 'warning',
                    confirmText: 'Fermer'
                }).toPromise();
                return;
            }
            
            // Vérification de la disponibilité du formateur (en excluant la formation en cours)
            if (formValue.formateurId) {
                const isFormateurAvailable = this.checkFormateurAvailability(
                    formValue.formateurId, 
                    startDateTime, 
                    endDateTime,
                    this.selectedEvent.id
                );
                
                if (!isFormateurAvailable) {
                    const formateur = this.formateursList.find(f => f.id === formValue.formateurId);
                    const formateurNom = formateur ? `${formateur.prenom} ${formateur.nom}` : 'Ce formateur';
                    await this.dialogService.alert({
                        title: '❌ Formateur non disponible',
                        message: `${formateurNom} est déjà occupé pendant cette période.\n\nVeuillez choisir un autre créneau horaire ou un autre formateur.`,
                        type: 'warning',
                        confirmText: 'Fermer'
                    }).toPromise();
                    return;
                }
            }
            
            const selectedFormateur = this.formateursList.find(f => f.id === formValue.formateurId);
            const formateurNom = selectedFormateur ? `${selectedFormateur.prenom} ${selectedFormateur.nom}` : '';

            let lienVisio = formValue.lienVisio;
            if (!lienVisio || lienVisio === '') {
                lienVisio = this.generateJitsiLinkFromTitle(formValue.title);
            }

            const prerequisId = formValue.prerequisFormationId || null;
            const prerequisTitre = prerequisId
                ? (this.formations.find(f => f.id === prerequisId)?.titre || '')
                : '';

            const updatedFormation: Formation = {
                ...this.selectedEvent.formation,
                titre: formValue.title.trim(),
                description: formValue.description?.trim() || '',
                dateDebut: startDateTime,
                dateFin: endDateTime,
                type: this.getTypeFromCalendarId(formValue.calendarId),
                formateur: formateurNom,
                formateurId: formValue.formateurId,
                nombrePlaces: formValue.nombrePlaces || 10,
                placesDisponibles: formValue.placesDisponibles || 10,
                lieu: formValue.lieu || '',
                lienVisio: lienVisio,
                lienGoogleMaps: formValue.lienGoogleMaps || '',
                prerequisFormationId: prerequisId,
                prerequisFormationTitre: prerequisTitre
            };

            this.formationService.updateFormation(this.selectedEvent.id, updatedFormation).subscribe({
                next: () => {
                    this.loadFormations();
                    this.dialog.closeAll();
                    this.dialogService.alert({
                        title: '✅ Formation modifiée',
                        message: `La formation "${updatedFormation.titre}" a été modifiée avec succès.`,
                        type: 'success',
                        confirmText: 'Fermer'
                    });
                },
                error: (err) => {
                    console.error('Erreur mise à jour:', err);
                    this.dialogService.alert({
                        title: '❌ Échec de la modification',
                        message: err.error?.message || 'Une erreur est survenue lors de la modification.',
                        type: 'error',
                        confirmText: 'Fermer'
                    });
                }
            });
        }
    }

    async deleteEvent(event: any): Promise<void> {
        const formation = this.formations.find(f => f.id === event.id);

        const confirmed = await this.dialogService.confirm({
            title: 'Confirmer la suppression',
            message: `Êtes-vous sûr de vouloir supprimer la formation "${formation?.titre}" ?\n\nCette action est irréversible.`,
            confirmText: 'Supprimer',
            cancelText: 'Annuler',
            type: 'error'
        }).toPromise();

        if (confirmed) {
            this.formationService.deleteFormation(event.id).subscribe({
                next: () => {
                    this.loadFormations();
                    this.dialog.closeAll();
                    this.dialogService.alert({
                        title: '✅ Formation supprimée',
                        message: `La formation "${formation?.titre}" a été supprimée avec succès.`,
                        type: 'success',
                        confirmText: 'Fermer'
                    });
                },
                error: (err) => {
                    console.error('Erreur suppression:', err);
                    this.dialogService.alert({
                        title: '❌ Échec de la suppression',
                        message: err.error?.message || 'Une erreur est survenue lors de la suppression.',
                        type: 'error',
                        confirmText: 'Fermer'
                    });
                }
            });
        }
    }

    editFormation(formation: Formation): void {
        console.log('📝 Édition de la formation:', formation);
        
        this.selectedEvent = {
            id: formation.id,
            title: formation.titre,
            description: formation.description,
            start: moment(formation.dateDebut),
            end: moment(formation.dateFin),
            calendarId: this.getCalendarIdByType(formation.type),
            allDay: false,
            formation: formation
        };

        this.startHour = moment(formation.dateDebut).toDate();
        this.endHour = moment(formation.dateFin).toDate();

        this.eventForm.patchValue({
            title: this.selectedEvent.title,
            description: this.selectedEvent.description || '',
            start: this.selectedEvent.start,
            end: this.selectedEvent.end,
            calendarId: this.selectedEvent.calendarId,
            allDay: this.selectedEvent.allDay,
            formateurId: formation.formateurId || null,
            nombrePlaces: formation.nombrePlaces || 10,
            placesDisponibles: formation.placesDisponibles || 10,
            lieu: formation.lieu || '',
            lienVisio: formation.lienVisio || '',
            lienGoogleMaps: formation.lienGoogleMaps || '',
            prerequisFormationId: formation.prerequisFormationId || null
        });
        
        this.eventForm.updateValueAndValidity();

        setTimeout(() => {
            if (formation.lieu && this.mapInitialized) {
                this.geocodeAddress(formation.lieu);
            }
        }, 200);

        this.panelMode = 'edit';
        this.openEventPanel();
    }

    openFormateurManagement(): void {
        this.router.navigate(['/employee/formateurs']);
    }

    getCalendar(calendarId: string): Calendar | undefined {
        return this.calendars?.find(c => c.id === calendarId);
    }

    changeView(view: string): void {
        this.view = view;
        if (this.fullCalendar?.getApi()) {
            this.fullCalendar.getApi().changeView(view);
        }
    }

    previous(): void {
        if (this.fullCalendar?.getApi()) {
            this.fullCalendar.getApi().prev();
        }
    }

    next(): void {
        if (this.fullCalendar?.getApi()) {
            this.fullCalendar.getApi().next();
        }
    }

    today(): void {
        if (this.fullCalendar?.getApi()) {
            this.fullCalendar.getApi().today();
        }
    }

    toggleDrawer(): void {
        this.drawerOpened = !this.drawerOpened;
    }

    openRecurrenceDialog(): void {}

    onCalendarUpdated(event: any): void {
        this.loadFormations();
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // ==================== MÉTHODES GOOGLE MAPS ====================

   initMap(): void {
    const mapElement = document.getElementById('location-map');

    if (!mapElement) {
        console.error('❌ Élément map non trouvé');
        return;
    }

    if (typeof google === 'undefined' || !google.maps) {
        console.error('❌ Google Maps non disponible');
        this.mapLoadError = true;
        this.mapLoading = false;
        return;
    }

    try {
        this.geocoder = new google.maps.Geocoder();

        const mapOptions = {
            center: this.mapCenter,
            zoom: this.mapZoom,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            streetViewControl: true,
            zoomControl: true,
            fullscreenControl: true,
            mapTypeControl: true,
            restriction: {
                latLngBounds: {
                    north: 37.5,
                    south: 30.0,
                    west: 7.0,
                    east: 12.0
                },
                strictBounds: false
            }
        };

        this.map = new google.maps.Map(mapElement, mapOptions);

        this.marker = new google.maps.Marker({
            position: this.mapCenter,
            map: this.map,
            draggable: true,
            title: 'Emplacement de la formation',
            animation: google.maps.Animation.DROP
        });

        // ✅ DRAGEND du marqueur - Met à jour les deux champs
        this.marker.addListener('dragend', (event: any) => {
            const lat = event.latLng.lat();
            const lng = event.latLng.lng();
            this.ngZone.run(() => {
                this.reverseGeocode(lat, lng);
            });
        });

        // ✅ CLIC sur la carte - Met à jour les deux champs
        this.map.addListener('click', (event: any) => {
            const lat = event.latLng.lat();
            const lng = event.latLng.lng();
            this.marker.setPosition(event.latLng);
            this.ngZone.run(() => {
                this.reverseGeocode(lat, lng);
            });
        });

        // Autocomplete pour la recherche d'adresse
        const input = document.getElementById('lieu-input') as HTMLInputElement;
        if (input && google.maps.places) {
            this.autocomplete = new google.maps.places.Autocomplete(input, {
                types: ['address', 'establishment', 'geocode'],
                componentRestrictions: { country: 'tn' }
            });

            this.autocomplete.addListener('place_changed', () => {
                const place = this.autocomplete.getPlace();
                if (place.geometry) {
                    const location = place.geometry.location;
                    const lat = location.lat();
                    const lng = location.lng();

                    this.map.setCenter(location);
                    this.marker.setPosition(location);
                    this.map.setZoom(15);

                    this.ngZone.run(() => {
                        // ✅ Remplir le champ lieu avec l'adresse formatée
                        if (place.formatted_address) {
                            this.eventForm.patchValue({ lieu: place.formatted_address }, { emitEvent: false });
                        }
                        // ✅ Générer le lien Google Maps
                        const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
                        this.eventForm.patchValue({ lienGoogleMaps: mapsLink }, { emitEvent: false });
                        this.cdr.detectChanges();
                    });
                }
            });
        }

        this.mapInitialized = true;
        this.mapLoading = false;

        if (this.panelMode === 'edit' && this.selectedEvent?.formation?.lieu) {
            setTimeout(() => {
                this.geocodeAddress(this.selectedEvent.formation.lieu);
            }, 500);
        }

    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation de la carte:', error);
        this.mapLoadError = true;
        this.mapLoading = false;
    }
}
   centerMapOnTunis(): void {
    if (!this.map) return;
    
    const tunisPosition = { lat: 36.8065, lng: 10.1815 };
    this.map.setCenter(tunisPosition);
    this.map.setZoom(12);
    this.marker.setPosition(tunisPosition);
    // ✅ Met à jour les deux champs
    this.reverseGeocode(36.8065, 10.1815);
}

  reverseGeocode(lat: number, lng: number): void {
    if (!this.geocoder || typeof google === 'undefined' || !google.maps) {
        console.warn('API Maps non disponible, utilisation des coordonnées');
        // ✅ Remplir les deux champs avec les coordonnées
        const lieuValue = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
        
        this.ngZone.run(() => {
            this.eventForm.patchValue({ 
                lieu: lieuValue,
                lienGoogleMaps: mapsLink 
            }, { emitEvent: false });
            this.cdr.detectChanges();
        });
        return;
    }

    this.geocoder.geocode({ location: { lat: lat, lng: lng } }, (results: any, status: any) => {
        this.ngZone.run(() => {
            if (status === 'OK' && results && results[0]) {
                const address = results[0].formatted_address;
                // ✅ Remplir le champ lieu avec l'adresse formatée
                this.eventForm.patchValue({ lieu: address }, { emitEvent: false });
            } else {
                // ✅ Si pas d'adresse trouvée, utiliser les coordonnées
                this.eventForm.patchValue({ 
                    lieu: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
                }, { emitEvent: false });
            }
            
            // ✅ TOUJOURS générer le lien Google Maps à partir des coordonnées
            const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
            this.eventForm.patchValue({ 
                lienGoogleMaps: mapsLink 
            }, { emitEvent: false });
            
            this.cdr.detectChanges();
        });
    });
}

    checkGoogleMapsLoaded(): void {
        let attempts = 0;
        const maxAttempts = 20;

        const checkInterval = setInterval(() => {
            attempts++;

            if (typeof google !== 'undefined' && google.maps) {
                clearInterval(checkInterval);
                this.ngZone.run(() => {
                    this.mapLoading = false;
                    setTimeout(() => {
                        this.initMap();
                    }, 100);
                });
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                this.ngZone.run(() => {
                    this.mapLoadError = true;
                    this.mapLoading = false;
                });
            }
        }, 500);
    }

    openEventPanel(): void {
        const dialogRef = this.dialog.open(this.eventPanel, {
            width: '650px',
            maxWidth: '90vw',
            position: { top: '50px' },
            panelClass: 'event-panel-dialog',
            autoFocus: false
        });

        dialogRef.afterOpened().subscribe(() => {
            setTimeout(() => {
                if (this.mapInitialized && this.map) {
                    google.maps.event.trigger(this.map, 'resize');
                    if (this.panelMode === 'edit' && this.selectedEvent?.formation?.lieu) {
                        this.geocodeAddress(this.selectedEvent.formation.lieu);
                    }
                } else if (!this.mapLoadError) {
                    this.initMap();
                }
                this.cdr.detectChanges();
            }, 300);
        });

        dialogRef.afterClosed().subscribe(() => {
            this.panelMode = 'view';
            this.selectedEvent = null;
            this.eventForm.reset();
        });
    }

    changeEventPanelMode(mode: string, editMode: string): void {
        if (mode === 'edit' && this.selectedEvent) {
            this.startHour = moment(this.selectedEvent.start).toDate();
            this.endHour = moment(this.selectedEvent.end).toDate();
            
            this.eventForm.patchValue({
                title: this.selectedEvent.title,
                description: this.selectedEvent.description,
                start: this.selectedEvent.start,
                end: this.selectedEvent.end,
                calendarId: this.selectedEvent.calendarId,
                allDay: this.selectedEvent.allDay,
                formateurId: this.selectedEvent.formation?.formateurId || null,
                nombrePlaces: this.selectedEvent.formation?.nombrePlaces || 10,
                placesDisponibles: this.selectedEvent.formation?.placesDisponibles || 10,
                lieu: this.selectedEvent.formation?.lieu || '',
                lienVisio: this.selectedEvent.formation?.lienVisio || '',
                lienGoogleMaps: this.selectedEvent.formation?.lienGoogleMaps || '',
                prerequisFormationId: this.selectedEvent.formation?.prerequisFormationId || null
            });

            setTimeout(() => {
                if (this.selectedEvent.formation?.lieu && this.mapInitialized) {
                    this.geocodeAddress(this.selectedEvent.formation.lieu);
                }
            }, 200);
        }

        this.panelMode = mode as any;
        this.eventEditMode = editMode;
    }
     geocodeAddress(address: string): void {
    if (!this.geocoder) return;
    
    this.geocoder.geocode({ address: address, componentRestrictions: { country: 'tn' } }, (results: any, status: any) => {
        if (status === 'OK' && results && results[0]) {
            const location = results[0].geometry.location;
            const lat = location.lat();
            const lng = location.lng();
            
            this.map.setCenter(location);
            this.map.setZoom(15);
            this.marker.setPosition(location);
            
            // ✅ Met à jour les deux champs
            this.ngZone.run(() => {
                this.eventForm.patchValue({ lieu: address }, { emitEvent: false });
                const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
                this.eventForm.patchValue({ lienGoogleMaps: mapsLink }, { emitEvent: false });
                this.cdr.detectChanges();
            });
        }
    });
}
    resetMap(): void {
        console.log('🗺️ Réinitialisation complète de la carte...');
        
        try {
            if (this.map) {
                if (this.marker) {
                    google.maps.event.clearInstanceListeners(this.marker);
                    this.marker.setMap(null);
                    this.marker = null;
                }
                if (this.autocomplete) {
                    google.maps.event.clearInstanceListeners(this.autocomplete);
                    this.autocomplete = null;
                }
                google.maps.event.clearInstanceListeners(this.map);
                this.map = null;
            }
            
            this.mapInitialized = false;
            this.mapLoadError = false;
            this.mapLoading = true;
            
            this.mapCenter = { lat: 36.8065, lng: 10.1815 };
            this.mapZoom = 12;
            
            this.eventForm.patchValue({
                lieu: '',
                lienGoogleMaps: ''
            }, { emitEvent: false });
            
            this.cdr.detectChanges();
            
            setTimeout(() => {
                const mapElement = document.getElementById('location-map');
                if (mapElement) {
                    mapElement.innerHTML = '';
                    
                    if (typeof google !== 'undefined' && google.maps) {
                        this.geocoder = new google.maps.Geocoder();
                    }
                    
                    this.initMap();
                    
                    this.dialogService.alert({
                        title: 'Carte réinitialisée',
                        message: 'La carte a été rechargée et recentrée sur la Tunisie.',
                        type: 'success',
                        confirmText: 'Fermer',
                    });
                } else {
                    setTimeout(() => {
                        this.reloadMapComplete();
                    }, 500);
                }
            }, 200);
            
        } catch (error) {
            console.error('❌ Erreur lors de la réinitialisation:', error);
            this.mapLoadError = true;
            this.mapLoading = false;
            this.cdr.detectChanges();
        }
    }

    reloadMapComplete(): void {
        console.log('🔄 Rechargement complet de la carte...');
        
        const currentLieu = this.eventForm.get('lieu')?.value;
        
        if (this.map) {
            if (this.marker) {
                google.maps.event.clearInstanceListeners(this.marker);
                this.marker.setMap(null);
                this.marker = null;
            }
            if (this.autocomplete) {
                google.maps.event.clearInstanceListeners(this.autocomplete);
                this.autocomplete = null;
            }
            google.maps.event.clearInstanceListeners(this.map);
            this.map = null;
        }
        
        this.mapInitialized = false;
        this.mapLoadError = false;
        this.mapLoading = true;
        this.mapCenter = { lat: 36.8065, lng: 10.1815 };
        
        this.cdr.detectChanges();
        
        setTimeout(() => {
            const mapElement = document.getElementById('location-map');
            if (mapElement) {
                mapElement.innerHTML = '';
            }
            
            if (typeof google !== 'undefined' && google.maps) {
                this.checkGoogleMapsLoaded();
            } else {
                this.reloadGoogleMapsScript();
            }
            
            if (currentLieu && currentLieu !== '') {
                setTimeout(() => {
                    this.updateMapLocation(currentLieu);
                }, 1000);
            }
        }, 300);
    }

    reloadGoogleMapsScript(): void {
        console.log('🔄 Rechargement du script Google Maps...');
        
        const oldScript = document.querySelector('script[src*="maps.googleapis.com"]');
        if (oldScript) {
            oldScript.remove();
        }
        
        if (typeof google !== 'undefined') {
            delete (window as any).google;
        }
        
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=VOTRE_CLE_API&libraries=places&callback=initMapAfterReload`;
        script.async = true;
        script.defer = true;
        
        (window as any).initMapAfterReload = () => {
            console.log('✅ Google Maps rechargé avec succès');
            this.ngZone.run(() => {
                this.checkGoogleMapsLoaded();
            });
            delete (window as any).initMapAfterReload;
        };
        
        script.onerror = () => {
            console.error('❌ Erreur lors du rechargement de Google Maps');
            this.ngZone.run(() => {
                this.mapLoadError = true;
                this.mapLoading = false;
                this.cdr.detectChanges();
            });
        };
        
        document.head.appendChild(script);
    }
    // ==================== PROPRIÉTÉS SUPPLÉMENTAIRES ====================

// Dashboard
showDashboard: boolean = false;
dashboardStats: any = {
    totalFormations: 0,
    totalParticipants: 0,
    tauxOccupationMoyen: 0,
    formationsParCategorie: {},
    formationsParMois: [],
    formateursPlusActifs: [],
    formationsProchaines: [],
    alertes: []
};

// Notifications
notifications: any[] = [];
showNotifications: boolean = false;
unreadNotificationsCount: number = 0;

// Participants
showParticipantsModal: boolean = false;
selectedFormationParticipants: any = null;
participantsList: any[] = [];
listeAttente: any[] = [];
isLoadingParticipants: boolean = false;

// Export
isExporting: boolean = false;
showExportMenu: boolean = false;

// Filtres
searchQuery: string = '';
filterCategory: string = '';
filterFormateur: string = '';
filterStatus: string = '';
filteredFormations: Formation[] = [];
showFilters: boolean = false;

// ==================== MÉTHODES DASHBOARD ====================

computeDashboardStats(): void {
    const now = moment();
    this.dashboardStats.totalFormations = this.formations.length;
    
    let totalPlaces = 0;
    let totalDisponibles = 0;
    const catCount: { [key: string]: number } = {};
    const formateurCount: { [key: string]: number } = {};
    const alertes: any[] = [];
    const prochaines: any[] = [];

    this.formations.forEach(f => {
        totalPlaces += f.nombrePlaces || 0;
        totalDisponibles += f.placesDisponibles || 0;
        const cat = f.type || 'AUTRE';
        catCount[cat] = (catCount[cat] || 0) + 1;
        if (f.formateur) formateurCount[f.formateur] = (formateurCount[f.formateur] || 0) + 1;

        const dateDebut = moment(f.dateDebut);
        const dateFin = moment(f.dateFin);
        const estPassee = dateFin.isBefore(now);
        const nombreInscrits = (f.nombrePlaces || 0) - (f.placesDisponibles || 0);
        const tauxRemplissage = f.nombrePlaces ? (nombreInscrits / f.nombrePlaces) : 0;

        if ((f.placesDisponibles || 0) === 0 && f.nombrePlaces > 0 && !estPassee) {
            alertes.push({ type: 'error', icon: '🔴', message: `"${f.titre}" — COMPLÈTE`, formationId: f.id });
        } else if (tauxRemplissage >= 0.8 && (f.placesDisponibles || 0) > 0 && !estPassee) {
            alertes.push({ type: 'warning', icon: '⚠️', message: `"${f.titre}" — Plus que ${f.placesDisponibles} place(s)`, formationId: f.id });
        }
        if (estPassee && nombreInscrits === 0) {
            alertes.push({ type: 'warning', icon: '📅', message: `"${f.titre}" — Terminée sans participant`, formationId: f.id });
        }
        if (dateDebut.isAfter(now) && dateDebut.isBefore(moment().add(7, 'days'))) prochaines.push(f);
    });

    this.dashboardStats.totalParticipants = totalPlaces - totalDisponibles;
    this.dashboardStats.tauxOccupationMoyen = totalPlaces > 0 ? Math.round(((totalPlaces - totalDisponibles) / totalPlaces) * 100) : 0;
    this.dashboardStats.formationsParCategorie = catCount;
    this.dashboardStats.formateursPlusActifs = Object.entries(formateurCount).map(([nom, count]) => ({ nom, count })).sort((a: any, b: any) => b.count - a.count).slice(0, 5);
    this.dashboardStats.alertes = alertes;
    this.dashboardStats.formationsProchaines = prochaines.slice(0, 5);
}

toggleDashboard(): void {
    this.showDashboard = !this.showDashboard;
    if (this.showDashboard) this.computeDashboardStats();
}

// ==================== MÉTHODES NOTIFICATIONS ====================

generateNotifications(): void {
    this.notifications = [];
    const now = moment();
    this.formations.forEach(f => {
        const taux = f.nombrePlaces ? ((f.nombrePlaces - f.placesDisponibles) / f.nombrePlaces) : 0;
        if (taux >= 0.8 && f.placesDisponibles > 0) {
            this.notifications.push({ id: `places-${f.id}`, type: 'warning', titre: 'Places limitées', message: `"${f.titre}" — ${f.placesDisponibles} place(s) restante(s)`, time: now.fromNow(), read: false });
        }
        if (f.placesDisponibles === 0) {
            this.notifications.push({ id: `full-${f.id}`, type: 'error', titre: 'Formation complète', message: `"${f.titre}" n'a plus de places disponibles`, time: now.fromNow(), read: false });
        }
        const debut = moment(f.dateDebut);
        if (debut.isAfter(now) && debut.diff(now, 'days') <= 3) {
            this.notifications.push({ id: `reminder-${f.id}`, type: 'info', titre: 'Rappel formation', message: `"${f.titre}" commence dans ${debut.diff(now, 'days') + 1} jour(s)`, time: debut.format('DD/MM/YYYY'), read: false });
        }
    });
    this.unreadNotificationsCount = this.notifications.filter(n => !n.read).length;
}

toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) this.generateNotifications();
}

markAllNotificationsRead(): void {
    this.notifications.forEach(n => n.read = true);
    this.unreadNotificationsCount = 0;
}

markNotificationRead(notif: any): void {
    notif.read = true;
    this.unreadNotificationsCount = this.notifications.filter(n => !n.read).length;
}

// ==================== MÉTHODES EXPORT ====================

exportToCSV(): void {
    this.isExporting = true;
    try {
        const headers = ['Titre', 'Type', 'Date début', 'Date fin', 'Durée', 'Formateur', 'Places totales', 'Places libres'];
        const rows = this.formations.map(f => [
            `"${f.titre}"`, f.type, moment(f.dateDebut).format('DD/MM/YYYY HH:mm'), moment(f.dateFin).format('DD/MM/YYYY HH:mm'),
            f.dureeHeures || '', f.formateur || '', f.nombrePlaces || 0, f.placesDisponibles || 0
        ]);
        const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `formations_${moment().format('YYYY-MM-DD')}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        this.dialogService.alert({ title: 'Export réussi', message: 'Fichier CSV téléchargé.', type: 'success', confirmText: 'Fermer' });
    } catch (e) { console.error(e); }
    this.isExporting = false;
    this.showExportMenu = false;
}

exportToJSON(): void {
    const data = JSON.stringify(this.formations, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `formations_${moment().format('YYYY-MM-DD')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    this.showExportMenu = false;
}

printCalendar(): void {
    window.print();
    this.showExportMenu = false;
}

// ==================== MÉTHODES FILTRES ====================

applyFilters(): void {
    let result = [...this.formations];
    if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase();
        result = result.filter(f => f.titre.toLowerCase().includes(q) || (f.description && f.description.toLowerCase().includes(q)) || (f.formateur && f.formateur.toLowerCase().includes(q)));
    }
    if (this.filterCategory) result = result.filter(f => f.type === this.filterCategory);
    if (this.filterFormateur) result = result.filter(f => f.formateur === this.filterFormateur);
    this.filteredFormations = result;
    const filteredEvents = this.convertToEvents(result);
    if (this.fullCalendar?.getApi()) {
        this.fullCalendar.getApi().removeAllEvents();
        this.fullCalendar.getApi().addEventSource(filteredEvents);
    }
}

resetFilters(): void {
    this.searchQuery = '';
    this.filterCategory = '';
    this.filterFormateur = '';
    this.filterStatus = '';
    this.filteredFormations = this.formations;
    const allEvents = this.convertToEvents(this.formations);
    if (this.fullCalendar?.getApi()) {
        this.fullCalendar.getApi().removeAllEvents();
        this.fullCalendar.getApi().addEventSource(allEvents);
    }
}

getUniqueFormateurs(): string[] {
    return [...new Set(this.formations.map(f => f.formateur).filter(Boolean))] as string[];
}

// ==================== MÉTHODES PARTICIPANTS ====================


private generateMockParticipants(count: number): any[] {
    const noms = ['Ahmed Ben Ali', 'Sonia Hamdi', 'Youssef Khelifi', 'Fatma Trabelsi', 'Mehdi Gharbi', 'Leila Mansouri'];
    return Array.from({ length: Math.min(count, noms.length) }, (_, i) => ({
        id: i + 1, nom: noms[i], email: `${noms[i].toLowerCase().replace(' ', '.')}@company.tn`,
        dateInscription: moment().subtract(Math.floor(Math.random() * 30), 'days').format('DD/MM/YYYY'),
        statut: Math.random() > 0.2 ? 'Confirmé' : 'En attente'
    }));
}

private generateMockWaitlist(count: number): any[] {
    const noms = ['Slim Chaabane', 'Amira Dridi', 'Karim Jebali'];
    return Array.from({ length: count }, (_, i) => ({
        id: i + 1, nom: noms[i], email: `${noms[i].toLowerCase().replace(' ', '.')}@company.tn`,
        dateInscription: moment().subtract(i, 'days').format('DD/MM/YYYY'), position: i + 1
    }));
}
 

getNombreInscrits(formation: Formation): number {
    if (!formation || !formation.id) return 0;
    
    // Méthode 1: via participantsList (si chargée)
    if (this.participantsList && this.participantsList.length > 0) {
        const count = this.participantsList.filter(p => 
            p.statut !== 'Annulé' && 
            p.statut !== 'En attente' &&
            p.statutOriginal !== 'ANNULE'
        ).length;
        if (count > 0) return count;
    }
    
    // Méthode 2: via les places (fallback)
    const placesTotal = formation.nombrePlaces || 0;
    const placesDispo = formation.placesDisponibles || 0;
    const inscrits = placesTotal - placesDispo;
    
    return Math.max(0, inscrits);
}
loadParticipantsForKPIs(): void {
    if (!this.formations || this.formations.length === 0) return;
    
    // Charger les participants pour la première formation (exemple)
    const firstFormation = this.formations[0];
    if (firstFormation && firstFormation.id) {
        this.participantService.getParticipantsByFormation(firstFormation.id).subscribe({
            next: (inscriptions) => {
                console.log(`📋 ${inscriptions.length} participants chargés pour KPIs`);
                // Re-générer les KPIs avec les vrais données
                this.generateMockKPIs();
                this.cdr.detectChanges();
            },
            error: (err) => console.error('Erreur chargement participants:', err)
        });
    }
}

// ✅ Calculer le taux d'occupation avec le vrai nombre
getOccupancyPercent(formation: Formation): number {
    const nombrePlaces = formation?.nombrePlaces || 0;
    if (nombrePlaces === 0) return 0;
    const inscrits = this.getNombreInscrits(formation);
    return Math.round((inscrits / nombrePlaces) * 100);
}

getOccupancyColor(f: Formation): string {
    const pct = this.getOccupancyPercent(f);
    if (pct >= 90) return '#ef4444';
    if (pct >= 70) return '#f59e0b';
    return '#10b981';
}



// Dans openParticipantsModal
openParticipantsModal(formation: Formation): void {
    if (!formation || !formation.id) return;
    
    this.selectedFormationParticipants = formation;
    this.showParticipantsModal = true;
    this.isLoadingParticipants = true;
    
    // ✅ Réinitialiser les listes
    this.participantsList = [];
    this.listeAttente = [];
    
    this.participantService.getParticipantsByFormation(formation.id).subscribe({
        next: (inscriptions: ParticipantInscription[]) => {
            console.log(`📋 ${inscriptions.length} inscriptions trouvées`);
            
            // ✅ Transformer et stocker TOUS les participants
            this.participantsList = inscriptions.map(ins => ({
                id: ins.employeId,
                nom: this.formatNomComplet(ins.employePrenom, ins.employeNom),
                email: ins.employeEmail,
                statut: this.getStatutFrancais(ins.statut),
                statutOriginal: ins.statut,
                dateInscription: ins.dateInscription,
                presenceValidee: ins.presenceValidee
            }));
            
            // ✅ Séparer liste d'attente si besoin
            this.listeAttente = this.participantsList.filter(p => p.statut === 'En attente');
            
            this.isLoadingParticipants = false;
            this.cdr.detectChanges();
            
            // ✅ Vérification : afficher le nombre dans la console
            const nbInscrits = this.getNombreInscrits(formation);
            console.log(`✅ ${nbInscrits} participants actifs sur ${formation.nombrePlaces} places`);
        },
        error: (err) => {
            console.error('Erreur:', err);
            this.isLoadingParticipants = false;
        }
    });
}

// ✅ Ajouter une méthode utilitaire pour formater les noms
formatParticipantName(inscription: ParticipantInscription): string {
    const prenom = inscription.employePrenom?.trim() || '';
    const nom = inscription.employeNom?.trim() || '';
    
    if (prenom && nom) {
        return `${prenom} ${nom}`;
    } else if (prenom) {
        return prenom;
    } else if (nom) {
        return nom;
    } else {
        return inscription.employeEmail?.split('@')[0] || 'Participant';
    }
}

// Mettre à jour getInitials pour gérer les cas où seul le nom est présent
getInitials(nom: string): string {
    if (!nom) return '?';
    
    // Si le nom contient un espace (prénom + nom)
    if (nom.includes(' ')) {
        const parts = nom.split(' ');
        const firstInitial = parts[0]?.charAt(0) || '';
        const lastInitial = parts[parts.length - 1]?.charAt(0) || '';
        return (firstInitial + lastInitial).toUpperCase().substring(0, 2);
    }
    
    // Si seulement un nom (sans prénom)
    return nom.charAt(0).toUpperCase();
}

// Ajouter une méthode utilitaire pour traduire les statuts
private getStatutFrancais(statut: string): string {
    const statuts: { [key: string]: string } = {
        'CONFIRME': 'Confirmé',
        'PRESENT': 'Présent',
        'ABSENT': 'Absent',
        'VALIDE': 'Validé',
        'EN_ATTENTE': 'En attente',
        'INSCRIT': 'Inscrit'
    };
    return statuts[statut] || statut;
}
// calendar.component.ts
private formatNomComplet(prenom: string | null, nom: string | null): string {
    const p = prenom && prenom !== 'null' ? prenom.trim() : '';
    const n = nom && nom !== 'null' ? nom.trim() : '';
    
    if (p && n) return `${p} ${n}`;
    if (n) return n;
    if (p) return p;
    return 'Participant';
}
// Ajouter une méthode pour rafraîchir les statistiques de la formation
refreshFormationStats(formationId: string): void {
    this.participantService.getStatistiquesFormation(formationId).subscribe({
        next: (stats) => {
            console.log('📊 Statistiques formation:', stats);
            // Optionnel: mettre à jour l'affichage
        },
        error: (err) => console.error('Erreur stats:', err)
    });
}





// Dans calendar.component.ts
loadKPIs(): void {
    this.isLoadingKPIs = true;
    
    // Appel réel au backend Spring Boot
    this.formationService.getKPIs().subscribe({
        next: (data: KPIsData) => {
            console.log('✅ KPIs reçus du backend:', data);
            this.kpisData = data;
            this.prepareKPICharts();
            this.isLoadingKPIs = false;
            this.cdr.detectChanges();
        },
        error: (err) => {
            console.error('❌ Erreur chargement KPIs depuis backend:', err);
            // Fallback: utiliser les données mockées
            console.log('📊 Utilisation des données mockées en fallback');
            this.generateMockKPIs();
            this.isLoadingKPIs = false;
        }
    });
}
/**
 * Générer des KPIs mockés (en attendant le backend)
 */
generateMockKPIs(): void {
    if (!this.formations || this.formations.length === 0) {
        console.warn('Aucune formation chargée pour les KPIs');
        return;
    }
    
    let totalPlaces = 0;
    let totalInscritsReels = 0;
    let totalReussites = 0;
    
    const tauxRemplissage: { [key: string]: number } = {};
    const tauxReussite: { [key: string]: number } = {};
    const risqueEchec: { [key: string]: number } = {};
    const alertes: { [key: string]: any } = {};
    
    this.formations.forEach(f => {
        const places = f.nombrePlaces || 0;
        const inscrits = this.getNombreInscrits(f);
        const dispo = f.placesDisponibles || 0;
        
        const verifInscrits = places - dispo;
        const finalInscrits = Math.max(inscrits, verifInscrits, 0);
        
        totalPlaces += places;
        totalInscritsReels += finalInscrits;
        
        let taux = 0;
        if (places > 0) {
            taux = (finalInscrits / places) * 100;
            taux = Math.min(100, Math.max(0, taux));
        }
        tauxRemplissage[f.titre] = Math.round(taux);
        
        let reussiteSimule = 0;
        if (finalInscrits > 0) {
            reussiteSimule = 60 + (taux * 0.3);
            reussiteSimule = Math.min(95, Math.max(40, reussiteSimule));
        }
        tauxReussite[f.titre] = Math.round(reussiteSimule);
        
        const certifies = Math.round((reussiteSimule / 100) * finalInscrits);
        totalReussites += certifies;
        
        let risque = 100 - reussiteSimule;
        risque = Math.min(90, Math.max(5, risque));
        risqueEchec[f.titre] = Math.round(risque);
        
        if (risque > 60 && finalInscrits > 0) {
            alertes[f.titre] = {
                risque: Math.round(risque),
                recommandation: risque > 75 ? 'Intervention urgente requise' : 'À surveiller attentivement',
                action: 'Contacter les apprenants à risque'
            };
        }
    });
    
    const moyTauxRemplissage = totalPlaces > 0 
        ? Math.round((totalInscritsReels / totalPlaces) * 100) : 0;
    
    const moyTauxReussite = totalInscritsReels > 0 
        ? Math.round((totalReussites / totalInscritsReels) * 100) : 0;
    
    const moyRisqueEchec = Object.values(risqueEchec).length > 0
        ? Math.round(Object.values(risqueEchec).reduce((a, b) => a + b, 0) / Object.values(risqueEchec).length) : 0;
    
    this.kpisData = {
        tauxRemplissageMoyen: moyTauxRemplissage,
        tauxReussiteGlobal: moyTauxReussite,
        totalInscrits: totalInscritsReels,
        totalCertifies: totalReussites,
        totalAbandons: totalInscritsReels - totalReussites,
        npsMoyen: 68,
        chiffreAffairesTotal: this.formations.length * 1250,
        tauxRemplissageParFormation: tauxRemplissage,
        tauxReussiteParFormation: tauxReussite,
        tauxRisqueEchecGlobal: moyRisqueEchec,
        risqueEchecParFormation: risqueEchec,
        alertesFormations: alertes,
        // 🆕 AJOUTER ICI
        employeLePlusActif: {
            employeId: 'mock-1',
            nom: 'Ben Ali',
            prenom: 'Ahmed',
            email: 'ahmed.benali@company.com',
            nombreInscriptions: 3,
            formationsSuivies: ['Angular Avancé', 'Spring Boot', 'MongoDB']
        }
    };
    
    console.log('📊 KPIs générés:', {
        totalFormations: this.formations.length,
        totalPlaces,
        totalInscrits: totalInscritsReels,
        tauxRemplissageMoyen: moyTauxRemplissage + '%',
        tauxReussiteGlobal: moyTauxReussite + '%',
        risqueGlobal: moyRisqueEchec + '%'
    });
    
    this.prepareKPICharts();
}

/**
 * Préparer les données des graphiques
 */
prepareKPICharts(): void {
    if (!this.kpisData) return;
    
    const formations = Object.keys(this.kpisData.tauxRemplissageParFormation);
    
    // Graphique 1: Taux de remplissage (barres)
    this.kpiBarChartData = {
        labels: formations,
        datasets: [{
            label: 'Taux de remplissage (%)',
            data: formations.map(f => this.kpisData!.tauxRemplissageParFormation[f]),
            backgroundColor: 'rgba(54, 162, 235, 0.7)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
        }]
    };
    
    // Graphique 2: Risque d'échec - Version simplifiée (sans fonction pour backgroundColor)
    const riskData = formations.map(f => this.kpisData!.risqueEchecParFormation[f] || 0);
    const riskColors = riskData.map(value => {
        if (value >= 70) return 'rgba(239, 68, 68, 0.7)';
        if (value >= 40) return 'rgba(245, 158, 11, 0.7)';
        return 'rgba(16, 185, 129, 0.7)';
    });
    
    this.kpiRiskChartData = {
        labels: formations,
        datasets: [{
            label: 'Risque d\'échec (%)',
            data: riskData,
            backgroundColor: riskColors,
            borderWidth: 1
        }]
    };
    
    // Graphique 3: Donut (répartition)
    this.kpiDonutChartData = {
        labels: ['Inscrits', 'Certifiés', 'Abandons'],
        datasets: [{
            data: [this.kpisData.totalInscrits, this.kpisData.totalCertifies, this.kpisData.totalAbandons],
            backgroundColor: ['#3b82f6', '#10b981', '#ef4444'],
            hoverBackgroundColor: ['#2563eb', '#059669', '#dc2626']
        }]
    };
}
/**
 * Basculer l'affichage du panel KPIs
 */
toggleKPIsPanel(): void {
    this.showKPIsPanel = !this.showKPIsPanel;
    if (this.showKPIsPanel && !this.kpisData) {
        this.loadKPIs();
    }
}

// Options des graphiques
barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
        legend: { position: 'top', labels: { font: { size: 9 } } }
    },
    scales: {
        y: { 
            beginAtZero: true, 
            max: 100, 
            title: { display: true, text: '%', font: { size: 8 } } 
        }
    }
};

horizontalBarChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    indexAxis: 'y',
    plugins: {
        legend: { position: 'top', labels: { font: { size: 9 } } }
    },
    scales: {
        x: { 
            beginAtZero: true, 
            max: 100, 
            title: { display: true, text: 'Risque (%)', font: { size: 8 } } 
        }
    }
};

doughnutChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
        legend: { position: 'bottom', labels: { font: { size: 9 } } }
    }
};
/**
 * Obtenir la couleur du risque
 */
getRisqueColor(risque: number): string {
    if (risque >= 70) return '#ef4444';
    if (risque >= 40) return '#f59e0b';
    return '#10b981';
}
getAlertesCount(): number {
    if (!this.kpisData?.alertesFormations) return 0;
    return Object.keys(this.kpisData.alertesFormations).length;
}
 


/**
 * Obtenir le texte du risque
 */
getRisqueText(risque: number): string {
    if (risque >= 70) return 'Critique';
    if (risque >= 40) return 'Modéré';
    return 'Faible';
}

/**
 * Obtenir la classe CSS du risque
 */
getRisqueClass(risque: number): string {
    if (risque >= 70) return 'text-danger';
    if (risque >= 40) return 'text-warning';
    return 'text-success';
}

/**
 * Obtenir les alertes comme tableau
 */
getAlertesArray(): { formation: string; data: any }[] {
    if (!this.kpisData?.alertesFormations) return [];
    return Object.keys(this.kpisData.alertesFormations).map(formation => ({
        formation,
        data: this.kpisData!.alertesFormations[formation]
    }));
}
/**
 * Exporter les KPIs en CSV
 */
exportKPIsToCSV(): void {
    if (!this.kpisData) return;
    
    const headers = ['Formation', 'Taux remplissage', 'Taux réussite', 'Risque échec (IA)', 'Statut'];
    const rows = this.formations.map(f => [
        `"${f.titre}"`,
        this.kpisData!.tauxRemplissageParFormation[f.titre] || 0,
        this.kpisData!.tauxReussiteParFormation[f.titre] || 0,
        this.kpisData!.risqueEchecParFormation[f.titre] || 0,
        this.getRisqueText(this.kpisData!.risqueEchecParFormation[f.titre] || 0)
    ]);
    
    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kpis_formations_${moment().format('YYYY-MM-DD')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    this.dialogService.alert({
        title: 'Export réussi',
        message: 'Le fichier CSV des KPIs a été téléchargé.',
        type: 'success',
        confirmText: 'Fermer'
    });
}
// Options des graphiques
// ==================== PROPRIÉTÉS RAPPORT IA ====================
showRapportModal: boolean = false;
isGeneratingRapport: boolean = false;
rapportContent: string = '';
rapportError: string = '';
dateGeneration: Date = new Date();

// ==================== MÉTHODES RAPPORT IA ====================

/**
 * Générer le rapport IA
 */
genererRapportIA(): void {
    this.showRapportModal = true;
    this.isGeneratingRapport = true;
    this.rapportContent = '';
    this.rapportError = '';
    this.dateGeneration = new Date();
    
    // Appel au backend
    this.formationService.genererRapportGerant().subscribe({
        next: (data) => {
            console.log('📊 Rapport IA reçu:', data);
            
            // Extraire le contenu du rapport
            if (typeof data === 'string') {
                this.rapportContent = this.formaterRapport(data);
            } else if (data && data.analyseDetaillee) {
                this.rapportContent = this.formaterRapport(data.analyseDetaillee);
            } else if (data && data.contenuRapport) {
                this.rapportContent = this.formaterRapport(data.contenuRapport);
            } else {
                // Fallback: générer rapport local
                this.rapportContent = this.genererRapportLocal();
            }
            
            this.isGeneratingRapport = false;
        },
        error: (err) => {
            console.error('❌ Erreur génération rapport:', err);
            // Fallback local
            this.rapportContent = this.genererRapportLocal();
            this.rapportError = 'Service IA temporairement indisponible. Rapport local généré.';
            this.isGeneratingRapport = false;
        }
    });
}

/**
 * Formater le rapport (convertir markdown en HTML)
 */
formaterRapport(contenu: string): string {
    if (!contenu) return '<p>Aucun contenu disponible</p>';
    
    let html = contenu;
    
    // Titres
    html = html.replace(/^# (.*)$/gm, '<h1 class="text-2xl font-bold text-blue-900 mt-6 mb-3 border-b pb-2">$1</h1>');
    html = html.replace(/^## (.*)$/gm, '<h2 class="text-xl font-bold text-blue-800 mt-5 mb-2">$1</h2>');
    html = html.replace(/^### (.*)$/gm, '<h3 class="text-lg font-semibold text-blue-700 mt-4 mb-2">$1</h3>');
    
    // Listes
    html = html.replace(/^- (.*)$/gm, '<li class="ml-4 mb-1">$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul class="list-disc my-2">$1</ul>');
    
    // Paragraphes
    html = html.replace(/^(?!<[hlu]|<\/?[hlu])(.*)$/gm, '<p class="text-gray-700 leading-relaxed mb-3">$1</p>');
    
    // Tableaux
    html = html.replace(/\|(.+)\|/g, (match) => {
        const cells = match.split('|').filter(c => c.trim());
        return '<tr>' + cells.map(c => `<td class="border border-gray-300 px-3 py-2">${c.trim()}</td>`).join('') + '</tr>';
    });
    
    // Lignes de tableau
    html = html.replace(/(<td>.*<\/td>)+/g, (match) => {
        return `<tr class="hover:bg-gray-50">${match}</tr>`;
    });
    
    // En-tête de tableau
    html = html.replace(/<th>(.*?)<\/th>/g, '<th class="border border-gray-300 px-3 py-2 bg-gray-100 font-semibold">$1</th>');
    
    // Séparateurs
    html = html.replace(/---/g, '<hr class="my-4 border-gray-300">');
    
    // Gras
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
    
    return html;
}

/**
 * Générer un rapport local (fallback sans backend)
 */
genererRapportLocal(): string {
    if (!this.kpisData) {
        return '<p class="text-red-500">Aucune donnée disponible pour générer le rapport.</p>';
    }
    
    const now = new Date();
    const kpis = this.kpisData;
    
    return `
        <h1>📊 RAPPORT STRATÉGIQUE DES FORMATIONS</h1>
        <p>Généré le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR')}</p>
        
        <h2>📈 RÉSUMÉ EXÉCUTIF</h2>
        <p>Le <strong>taux de remplissage moyen</strong> des formations est de <strong>${kpis.tauxRemplissageMoyen}%</strong> avec un <strong>taux de réussite de ${kpis.tauxReussiteGlobal}%</strong>.</p>
        <p>L'IA prédit un <strong>risque d'échec global de ${kpis.tauxRisqueEchecGlobal}%</strong>.</p>
        
        <h2>🎯 INDICATEURS CLÉS</h2>
        <table class="min-w-full border-collapse">
            <thead>
                <tr><th>Indicateur</th><th>Valeur</th><th>Statut</th></tr>
            </thead>
            <tbody>
                <tr><td>Taux de remplissage</td><td>${kpis.tauxRemplissageMoyen}%</td><td>${kpis.tauxRemplissageMoyen > 60 ? '✅ Bon' : '⚠️ À améliorer'}</td></tr>
                <tr><td>Taux de réussite</td><td>${kpis.tauxReussiteGlobal}%</td><td>${kpis.tauxReussiteGlobal > 70 ? '✅ Bon' : '⚠️ À surveiller'}</td></tr>
                <tr><td>Risque d'échec (IA)</td><td>${kpis.tauxRisqueEchecGlobal}%</td><td>${kpis.tauxRisqueEchecGlobal < 40 ? '✅ Faible' : '⚠️ Élevé'}</td></tr>
                <tr><td>Total inscriptions</td><td>${kpis.totalInscrits}</td><td>-</td></tr>
                <tr><td>Total certifiés</td><td>${kpis.totalCertifies}</td><td>-</td></tr>
                <tr><td>Chiffre d'affaires</td><td>${kpis.chiffreAffairesTotal} DT</td><td>-</td></tr>
                <tr><td>NPS (satisfaction)</td><td>${kpis.npsMoyen}/100</td><td>${kpis.npsMoyen > 50 ? '✅ Bon' : '⚠️ À améliorer'}</td></tr>
            </tbody>
        </table>
        
        <h2>⚠️ ALERTES STRATÉGIQUES</h2>
        ${this.getAlertesArray().length > 0 ? 
            this.getAlertesArray().map(a => `
                <div class="bg-red-50 border-l-4 border-red-500 p-3 my-2 rounded">
                    <strong class="text-red-700">${a.formation}</strong><br>
                    Risque: ${a.data.risque}% - ${a.data.recommandation}
                </div>
            `).join('') : 
            '<p class="text-green-600">✅ Aucune alerte critique à signaler.</p>'
        }
        
        <h2>💡 RECOMMANDATIONS PRIORITAIRES</h2>
        <ul>
            ${kpis.tauxRemplissageMoyen < 60 ? '<li><strong>🔴 Priorité Haute:</strong> Améliorer la visibilité des formations (campagne emailing, réseaux sociaux)</li>' : ''}
            ${kpis.tauxRisqueEchecGlobal > 50 ? '<li><strong>🔴 Priorité Haute:</strong> Renforcer l\'accompagnement pédagogique des apprenants à risque</li>' : ''}
            <li><strong>🟡 Priorité Moyenne:</strong> Analyser et restructurer les formations à faible taux de remplissage</li>
            <li><strong>🟢 Priorité Basse:</strong> Mettre à jour le contenu des formations à succès</li>
        </ul>
        
        <h2>🏆 EMPLOYÉ DU MOIS</h2>
        ${kpis.employeLePlusActif ? 
            `<div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p class="font-semibold text-blue-800">👤 ${kpis.employeLePlusActif.prenom} ${kpis.employeLePlusActif.nom}</p>
                <p class="text-sm text-blue-600">📚 ${kpis.employeLePlusActif.nombreInscriptions} formations suivies</p>
                <p class="text-xs text-blue-500 mt-1">Formations: ${kpis.employeLePlusActif.formationsSuivies?.join(', ') || '-'}</p>
            </div>` : 
            '<p>Aucune inscription ce mois-ci</p>'
        }
        
        <hr>
        <p class="text-gray-400 text-xs text-center">Rapport généré automatiquement • ${now.toLocaleString('fr-FR')}</p>
    `;
}

/**
 * Fermer le modal du rapport
 */
closeRapportModal(): void {
    this.showRapportModal = false;
    this.rapportContent = '';
    this.rapportError = '';
}

/**
 * Exporter le rapport en Word
 */
exporterRapportWord(): void {
    const styles = `
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 900px; margin: auto; }
            h1 { color: #1e3a8a; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
            h2 { color: #1e40af; margin-top: 30px; }
            table { border-collapse: collapse; width: 100%; margin: 15px 0; }
            th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }
            th { background: #f3f4f6; }
            .bg-red-50 { background: #fef2f2; }
            .border-l-4 { border-left-width: 4px; }
            .border-red-500 { border-color: #ef4444; }
        </style>
    `;
    
    const fullHtml = `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Rapport IA - Formations</title>
        ${styles}
    </head>
    <body>
        ${this.rapportContent}
    </body>
    </html>`;
    
    const blob = new Blob([fullHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport_ia_formations_${new Date().toISOString().split('T')[0]}.doc`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Imprimer le rapport
 */
imprimerRapport(): void {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Rapport IA - Formations</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 900px; margin: auto; }
                    h1 { color: #1e3a8a; border-bottom: 2px solid #ccc; }
                    h2 { color: #1e40af; margin-top: 30px; }
                    table { border-collapse: collapse; width: 100%; margin: 15px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
                    th { background: #f5f5f5; }
                    @media print {
                        body { margin: 0; padding: 20px; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                ${this.rapportContent}
                <p class="no-print" style="text-align: center; margin-top: 30px; color: #666;">
                    <button onclick="window.print()">🖨️ Imprimer</button>
                </p>
            </body>
            </html>
        `);
        printWindow.document.close();
    }
}


}