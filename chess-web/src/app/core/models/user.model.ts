export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  avatar?: string;
  provider?: 'local' | 'google';
  createdAt?: Date;
}
