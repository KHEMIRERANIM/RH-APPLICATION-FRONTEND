import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Vehicule } from '../../covoiturage.service';

@Component({
  selector: 'app-vehicle-modal',
  standalone: false,
  templateUrl: './vehicle-modal.component.html'
})
export class VehicleModalComponent {
  @Input() isOpen: boolean = false;
  @Input() vehicles: Vehicule[] = [];
  
  @Output() closeModal = new EventEmitter<void>();
  @Output() addVehicle = new EventEmitter<Vehicule>();
  @Output() updateVehicle = new EventEmitter<{id: string, vehicle: Partial<Vehicule>}>();
  @Output() deleteVehicle = new EventEmitter<string>();

  showForm: boolean = false;
  editingId: string | null = null;
  vehicleForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.vehicleForm = this.fb.group({
      marque: ['', Validators.required],
      modele: ['', Validators.required],
      immatriculation: ['', Validators.required],
      nbPlaces: [4, [Validators.required, Validators.min(1)]],
      typeCarburant: ['ESSENCE', Validators.required],
      isDefault: [false]
    });
  }

  handleClose() {
    this.closeModal.emit();
  }

  openAddForm() {
    this.editingId = null;
    this.vehicleForm.reset({ nbPlaces: 4, typeCarburant: 'ESSENCE', isDefault: false });
    this.showForm = true;
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
  }

  cancelForm() {
    this.showForm = false;
    this.editingId = null;
    this.vehicleForm.reset({ nbPlaces: 4, typeCarburant: 'ESSENCE', isDefault: false });
  }

  submitForm() {
    if (this.vehicleForm.invalid) {
      this.vehicleForm.markAllAsTouched();
      return;
    }

    const formData = this.vehicleForm.value as Vehicule;
    if (this.editingId) {
      this.updateVehicle.emit({ id: this.editingId, vehicle: formData });
    } else {
      this.addVehicle.emit(formData);
    }
    this.cancelForm();
  }

  triggerDelete(id?: string) {
    if (id) {
      this.deleteVehicle.emit(id);
    }
  }
}
