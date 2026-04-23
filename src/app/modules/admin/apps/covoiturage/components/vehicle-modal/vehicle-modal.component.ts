import { Component, OnChanges, OnInit, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Vehicule, CovoiturageService } from '../../covoiturage.service';
import { ToastrService } from 'ngx-toastr';
import { FuseConfirmationService } from '@fuse/services/confirmation';

@Component({
  selector: 'app-vehicle-modal',
  standalone: false,
  templateUrl: './vehicle-modal.component.html'
})
export class VehicleModalComponent implements OnChanges, OnInit {
  @Input() isOpen: boolean = false;
  @Input() employeId: string = '';
  
  @Output() closeModal = new EventEmitter<void>();
  @Output() vehiclesChanged = new EventEmitter<void>();

  vehicles: Vehicule[] = [];
  showForm: boolean = false;
  editingId: string | null = null;
  vehicleForm: FormGroup;

  isLoading: boolean = false;
  successMsg: string = '';
  errorMsg: string = '';

  constructor(
    private fb: FormBuilder,
    private covoiturageService: CovoiturageService,
    private _toastrService: ToastrService,
    private _fuseConfirmationService: FuseConfirmationService
  ) {
    this.vehicleForm = this.fb.group({
      marque: ['', Validators.required],
      modele: ['', Validators.required],
      immatriculation: ['', Validators.required],
      nbPlaces: [4, [Validators.required, Validators.min(1)]],
      typeCarburant: ['ESSENCE', Validators.required],
      isDefault: [false]
    });
  }

  ngOnInit() {
    if (this.isOpen && this.employeId) {
      this.cancelForm();
      this.loadVehicules();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && changes['isOpen'].currentValue === true) {
      this.cancelForm(); // Reset to list view and clear form
      this.loadVehicules();
    }
  }

  loadVehicules() {
    if (!this.employeId) return;
    this.isLoading = true;
    this.errorMsg = '';
    this.covoiturageService.getVehiculesByEmployeId(this.employeId).subscribe({
      next: (res) => {
        this.vehicles = res;
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Erreur de chargement", err);
        this.errorMsg = "Impossible de charger vos véhicules.";
        this.isLoading = false;
      }
    });
  }

  handleClose() {
    this.closeModal.emit();
  }

  openAddForm() {
    this.editingId = null;
    this.vehicleForm.reset({ nbPlaces: 4, typeCarburant: 'ESSENCE', isDefault: false });
    this.showForm = true;
    this.successMsg = '';
    this.errorMsg = '';
  }

  openEditForm(vehicle: Vehicule) {
    this.editingId = vehicle.id || null;
    this.vehicleForm.patchValue({
      marque: vehicle.marque,
      modele: vehicle.modele,
      immatriculation: vehicle.immatriculation,
      nbPlaces: vehicle.nbPlaces,
      typeCarburant: vehicle.typeCarburant,
      isDefault: vehicle.isDefault || false
    });
    this.showForm = true;
    this.successMsg = '';
    this.errorMsg = '';
  }

  cancelForm() {
    this.showForm = false;
    this.editingId = null;
    this.vehicleForm.reset({ nbPlaces: 4, typeCarburant: 'ESSENCE', isDefault: false });
    this.successMsg = '';
    this.errorMsg = '';
  }

  submitForm() {
    if (this.vehicleForm.invalid || !this.employeId) {
      this.vehicleForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMsg = '';
    this.successMsg = '';

    const formData = this.vehicleForm.value as Vehicule;
    formData.employeId = this.employeId;

    if (this.editingId) {
      this.covoiturageService.updateVehicule(this.editingId, formData).subscribe({
        next: () => {
          this.successMsg = "Véhicule mis à jour avec succès.";
          this.finishSubmit();
        },
        error: (err) => {
          this.errorMsg = "Erreur lors de la mise à jour.";
          this.isLoading = false;
        }
      });
    } else {
      this.covoiturageService.creerVehicule(formData).subscribe({
        next: () => {
          this.successMsg = "Véhicule ajouté avec succès.";
          this.finishSubmit();
        },
        error: (err) => {
          this.errorMsg = "Erreur lors de l'ajout du véhicule.";
          this.isLoading = false;
        }
      });
    }
  }

  private finishSubmit() {
    this.isLoading = false;
    this.loadVehicules();
    this.vehiclesChanged.emit();
    this.cancelForm();
  }

  triggerDelete(id?: string) {
    if (!id) return;

    const dialogRef = this._fuseConfirmationService.open({
      title: 'Supprimer le véhicule',
      message: 'Êtes-vous sûr de vouloir supprimer ce véhicule ?',
      icon: { show: true, name: 'heroicons_outline:trash', color: 'warn' },
      actions: { confirm: { label: 'Supprimer', color: 'warn' } }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'confirmed') {
        this.isLoading = true;
        this.covoiturageService.deleteVehicule(id).subscribe({
          next: () => {
            this._toastrService.success("Véhicule supprimé.");
            this.isLoading = false;
            this.loadVehicules();
            this.vehiclesChanged.emit();
          },
          error: (err) => {
            this._toastrService.error("Erreur lors de la suppression du véhicule.");
            this.isLoading = false;
          }
        });
      }
    });
  }
}
