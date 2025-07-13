"use server"

import pb, { authenticatedCall } from "@/app/lib/pocketbase";
import { ExpensesResponse, ExpensesCategoriesResponse } from "@/app/types/pocketbase-types";

export const getExpenses = async () => {
    try {
        console.log('🔍 [getExpenses] Fetching expenses with authenticated call');
        
        const expenses = await authenticatedCall(() => 
            pb.collection('expenses').getFullList<ExpensesResponse>({
                sort: '-date,-created',
                expand: 'category'
            })
        );
        
        console.log(`✅ [getExpenses] Successfully fetched ${expenses.length} expenses`);
        
        return { error: undefined, data: expenses };
    } catch (error: unknown) {
        if (error instanceof Error) {   
            console.error('❌ [getExpenses] Error fetching expenses:', error.message);
            return { error: `Не вдалося завантажити витрати: ${error.message}`, data: undefined };
        }
        console.error('❌ [getExpenses] Error fetching expenses:', error);
        return { error: 'Невідома помилка при завантаженні витрат', data: undefined };
    }
}

export const getExpenseCategories = async () => {
    try {
        console.log('🔍 [getExpenseCategories] Fetching expense categories with authenticated call');
        
        const categories = await authenticatedCall(() => 
            pb.collection('expenses_categories').getFullList<ExpensesCategoriesResponse>({
                sort: 'name'
            })
        );
        
        console.log(`✅ [getExpenseCategories] Successfully fetched ${categories.length} expense categories`);
        
        return { error: undefined, data: categories };
    } catch (error: unknown) {
        if (error instanceof Error) {   
            console.error('❌ [getExpenseCategories] Error fetching expense categories:', error.message);
            return { error: `Не вдалося завантажити категорії витрат: ${error.message}`, data: undefined };
        }
        console.error('❌ [getExpenseCategories] Error fetching expense categories:', error);
        return { error: 'Невідома помилка при завантаженні категорій витрат', data: undefined };
    }
}

export const getExpense = async (id: string) => {
    try {
        console.log(`🔍 [getExpense] Fetching expense ${id} with authenticated call`);
        
        const expense = await authenticatedCall(() => 
            pb.collection('expenses').getOne<ExpensesResponse>(id, {
                expand: 'category'
            })
        );
        
        console.log(`✅ [getExpense] Successfully fetched expense ${id}`);
        
        return { error: undefined, data: expense };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('❌ [getExpense] Error fetching expense:', error.message);
            return { error: `Не вдалося завантажити витрату: ${error.message}`, data: undefined };
        }
        console.error('❌ [getExpense] Error fetching expense:', error);
        return { error: 'Невідома помилка при завантаженні витрати', data: undefined };
    }
}

export const createExpense = async (data: {
    description: string;
    amount: number;
    date: string;
    category?: string;
}) => {
    try {
        console.log('🔍 [createExpense] Creating expense with authenticated call');
        
        const expense = await authenticatedCall(() => 
            pb.collection('expenses').create<ExpensesResponse>(data)
        );
        
        console.log(`✅ [createExpense] Successfully created expense ${expense.id}`);
        
        return { error: undefined, data: expense };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('❌ [createExpense] Error creating expense:', error.message);
            return { error: `Не вдалося створити витрату: ${error.message}`, data: undefined };
        }
        console.error('❌ [createExpense] Error creating expense:', error);
        return { error: 'Невідома помилка при створенні витрати', data: undefined };
    }
}

export const updateExpense = async (id: string, data: {
    description?: string;
    amount?: number;
    date?: string;
    category?: string;
}) => {
    try {
        console.log(`🔍 [updateExpense] Updating expense ${id} with authenticated call`);
        
        const expense = await authenticatedCall(() => 
            pb.collection('expenses').update<ExpensesResponse>(id, data)
        );
        
        console.log(`✅ [updateExpense] Successfully updated expense ${id}`);
        
        return { error: undefined, data: expense };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('❌ [updateExpense] Error updating expense:', error.message);
            return { error: `Не вдалося оновити витрату: ${error.message}`, data: undefined };
        }
        console.error('❌ [updateExpense] Error updating expense:', error);
        return { error: 'Невідома помилка при оновленні витрати', data: undefined };
    }
}

export const deleteExpense = async (id: string) => {
    try {
        console.log(`🔍 [deleteExpense] Deleting expense ${id} with authenticated call`);
        
        const deletionStatus = await authenticatedCall(() => 
            pb.collection('expenses').delete(id)
        );
        
        console.log(`✅ [deleteExpense] Successfully deleted expense ${id}`);
        
        return { error: undefined, data: deletionStatus };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('❌ [deleteExpense] Error deleting expense:', error.message);
            return { error: `Не вдалося видалити витрату: ${error.message}`, data: undefined };
        }
        console.error('❌ [deleteExpense] Error deleting expense:', error);
        return { error: 'Невідома помилка при видаленні витрати', data: undefined };
    }
}