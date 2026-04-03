import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, from } from 'rxjs';
import { map, catchError, switchMap, concatMap, tap, last } from 'rxjs/operators';
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

  /**
   * Diminue la quantité de chaque plat commandé (1 unité par occurrence dans platIds).
   * Met à jour `disponible` si la quantité tombe à 0.
   */
  decrementPlatsApresCommande(menuId: string, platIds: string[]): Observable<Menu | null> {
    if (!menuId || !platIds?.length) {
      return of(null);
    }
    const counts = new Map<string, number>();
    platIds.forEach(id => {
      if (id) {
        counts.set(id, (counts.get(id) || 0) + 1);
      }
    });
    if (counts.size === 0) {
      return of(null);
    }
    return this.getMenuById(menuId).pipe(
      switchMap(menu => {
        let current = menu;
        return from(Array.from(counts.entries())).pipe(
          concatMap(([platId, decr]) => {
            const plat = current.plats?.find(p => p.platId === platId);
            if (!plat) {
              return of(current);
            }
            const q = Math.max(0, (Number(plat.quantite) || 0) - decr);
            const disponible = q > 0 && !!plat.disponible;
            return this.updatePlat(menuId, platId, { quantite: q, disponible }).pipe(
              tap(m => { current = m; })
            );
          }),
          last()
        );
      }),
      catchError(() => of(null))
    );
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
