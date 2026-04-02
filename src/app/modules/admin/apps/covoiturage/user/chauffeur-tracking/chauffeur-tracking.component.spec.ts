import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChauffeurTrackingComponent } from './chauffeur-tracking.component';

describe('ChauffeurTrackingComponent', () => {
  let component: ChauffeurTrackingComponent;
  let fixture: ComponentFixture<ChauffeurTrackingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ChauffeurTrackingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChauffeurTrackingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
