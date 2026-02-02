export interface BudgetItem {
  id: string;
  name: string;
  category: string;
  status: "Ordered" | "Pending" | "Decision Needed" | "Estimating";
  cost: number;
  variance: number;
}

export interface BudgetSummary {
  total: number;
  spent: number;
  remaining: number;
}

const budgetItems: BudgetItem[] = [
  {
    id: "1",
    name: "French Oak Engineered",
    category: "Flooring",
    status: "Ordered",
    cost: 3400,
    variance: 0,
  },
  {
    id: "2",
    name: "Nordic Ash Vinyl Plank",
    category: "Flooring",
    status: "Pending",
    cost: 1800,
    variance: -200,
  },
  {
    id: "3",
    name: "Carrara Porcelain Tile",
    category: "Flooring",
    status: "Decision Needed",
    cost: 2400,
    variance: 150,
  },
  {
    id: "4",
    name: "American Walnut",
    category: "Flooring",
    status: "Estimating",
    cost: 1300,
    variance: 0,
  },
];

export function getBudgetItems(): BudgetItem[] {
  return budgetItems;
}

export function getBudgetSummary(): BudgetSummary {
  const total = 15000;
  const spent = budgetItems.reduce((acc, item) => acc + item.cost, 0);
  return {
    total,
    spent,
    remaining: total - spent,
  };
}
