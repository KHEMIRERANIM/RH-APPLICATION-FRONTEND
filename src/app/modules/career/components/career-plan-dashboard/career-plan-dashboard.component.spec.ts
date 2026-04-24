import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CareerPlanDashboardComponent } from './career-plan-dashboard.component';

describe('CareerPlanDashboardComponent', () => {
  let component: CareerPlanDashboardComponent;
  let fixture: ComponentFixture<CareerPlanDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CareerPlanDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CareerPlanDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
