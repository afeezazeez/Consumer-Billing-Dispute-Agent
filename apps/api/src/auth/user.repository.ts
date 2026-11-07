export interface GoogleIdentity {
  subject: string;
  email: string;
  displayName: string;
  pictureUrl: string;
}

export interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  pictureUrl: string;
}

export interface UserRepository {
  saveGoogleIdentity(identity: GoogleIdentity): Promise<UserRecord>;
  findById(id: string): Promise<UserRecord | undefined>;
}
