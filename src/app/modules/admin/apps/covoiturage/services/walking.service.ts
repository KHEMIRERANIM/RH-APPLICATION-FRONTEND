import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WalkingService {
  private readonly apiKey = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjdlMmJjOGMxOTZjYTQyNTI5Y2Y0N2JjZmJiYmI5MzUwIiwiaCI6Im11cm11cjY0In0=';
  private readonly baseUrl = 'https://api.openrouteservice.org/v2/directions/foot-walking';

  constructor(private _http: HttpClient) {}

  /**
   * Get real walking distance and duration between two points
   * @param lat1 Start Latitude
   * @param lon1 Start Longitude
   * @param lat2 End Latitude
   * @param lon2 End Longitude
   */
  getWalkingMetrics(lat1: number, lon1: number, lat2: number, lon2: number): Observable<{ distance: number, time: number }> {
    const url = `${this.baseUrl}?api_key=${this.apiKey}&start=${lon1},${lat1}&end=${lon2},${lat2}`;

    return this._http.get(url).pipe(
      map((res: any) => {
        if (res.features && res.features.length > 0) {
          const segment = res.features[0].properties.segments[0];
          return {
            distance: Math.round((segment.distance / 1000) * 100) / 100, // km
            time: Math.round(segment.duration / 60) // minutes
          };
        }
        throw new Error('No route found');
      }),
      catchError(error => {
        console.error('WalkingService Error:', error);
        // Fallback to a basic calculation if API fails
        return of(this.fallbackCalculate(lat1, lon1, lat2, lon2));
      })
    );
  }

  /**
   * Fallback using Haversine + road factor 1.3 + speed 6km/h
   */
  private fallbackCalculate(lat1: number, lon1: number, lat2: number, lon2: number): { distance: number, time: number } {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    const distanceReelle = d * 1.3;
    const t = Math.round((distanceReelle / 6) * 60);
    return { distance: Math.round(distanceReelle * 100) / 100, time: t };
  }
}
