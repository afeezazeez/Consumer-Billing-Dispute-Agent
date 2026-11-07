import { EntitySchema } from "typeorm";

export class UserEntity {
  id!: string;
  googleSubject!: string;
  email!: string;
  displayName!: string;
  pictureUrl!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export const userSchema = new EntitySchema<UserEntity>({
  name: "User",
  target: UserEntity,
  tableName: "users",
  columns: {
    id: { type: "uuid", primary: true },
    googleSubject: { name: "google_subject", type: "varchar", length: 255, unique: true },
    email: { type: "varchar", length: 320, unique: true },
    displayName: { name: "display_name", type: "varchar", length: 200 },
    pictureUrl: { name: "picture_url", type: "text", default: "" },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true },
    updatedAt: { name: "updated_at", type: "timestamptz", updateDate: true },
  },
});
