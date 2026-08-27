import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShiftCloseComponent } from './shift-close.component';

describe('ShiftCloseComponent', () => {
  let component: ShiftCloseComponent;
  let fixture: ComponentFixture<ShiftCloseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShiftCloseComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShiftCloseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
