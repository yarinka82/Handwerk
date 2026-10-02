import { Request, Response } from 'express';
import {
  changeMasterProfile,
  getMasterProfile,
  registrationMaster,
} from '../service/master';

export const registrationMasterController = async (
  req: Request,
  res: Response,
) => {
  const data = await registrationMaster({
    ...req.body,
    userId: req.user.id,
  });

  res.status(201).json({
    status: 201,
    message: 'Successfully master profile created',
    data,
  });
};

export const changeMasterProfileController = async (
  req: Request,
  res: Response,
) => {
  const {
    documentsToDelete = [],
    newDocuments = [],
    ...profileData
  } = req.body;

  const master = await changeMasterProfile({
    userId: req.user.id,
    updateMasterProfile: profileData,
    documentsToDelete,
    newDocuments,
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
