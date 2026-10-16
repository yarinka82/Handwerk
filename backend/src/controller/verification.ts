import { Request, Response } from 'express';
import { verificationService } from '../service/verificationService';

export const verificationController = async (req: Request, res: Response) => {
  const data = await verificationService({
    token: req.body.token,
    code: req.body.code,
    refreshToken: req.cookies.refreshToken,
    sessionId: req.cookies.sessionId,
  });

  res.status(200).json({
    status: 200,
    message: 'Verified successfully',
    data,
  });
};
