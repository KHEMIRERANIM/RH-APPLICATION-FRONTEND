import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParticipantValidationComponent } from './participant-validation.component';

describe('ParticipantValidationComponent', () => {
  let component: ParticipantValidationComponent;
  let fixture: ComponentFixture<ParticipantValidationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ParticipantValidationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParticipantValidationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
