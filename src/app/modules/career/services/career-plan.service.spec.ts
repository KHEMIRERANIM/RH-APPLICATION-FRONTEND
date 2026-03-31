import { TestBed } from '@angular/core/testing';

import { CareerPlanService } from './career-plan.service';

describe('CareerPlanService', () => {
  let service: CareerPlanService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CareerPlanService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
