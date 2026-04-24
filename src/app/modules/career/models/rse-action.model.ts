export interface RseActionRequest {
  employeeId: string;
  type: string;
  description: string;
}

export interface RseAction {
  id: string;
  type: string;
  description: string;
  status: string;
  createdAt: string;
  employee?: any;
}