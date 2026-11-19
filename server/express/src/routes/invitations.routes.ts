import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';

import { cache } from '../lib/cache.js';
import { HttpError } from '../lib/http-error.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { InvitationModel } from '../models/invitation.model.js';

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  eventDate: z.coerce.date(),
  location: z.string().trim().max(300).optional(),
  message: z.string().trim().max(5_000).optional(),
});
const updateSchema = createSchema.partial();

/** Each user's list is cached briefly and dropped on every write, so reads after writes are fresh. */
const LIST_TTL_SECONDS = 60;
const listKey = (uid: string) => `invitations:${uid}`;

export const invitationsRouter = Router();
invitationsRouter.use(requireAuth);

// A malformed id can't match anything: answer 404 rather than leaking a cast error.
invitationsRouter.param('id', (_req, _res, next, id: string) => {
  next(isValidObjectId(id) ? undefined : new HttpError(404, 'Invitation not found'));
});

invitationsRouter.get('/', async (req, res) => {
  const uid = req.user!.uid;
  const items = await cache.getOrSet(listKey(uid), LIST_TTL_SECONDS, async () =>
    (await InvitationModel.find({ ownerUid: uid }).sort({ eventDate: 1 })).map((d) => d.toJSON()),
  );
  res.json(items);
});

invitationsRouter.get('/:id', async (req, res) => {
  const item = await InvitationModel.findOne({ _id: req.params.id, ownerUid: req.user!.uid });
  if (!item) throw new HttpError(404, 'Invitation not found');
  res.json(item);
});

invitationsRouter.post('/', validateBody(createSchema), async (req, res) => {
  const item = await InvitationModel.create({ ...req.body, ownerUid: req.user!.uid });
  await cache.del(listKey(req.user!.uid));
  res.status(201).json(item);
});

invitationsRouter.patch('/:id', validateBody(updateSchema), async (req, res) => {
  const item = await InvitationModel.findOneAndUpdate(
    { _id: req.params.id, ownerUid: req.user!.uid },
    req.body,
    { new: true, runValidators: true },
  );
  if (!item) throw new HttpError(404, 'Invitation not found');
  await cache.del(listKey(req.user!.uid));
  res.json(item);
});

invitationsRouter.delete('/:id', async (req, res) => {
  const result = await InvitationModel.deleteOne({ _id: req.params.id, ownerUid: req.user!.uid });
  if (result.deletedCount === 0) throw new HttpError(404, 'Invitation not found');
  await cache.del(listKey(req.user!.uid));
  res.status(204).end();
});
