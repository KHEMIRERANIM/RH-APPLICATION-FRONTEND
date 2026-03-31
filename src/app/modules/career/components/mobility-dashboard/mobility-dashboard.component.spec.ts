import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MobilityDashboardComponent } from './mobility-dashboard.component';

describe('MobilityDashboardComponent', () => {
  let component: MobilityDashboardComponent;
  let fixture: ComponentFixture<MobilityDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MobilityDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MobilityDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
