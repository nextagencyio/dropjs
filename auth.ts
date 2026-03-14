import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import authConfig from './auth.config';
import { ensureDbConnection } from './src/api/init';
import { authenticateUser } from './src/auth/user';

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      credentials: {
        name: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.name || !credentials?.password) return null;

        await ensureDbConnection();
        const user = await authenticateUser(
          credentials.name as string,
          credentials.password as string,
        );
        if (!user) return null;

        return {
          id: String(user.uid),
          uid: user.uid!,
          name: user.name,
          email: user.email,
          roles: user.roles ?? ['authenticated'],
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = (user as any).uid;
        token.roles = (user as any).roles;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = String(token.uid);
      session.user.uid = token.uid;
      session.user.roles = token.roles;
      return session;
    },
  },
});
