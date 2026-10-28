export interface Wish {
  id: number;
  name: string;
  message: string;
  createdAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}
