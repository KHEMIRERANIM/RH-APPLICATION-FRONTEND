import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// ========== INTERFACES ==========

export interface User {
    id: string;
    email: string;
    role: 'ADMIN' | 'EMPLOYEE' | 'CANDIDATE';
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Employee {
    id: string;
    user: User;
    firstName: string;
    lastName: string;
    phone: string;
    birthDate: string;
    address: string;
    photoUrl: string;
    hireDate: string;
    department: { id: string; name: string };
    jobTitle: { id: string; title: string; grade: string };
    manager: Employee;
    contractType: 'CDI' | 'CDD' | 'INTERN';
    status: 'ACTIVE' | 'SUSPENDED' | 'RESIGNED';
}

export interface Department {
    id: string;
    name: string;
}

export interface JobTitle {
    id: string;
    title: string;
    grade: 'Junior' | 'Senior' | 'Lead';
}

export interface CreateEmployeeRequest {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    birthDate?: string;
    address?: string;
    photoUrl?: string;
    hireDate?: string;
    departmentId?: string;
    jobTitleId?: string;
    managerId?: string;
    contractType: string;
    status: string;
}

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private apiUrl = 'http://localhost:8081/api';

    constructor(private http: HttpClient) { }

    // ========== AUTHENTIFICATION ==========

    login(credentials: { email: string; password: string }): Observable<any> {
        return this.http.post(`${this.apiUrl}/auth/login`, credentials);
    }

    // ========== EMPLOYEES ==========

   getAllEmployees(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users`);
}

    getEmployeeById(id: string): Observable<Employee> {
        return this.http.get<Employee>(`${this.apiUrl}/employees/${id}`);
    }

    createEmployee(employee: CreateEmployeeRequest): Observable<Employee> {
        return this.http.post<Employee>(`${this.apiUrl}/employees`, employee);
    }

    updateEmployee(id: string, employee: Partial<CreateEmployeeRequest>): Observable<Employee> {
        return this.http.put<Employee>(`${this.apiUrl}/employees/${id}`, employee);
    }

    deleteEmployee(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/employees/${id}`);
    }

    // ========== DEPARTMENTS ==========

    getAllDepartments(): Observable<Department[]> {
        return this.http.get<Department[]>(`${this.apiUrl}/departments`);
    }

    // ========== JOB TITLES ==========

    getAllJobTitles(): Observable<JobTitle[]> {
        return this.http.get<JobTitle[]>(`${this.apiUrl}/job-titles`);
    }

    // ========== MANAGERS ==========

    getAllManagers(): Observable<Employee[]> {
        return this.http.get<Employee[]>(`${this.apiUrl}/employees/managers`);
    }

    // ========== UPLOAD ==========

    uploadPhoto(file: File): Observable<{ url: string }> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'employee_avatar');
        return this.http.post<{ url: string }>(`${this.apiUrl}/upload`, formData);
    }
}
