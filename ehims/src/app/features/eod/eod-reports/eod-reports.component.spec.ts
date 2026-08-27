import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EodReportsComponent } from './eod-reports.component';

describe('EodReportsComponent', () => {
  let component: EodReportsComponent;
  let fixture: ComponentFixture<EodReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EodReportsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EodReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
