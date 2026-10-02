import { Router } from "express";
import { confirmCompletedOrderController, createOrderController, deleteOrderController, requestConfirmCustomerController, requestConfirmMasterController, requestReservedOrderController } from "../controller/order";
import { authenticate } from "../middlewares/authenticate";

const router = Router();

router.use(authenticate);

router.post("/order/create", createOrderController);

router.patch("/order/request-confirm-customer", requestConfirmCustomerController);

router.patch("/order/request-confirm-master", requestConfirmMasterController);

router.patch("/order/request-reserved-order", requestReservedOrderController);

router.patch("/order/delete-order", deleteOrderController);

router.patch("/order/confirm-completed-order", confirmCompletedOrderController);

export default router
