import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Menu, Plat } from 'src/app/models/menu';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private apiUrl = 'http://localhost:8081/api/menus';
  private pexelsApiKey = environment.pexelsApiKey;

  constructor(private http: HttpClient) {}

  getAllMenus(): Observable<Menu[]> {
    return this.http.get<Menu[]>(this.apiUrl);
  }

  getMenuById(id: string): Observable<Menu> {
    return this.http.get<Menu>(`${this.apiUrl}/${id}`);
  }

  createMenu(menu: Partial<Menu>): Observable<Menu> {
    return this.http.post<Menu>(this.apiUrl, menu);
  }

  updateMenu(id: string, menu: Partial<Menu>): Observable<Menu> {
    return this.http.put<Menu>(`${this.apiUrl}/${id}`, menu);
  }

  deleteMenu(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  addPlat(menuId: string, plat: Partial<Plat>): Observable<Menu> {
    return this.http.post<Menu>(`${this.apiUrl}/${menuId}/plats`, plat);
  }

  updatePlat(menuId: string, platId: string, plat: Partial<Plat>): Observable<Menu> {
    return this.http.put<Menu>(`${this.apiUrl}/${menuId}/plats/${platId}`, plat);
  }

  deletePlat(menuId: string, platId: string): Observable<Menu> {
    return this.http.delete<Menu>(`${this.apiUrl}/${menuId}/plats/${platId}`);
  }

  filterPlatsByRegime(menuId: string, regime: string): Observable<Plat[]> {
    return this.http.get<Plat[]>(`${this.apiUrl}/${menuId}/plats/regime?regime=${regime}`);
  }

  getPlatImage(nomPlat: string): Observable<string> {
    const headers = new HttpHeaders({ Authorization: this.pexelsApiKey });
    return this.http.get<any>(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(nomPlat + ' food dish')}&per_page=1`,
      { headers }
    ).pipe(
      map(res => res.photos?.[0]?.src?.medium || 'assets/images/default-food.jpg'),
      catchError(() => of('assets/images/default-food.jpg'))
    );
  }
}
