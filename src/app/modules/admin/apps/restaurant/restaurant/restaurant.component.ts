import { Component } from '@angular/core';
import { RoleService } from 'app/core/auth/role.service';

@Component({
  selector: 'app-restaurant',
  templateUrl: './restaurant.component.html',
  styleUrls: ['./restaurant.component.scss']
})
export class RestaurantComponent {
  constructor(public roleService: RoleService) {}
}
