import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamenPasserComponent } from './examen-passer.component';

describe('ExamenPasserComponent', () => {
  let component: ExamenPasserComponent;
  let fixture: ComponentFixture<ExamenPasserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ExamenPasserComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExamenPasserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
