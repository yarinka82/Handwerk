import path from 'node:path';
import { TEMPLATES_DIR } from '../constants';
import fs from 'node:fs/promises';
import Handlebars from 'handlebars';
import { Order } from '@prisma/client';
import { BaseUser, MessageType } from '../types/types';
import createHttpError from 'http-errors';

type BuildTemplateParams = {
  templateSource: string;
  user: BaseUser;
  link?: string;
  expires: number;
  type: MessageType;
  order?: Order;
  code?: string;
};

Handlebars.registerHelper('eq', (a, b) => a === b);

export const buildTemplate = async ({
  templateSource,
  user,
  link,
  expires,
  type,
  order,
  code,
}: BuildTemplateParams) => {
  if (!user.email) throw createHttpError(400, 'Email is required for send');

  const templatePath = path.join(TEMPLATES_DIR, templateSource);

  const templateResource = await fs.readFile(templatePath, 'utf-8');

  const template = Handlebars.compile(templateResource);

  const userName = user.name ? user.name : user.email.split('@')[0];

  const html = template({
    name: userName,
    expires,
    link,
    type,
    code,
    order,
  });

  return html;
};
