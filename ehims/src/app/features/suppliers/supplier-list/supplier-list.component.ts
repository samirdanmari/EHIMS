import { Component, OnInit, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { SupplierService } from '../services/supplier.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Supplier } from '../../../core/models/supplier.model';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-supplier-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CurrencyPipe,
    ConfirmDialogComponent,
  ],
  templateUrl: './supplier-list.component.html',
  styleUrls: ['./supplier-list.component.scss'],
})
export class SupplierListComponent implements OnInit {
  private supplierService = inject(SupplierService);
  private notificationService = inject(NotificationService);

  @ViewChild(ConfirmDialogComponent) confirmDialog!: ConfirmDialogComponent;

  isLoading = signal(true);
  isSaving = signal(false);
  suppliers = signal<Supplier[]>([]);
  filteredSuppliers = signal<Supplier[]>([]);

  searchTerm = signal('');
  isModalOpen = signal(false);
  editingSupplier = signal<Supplier | null>(null);

  form = new FormGroup({
    name: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    contact_person: new FormControl(''),
    phone: new FormControl(''),
    email: new FormControl(''),
    address: new FormControl(''),
    payment_terms: new FormControl('Net30'),
  });

  async ngOnInit() {
    await this.loadSuppliers();
    this.isLoading.set(false);
  }

  async loadSuppliers() {
    const res = await this.supplierService.listSuppliers({
      includeInactive: true,
    });
    if (res.success) {
      this.suppliers.set(res.suppliers);
      this.applySearch();
    }
  }

  applySearch() {
    const search = this.searchTerm().toLowerCase();
    this.filteredSuppliers.set(
      this.suppliers().filter((s) => s.name.toLowerCase().includes(search)),
    );
  }

  onSearchChange(value: string) {
    this.searchTerm.set(value);
    this.applySearch();
  }

  openCreateModal() {
    this.editingSupplier.set(null);
    this.form.reset({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      payment_terms: 'Net30',
    });
    this.isModalOpen.set(true);
  }

  openEditModal(supplier: Supplier) {
    this.editingSupplier.set(supplier);
    this.form.reset({
      name: supplier.name,
      contact_person: supplier.contact_person,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      payment_terms: supplier.payment_terms,
    });
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  async onSubmit() {
    if (this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);
    try {
      const value = this.form.getRawValue();
      const editing = this.editingSupplier();

      if (editing) {
        const res = await this.supplierService.updateSupplier({
          id: editing.id,
          name: value.name,
          contact_person: value.contact_person || undefined,
          phone: value.phone || undefined,
          email: value.email || undefined,
          address: value.address || undefined,
          payment_terms: (value.payment_terms as any) || undefined,
        });
        if (res.success) {
          this.notificationService.success(
            'Supplier updated',
            `${value.name} has been updated.`,
          );
          this.closeModal();
          await this.loadSuppliers();
        } else {
          this.notificationService.error(
            'Update failed',
            res.error || 'Could not update',
          );
        }
      } else {
        const res = await this.supplierService.createSupplier({
          name: value.name,
          contact_person: value.contact_person || undefined,
          phone: value.phone || undefined,
          email: value.email || undefined,
          address: value.address || undefined,
          payment_terms: (value.payment_terms as any) || undefined,
        });
        if (res.success) {
          this.notificationService.success(
            'Supplier created',
            `${value.name} has been added.`,
          );
          this.closeModal();
          await this.loadSuppliers();
        } else {
          this.notificationService.error(
            'Create failed',
            res.error || 'Could not create',
          );
        }
      }
    } finally {
      this.isSaving.set(false);
    }
  }

  async onDeactivate(supplier: Supplier) {
    const confirmed = await this.confirmDialog.open({
      title: 'Deactivate supplier?',
      message: `"${supplier.name}" will be hidden but their purchase history will be preserved.`,
      confirmText: 'Deactivate',
      type: 'danger',
    });
    if (!confirmed) return;

    const res = await this.supplierService.deactivateSupplier(supplier.id);
    if (res.success) {
      this.notificationService.success('Supplier deactivated', supplier.name);
      await this.loadSuppliers();
    } else {
      this.notificationService.error(
        'Action failed',
        res.error || 'Could not deactivate',
      );
    }
  }
}
