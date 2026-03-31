import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CareerPlanFormComponent } from './career-plan-form.component';

describe('CareerPlanFormComponent', () => {
  let component: CareerPlanFormComponent;
  let fixture: ComponentFixture<CareerPlanFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CareerPlanFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CareerPlanFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
