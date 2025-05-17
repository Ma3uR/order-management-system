import pb, { authenticatedCall } from '@/app/lib/pocketbase';

/**
 * Add a new expense to the system
 */
export async function addExpense(
  amount: number, 
  description: string, 
  date: string, 
  category?: string,
  receipt?: string
) {
  try {
    console.log(`Adding expense: ${amount} on ${date} for ${description}`);
    
    if (!amount || !description || !date) {
      return { error: 'Amount, description and date are required' };
    }
    
    const data: any = {
      amount,
      description,
      date
    };
    
    // Only add category if it's a valid non-empty string
    if (category && category.trim() !== '') {
      data.category = category;
    }
    
    if (receipt) {
      data.receipt = receipt;
    }
    
    console.log('Creating expense with data:', data);
    
    const expense = await authenticatedCall(() => 
      pb.collection('expenses').create(data)
    );
    
    console.log('Expense added successfully:', expense.id);
    
    return {
      id: expense.id,
      amount,
      description,
      date,
      category,
      message: 'Expense added successfully'
    };
  } catch (error) {
    console.error('Error adding expense:', error);
    return { error: 'Failed to add expense', details: String(error) };
  }
}

/**
 * Get expenses for a specific period
 */
export async function getExpensesForPeriod(startDate: string, endDate: string, category?: string) {
  try {
    console.log(`Getting expenses for period: ${startDate} to ${endDate}...`);
    
    if (!startDate || !endDate) {
      return { error: 'Both start date and end date are required' };
    }
    
    const filter = category
      ? `date >= "${startDate}" && date <= "${endDate}" && category = "${category}"`
      : `date >= "${startDate}" && date <= "${endDate}"`;
    
    const expenses = await authenticatedCall(() => 
      pb.collection('expenses').getList(1, 1000, { 
        filter: filter,
        sort: 'date'
      })
    );
    
    console.log(`Found ${expenses.totalItems} expenses for period`);
    
    if (expenses.totalItems === 0) {
      return { 
        message: `No expenses found for the specified period`,
        total: 0,
        expenses: []
      };
    }
    
    const totalAmount = expenses.items.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    
    return {
      total: totalAmount,
      count: expenses.totalItems,
      expenses: expenses.items.map(expense => ({
        id: expense.id,
        date: expense.date,
        amount: expense.amount,
        description: expense.description,
        category: expense.category
      }))
    };
  } catch (error) {
    console.error(`Error getting expenses:`, error);
    return { error: 'Failed to get expenses', details: String(error) };
  }
}

/**
 * Delete an expense
 */
export async function deleteExpense(expenseId: string) {
  try {
    console.log(`Deleting expense: ${expenseId}`);
    
    if (!expenseId) {
      return { error: 'Expense ID is required' };
    }
    
    await authenticatedCall(() => 
      pb.collection('expenses').delete(expenseId)
    );
    
    return {
      message: 'Expense deleted successfully'
    };
  } catch (error) {
    console.error(`Error deleting expense:`, error);
    return { error: 'Failed to delete expense', details: String(error) };
  }
} 