import { Request, Response } from 'express';
import {
  cancelledOrder,
  confirmCompletedOrder,
  createOrder,
  deleteOrder,
  requestConfirmCustomer,
  requestConfirmMaster,
  requestReservedOrder,
} from '../service/order';

export const createOrderController = async (req: Request, res: Response) => {
  const order = await createOrder({
    user: req.user,
    payload: req.body,
  });

  res.status(201).json({
    status: 201,
    message: 'Order create successfully',
    data: order,
  });
};

export const requestConfirmCustomerController = async (
  req: Request,
  res: Response,
) => {
  const order = await requestConfirmCustomer({
    channel: req.body.channel,
    value: req.body.value,
    code: req.body.code,
    token: req.body.token,
    requestId: req.body.requestId,
  });

  res.status(200).json({
    status: 200,
    message: 'Order confirmed successfully',
    data: order,
  });
};

export const requestConfirmMasterController = async (
  req: Request,
  res: Response,
) => {
  const order = await requestConfirmMaster({
    userId: req.user.id,
    orderId: req.body.orderId,
    startAt: req.body.startAt,
    endAt: req.body.endAt,
     reservMinutes: req.body.reservMinutes,
  });

  res.status(200).json({
    status: 200,
    message: 'Order confirmed successfully',
    data: order,
  });
};

export const requestReservedOrderController = async (
  req: Request,
  res: Response,
) => {
  const data = await requestReservedOrder({
    userId: req.user.id,
    orderId: req.body.orderId,
  });

  res.status(200).json({
    status: 200,
    message: 'Order confirmed successfully',
    data,
  });
};

export const deleteOrderController = async (req: Request, res: Response) => {
  await deleteOrder({
    userId: req.user.id,
    orderId: req.body.orderId,
  });

  res.status(201).json({
    status: 201,
    message: 'Order deleted for user successfully',
    data: { deleted: true },
  });
};

export const cancelledOrderController = async (req: Request, res: Response) => {
  await cancelledOrder({
    userId: req.user.id,
    orderId: req.body.orderId,
    cancelledReason: req.body.cancelledReason,
  });

  res.status(201).json({
    status: 201,
    message: 'Order cancelled successfully',
    data: { cancelled: true },
  });
};

export const confirmCompletedOrderController = async (
  req: Request,
  res: Response,
) => {
  await confirmCompletedOrder({
    userId: req.user.id,
    orderId: req.body.orderId,
  });

  res.status(201).json({
    status: 201,
    message: 'Order confirmed successfully',
    data: { confirmed: true },
  });
};
