import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';

import { CacheService } from '../redis/cache.service.js';
import type { CreateInvitationDto, UpdateInvitationDto } from './dto/invitation.dto.js';
import { Invitation } from './schemas/invitation.schema.js';

/** Each user's list is cached briefly and dropped on every write, so reads after writes are fresh. */
const LIST_TTL_SECONDS = 60;
const listKey = (uid: string) => `invitations:${uid}`;

/** Every query is scoped to the owner, so users can only see and change their own invitations. */
@Injectable()
export class InvitationsService {
  constructor(
    @InjectModel(Invitation.name) private readonly invitations: Model<Invitation>,
    private readonly cache: CacheService,
  ) {}

  findAll(ownerUid: string) {
    return this.cache.getOrSet(listKey(ownerUid), LIST_TTL_SECONDS, async () =>
      (await this.invitations.find({ ownerUid }).sort({ eventDate: 1 })).map((d) => d.toJSON()),
    );
  }

  async findOne(ownerUid: string, id: string) {
    const item = isValidObjectId(id) ? await this.invitations.findOne({ _id: id, ownerUid }) : null;
    if (!item) throw new NotFoundException('Invitation not found');
    return item;
  }

  async create(ownerUid: string, dto: CreateInvitationDto) {
    const item = await this.invitations.create({ ...dto, ownerUid });
    await this.cache.del(listKey(ownerUid));
    return item;
  }

  async update(ownerUid: string, id: string, dto: UpdateInvitationDto) {
    const item = isValidObjectId(id)
      ? await this.invitations.findOneAndUpdate({ _id: id, ownerUid }, dto, {
          new: true,
          runValidators: true,
        })
      : null;
    if (!item) throw new NotFoundException('Invitation not found');
    await this.cache.del(listKey(ownerUid));
    return item;
  }

  async remove(ownerUid: string, id: string) {
    const result = isValidObjectId(id)
      ? await this.invitations.deleteOne({ _id: id, ownerUid })
      : { deletedCount: 0 };
    if (result.deletedCount === 0) throw new NotFoundException('Invitation not found');
    await this.cache.del(listKey(ownerUid));
  }
}
