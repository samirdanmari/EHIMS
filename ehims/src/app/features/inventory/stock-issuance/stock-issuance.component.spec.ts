import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockIssuanceComponent } from './stock-issuance.component';

describe('StockIssuanceComponent', () => {
  let component: StockIssuanceComponent;
  let fixture: ComponentFixture<StockIssuanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockIssuanceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StockIssuanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
