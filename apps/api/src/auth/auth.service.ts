import type { GoogleOAuthProvider } from "./google-oauth.provider";
import type { GoogleIdentity, UserRecord, UserRepository } from "./user.repository";

export class AuthService {
  constructor(
    private readonly googleProvider: GoogleOAuthProvider,
    private readonly users: UserRepository,
  ) {}

  createGoogleAuthorizationUrl(state: string): string {
    return this.googleProvider.createAuthorizationUrl(state);
  }

  async signInWithGoogle(code: string): Promise<UserRecord> {
    const identity: GoogleIdentity = await this.googleProvider.getIdentity(code);
    return this.users.saveGoogleIdentity(identity);
  }

  findUser(id: string): Promise<UserRecord | undefined> {
    return this.users.findById(id);
  }
}
