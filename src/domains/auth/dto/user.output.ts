export class UserOutput {
  user: {
    id: string;
    email: string;
    name?: string;
    avatarUrl?: string;
  } | null;
}
