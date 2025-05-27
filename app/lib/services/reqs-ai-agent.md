      # Report System Requirements

## Main Functions (Основні функції)

### Order Status Report (Done)
- Generate report of all orders with status "being assembled" (комплектуються)
- Format as quantity counts of each product needed

### Financial Calculations
1. **Balance Calculation (Підрахунок балансу)**
   - Calculate income from orders during a specified period
   - Subtract expenses for the same period
   - Requires new "expenses" (витрати) section

2. **Salary Calculation (Підрахунок зарплати)**
   - Different percentage based on order source:
     - Rozetka and Prom: 8% of order value
     - Kasta, Epicentr, and Shafa: 8.5% of order value
     - Other sources (website, Instagram, Facebook, Viber, Telegram): 10% of order value
   - If production cost (собівартість) is present, subtract it from order value before calculating percentage
   - For this I need add percentage to the sources in the database

## Additional Reports

### Product Popularity Reports (Звіти популярності товарів)
- Generate reports of top 20/50/100 most popular products (найпопулярніші товари) for a specific period
- Generate reports of top 20/50/100 least popular products (найменш популярні товари) for a specific period
- Include quantities sold and revenue generated

### Average Order Value (Середній чек)
- Calculate average order value for a specified period
- Option to segment by source/marketplace

