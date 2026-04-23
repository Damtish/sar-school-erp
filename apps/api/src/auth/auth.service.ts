import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserStatus } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { UsersService } from "../users/users.service";
import { AuthUser } from "./interfaces/auth-user.interface";

type LoginResult = {
  accessToken: string;
  user: AuthUser;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.usersService.findByEmail(email);

    if (!user || !user.passwordHash || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedException("Invalid email or password");
    }

    await this.usersService.updateLastLogin(user.id);

    const authUser = this.toAuthUser(user);
    const accessToken = await this.jwtService.signAsync({
      sub: authUser.id,
      email: authUser.email,
    });

    return { accessToken, user: authUser };
  }

  async validateJwtUser(userId: string): Promise<AuthUser> {
    const user = await this.usersService.findById(userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("Invalid token");
    }

    return this.toAuthUser(user);
  }

  private toAuthUser(user: Awaited<ReturnType<UsersService["findById"]>>): AuthUser {
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.userRoles.map((userRole) => userRole.role.code),
    };
  }
}
