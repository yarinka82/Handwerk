import { Request, Response } from 'express';
import {
  getMasterProfile,
  registrationMaster,
  updateMasterProfile,
} from '../service/master';

export const registrationMasterController = async (
  req: Request,
  res: Response,
) => {
  const files = req.files as {
    photoFile?: Express.Multer.File[];
    documentFiles?: Express.Multer.File[];
  };

  const data = await registrationMaster({
    userId: req.user.id,
    ...req.body,
    photoFile: files.photoFile?.[0],
    documentFiles: files.documentFiles ?? [],
  });

  res.status(201).json({
    status: 201,
    message: 'Successfully master profile created',
    data,
  });
};

export const updateMasterProfileController = async (
  req: Request,
  res: Response,
) => {
  const files = req.files as {
    photoFile?: Express.Multer.File[];
    documentFiles?: Express.Multer.File[];
  };
  console.log('🚀 ~ updateMasterProfileController ~ files:', files);

  const master = await updateMasterProfile({
    userId: req.user.id,
    ...req.body,
    photoFile: files.photoFile?.[0],
    newDocuments: files.documentFiles ?? [],
  });

  res.status(200).json({
    status: 200,
    message: 'Profile master update successfully',
    data: master,
  });
};

export const getMasterProfileController = async (
  req: Request,
  res: Response,
) => {
  const master = await getMasterProfile(req.user.id);

  res.status(200).json({
    status: 200,
    message: 'Request successfully',
    data: master,
  });
};
