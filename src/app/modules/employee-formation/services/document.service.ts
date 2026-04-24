import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DocumentFormation } from '../../../shared/models/formation.model';

@Injectable({
    providedIn: 'root'
})
export class DocumentService {
    private apiUrl = 'http://localhost:8081/api/documents';

    constructor(private http: HttpClient) {}

    getDocumentsByFormation(formationId: string): Observable<DocumentFormation[]> {
        return this.http.get<DocumentFormation[]>(`${this.apiUrl}/formation/${formationId}`);
    }

    uploadDocument(
        formationId: string,
        formateurId: string,
        titre: string,
        description: string,
        type: string,
        file: File
    ): Observable<DocumentFormation> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('formationId', formationId);
        formData.append('formateurId', formateurId);
        formData.append('titre', titre);
        formData.append('description', description);
        formData.append('type', type);
        
        return this.http.post<DocumentFormation>(`${this.apiUrl}/upload`, formData);
    }

    deleteDocument(documentId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${documentId}`);
    }

    getMesRendus(employeId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/rendus/employe/${employeId}`);
    }
soumettreRendu(documentId: string, employeId: string, file: File, employeNom?: string, employePrenom?: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentId', documentId);
    formData.append('employeId', employeId);
    if (employeNom) formData.append('employeNom', employeNom);
    if (employePrenom) formData.append('employePrenom', employePrenom);
    return this.http.post(`${this.apiUrl}/rendus`, formData);
}
    getRendusByDocument(documentId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/rendus/document/${documentId}`);
    }

    downloadDocument(documentId: string): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/download/${documentId}`, {
            responseType: 'blob'
        });
    }
    // Assurez-vous que cette méthode existe avec la bonne URL
telechargerRendu(renduId: string): Observable<Blob> {
    const url = `http://localhost:8081/api/documents/rendus/${renduId}/download`;
    console.log('📡 Téléchargement depuis:', url);
    
    return this.http.get(url, {
        responseType: 'blob'
    });
}
}