import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class CredentialsDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 128)
  password: string;
}

export class RefreshDto {
  @IsString()
  @MinLength(1)
  refreshToken: string;
}
