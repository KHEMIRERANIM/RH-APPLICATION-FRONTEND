import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Menu, Plat } from 'src/app/models/menu';

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private apiUrl = 'http://localhost:8081/api/menus';

  constructor(private http: HttpClient) {}

  getAllMenus(): Observable<Menu[]> {
    return this.http.get<Menu[]>(this.apiUrl);
  }

  getMenuById(id: string): Observable<Menu> {
    return this.http.get<Menu>(this.apiUrl + '/' + id);
  }

  createMenu(menu: Partial<Menu>): Observable<Menu> {
    return this.http.post<Menu>(this.apiUrl, menu);
  }

  updateMenu(id: string, menu: Partial<Menu>): Observable<Menu> {
    return this.http.put<Menu>(this.apiUrl + '/' + id, menu);
  }

  deleteMenu(id: string): Observable<void> {
    return this.http.delete<void>(this.apiUrl + '/' + id);
  }

  addPlat(menuId: string, plat: Partial<Plat>): Observable<Menu> {
    return this.http.post<Menu>(this.apiUrl + '/' + menuId + '/plats', plat);
  }

  updatePlat(menuId: string, platId: string, plat: Partial<Plat>): Observable<Menu> {
    return this.http.put<Menu>(this.apiUrl + '/' + menuId + '/plats/' + platId, plat);
  }

  deletePlat(menuId: string, platId: string): Observable<Menu> {
    return this.http.delete<Menu>(this.apiUrl + '/' + menuId + '/plats/' + platId);
  }

  filterPlatsByRegime(menuId: string, regime: string): Observable<Plat[]> {
    return this.http.get<Plat[]>(this.apiUrl + '/' + menuId + '/plats/regime?regime=' + regime);
  }
}
