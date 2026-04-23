export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
};

export type JwtPayload = {
  sub: string;
  email: string;
};
