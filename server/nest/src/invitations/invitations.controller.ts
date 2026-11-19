import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { DecodedIdToken } from 'firebase-admin/auth';

import { CurrentUser } from '../firebase/current-user.decorator.js';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard.js';
import { CreateInvitationDto, UpdateInvitationDto } from './dto/invitation.dto.js';
import { InvitationsService } from './invitations.service.js';

@Controller('invitations')
@UseGuards(FirebaseAuthGuard)
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Get()
  findAll(@CurrentUser() user: DecodedIdToken) {
    return this.invitations.findAll(user.uid);
  }

  @Get(':id')
  findOne(@CurrentUser() user: DecodedIdToken, @Param('id') id: string) {
    return this.invitations.findOne(user.uid, id);
  }

  @Post()
  create(@CurrentUser() user: DecodedIdToken, @Body() dto: CreateInvitationDto) {
    return this.invitations.create(user.uid, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: DecodedIdToken,
    @Param('id') id: string,
    @Body() dto: UpdateInvitationDto,
  ) {
    return this.invitations.update(user.uid, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: DecodedIdToken, @Param('id') id: string) {
    return this.invitations.remove(user.uid, id);
  }
}
