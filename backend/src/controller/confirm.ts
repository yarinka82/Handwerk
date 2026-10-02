// import { Request, Response } from 'express';
// import { sendVerificationEmail } from '../service/confirm';

// export const sendVerificationEmailController = async (
//   req: Request,
//   res: Response,
// ) => {
//   const data = await sendVerificationEmail({
//     email: req.body.email,
//     type: req.body.type,
//     orderId: req.body.orderId !== undefined ? req.body.orderId : {},
//   });

//   res.status(200).json({
//     status: 200,
//     message: 'Message sent',
//     data,
//   });
// };
