import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosTabsComponent } from './pos-tabs.component';

describe('PosTabsComponent', () => {
  let component: PosTabsComponent;
  let fixture: ComponentFixture<PosTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosTabsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PosTabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
