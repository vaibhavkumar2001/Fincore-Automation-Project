export interface Account {
    id: string;
    owner: string;
    currency: string;
    balance: number;
    createdAt: string;
}

export interface LedgerEntry {
    id: string;
    accountId: string;
    transferId: string;
    type: 'debit' | 'credit';
    amount: number;
    createdAt: string;
}

export const accounts = new Map<string, Account>();
export const ledger: LedgerEntry[] = [];