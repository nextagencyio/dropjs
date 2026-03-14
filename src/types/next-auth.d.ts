import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      uid: number;
      name: string;
      email: string;
      roles: string[];
    };
  }

  interface User {
    uid: number;
    roles: string[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid: number;
    roles: string[];
  }
}
