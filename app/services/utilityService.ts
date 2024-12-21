import { OrdersResponse } from "@/app/types/pocketbase-types";

interface MonthlyStats {
  currentMonthAmount: number;
  lastMonthAmount: number;
  amountChange: number;
  amountChangePositive: boolean;
  orderCountChange: number;
  orderCountChangePositive: boolean;
  graphDataAmount: number[];
  graphDataOrders: number[];
}

export class UtilityService {
  static getContrastColor(hexColor: string): string {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#FFFFFF';
  }

  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: 'UAH',
      minimumFractionDigits: 2
    }).format(amount);
  }

  static getMonthlyStats(orders: OrdersResponse[]): MonthlyStats {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Filter orders for current and last month
    const currentMonthOrders = orders.filter(order => {
      if (!order.created) return false;
      const orderDate = new Date(order.created);
      return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
    });

    const lastMonthOrders = orders.filter(order => {
      if (!order.created) return false;
      const orderDate = new Date(order.created);
      return orderDate.getMonth() === lastMonth && orderDate.getFullYear() === lastMonthYear;
    });

    // Calculate amounts
    const currentMonthAmount = currentMonthOrders.reduce((sum, order) => sum + order.amount, 0);
    const lastMonthAmount = lastMonthOrders.reduce((sum, order) => sum + order.amount, 0);

    // Calculate changes
    const amountChange = lastMonthAmount === 0 ? 100 : ((currentMonthAmount - lastMonthAmount) / lastMonthAmount) * 100;
    const orderCountChange = lastMonthOrders.length === 0 ? 100 : 
      ((currentMonthOrders.length - lastMonthOrders.length) / lastMonthOrders.length) * 100;

    // Generate graph data (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const graphDataAmount = last7Days.map(date => {
      return orders
        .filter(order => order.created && order.created.split('T')[0] === date)
        .reduce((sum, order) => sum + order.amount, 0);
    });

    const graphDataOrders = last7Days.map(date => {
      return orders.filter(order => order.created && order.created.split('T')[0] === date).length;
    });

    return {
      currentMonthAmount,
      lastMonthAmount,
      amountChange,
      amountChangePositive: amountChange >= 0,
      orderCountChange,
      orderCountChangePositive: orderCountChange >= 0,
      graphDataAmount,
      graphDataOrders
    };
  }
} 