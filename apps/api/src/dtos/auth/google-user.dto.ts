import type { UserRecord } from "../../auth/user.repository";

export class GoogleUserDto {
  id: string;
  email: string;
  displayName: string;
  pictureUrl: string;

  constructor(user: UserRecord) {
    this.id = user.id;
    this.email = user.email;
    this.displayName = user.displayName;
    this.pictureUrl = user.pictureUrl;
  }

  static make(user: UserRecord): GoogleUserDto {
    return new GoogleUserDto(user);
  }
}
