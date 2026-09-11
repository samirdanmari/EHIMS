import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CashReconciliationComponent } from './cash-reconciliation.component';

describe('CashReconciliationComponent', () => {
  let component: CashReconciliationComponent;
  let fixture: ComponentFixture<CashReconciliationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CashReconciliationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CashReconciliationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
