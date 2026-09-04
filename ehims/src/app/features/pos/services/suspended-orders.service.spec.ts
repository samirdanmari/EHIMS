import { TestBed } from '@angular/core/testing';

import { SuspendedOrdersService } from './suspended-orders.service';

describe('SuspendedOrdersService', () => {
  let service: SuspendedOrdersService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SuspendedOrdersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
