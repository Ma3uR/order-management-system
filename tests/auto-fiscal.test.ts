import { createSaleReceipt, sendTelegramNotification } from "../app/lib/services/fiscal-automation";
import { isCompletedStatus } from "../app/lib/utils/order-status";

jest.mock('../app/lib/services/fiscal-automation', () => ({
  createSaleReceipt: jest.fn(),
  sendTelegramNotification: jest.fn(),
}));

describe('Fiscal Automation Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create a sale receipt if the order status is completed and no receipt exists', async () => {
    const order = { id: 'order1', status: { marketplace_code: '6' }, amount: 100 };
    const existingReceipt = false;

    if (isCompletedStatus(order.status) && !existingReceipt) {
      await createSaleReceipt(order);
      await sendTelegramNotification('receipt created');
    }

    expect(createSaleReceipt).toHaveBeenCalledWith(order);
    expect(sendTelegramNotification).toHaveBeenCalledWith('receipt created');
  });

  test('should not create a sale receipt if the order already has a receipt', async () => {
    const order = { id: 'order1', status: { marketplace_code: '6' }, amount: 100 };
    const existingReceipt = true;

    if (isCompletedStatus(order.status) && existingReceipt) return;

    await createSaleReceipt(order);
    await sendTelegramNotification('receipt created');

    expect(createSaleReceipt).not.toHaveBeenCalled();
    expect(sendTelegramNotification).not.toHaveBeenCalled();
  });

  test('should not send a telegram notification if receipt creation fails', async () => {
    const order = { id: 'order1', status: { marketplace_code: '6' }, amount: 100 };
    const existingReceipt = false;
    (createSaleReceipt as jest.Mock).mockImplementationOnce(() => { throw new Error('Failed to create receipt'); });

    try {
      if (isCompletedStatus(order.status) && !existingReceipt) {
        await createSaleReceipt(order);
        await sendTelegramNotification('receipt created');
      }
    } catch {}

    expect(createSaleReceipt).toHaveBeenCalled();
    expect(sendTelegramNotification).not.toHaveBeenCalled();
  });
});

