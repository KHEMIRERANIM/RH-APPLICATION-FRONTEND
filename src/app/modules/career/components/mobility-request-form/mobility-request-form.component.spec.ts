import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MobilityRequestFormComponent } from './mobility-request-form.component';

describe('MobilityRequestFormComponent', () => {
  let component: MobilityRequestFormComponent;
  let fixture: ComponentFixture<MobilityRequestFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MobilityRequestFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MobilityRequestFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
