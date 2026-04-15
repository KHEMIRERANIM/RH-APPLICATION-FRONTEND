import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MotivationAnalysisComponent } from './motivation-analysis.component';

describe('MotivationAnalysisComponent', () => {
  let component: MotivationAnalysisComponent;
  let fixture: ComponentFixture<MotivationAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MotivationAnalysisComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MotivationAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
