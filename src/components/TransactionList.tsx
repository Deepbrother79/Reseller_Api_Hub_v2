
import React from 'react';
import { Separator } from "@/components/ui/separator";

interface Transaction {
  transaction_id: string;
  timestamp: string;
  status: string;
  quantity: number;
  qty: number;
  product_id: string;
  product_name: string;
  results?: string[];
  output_result?: string[];
  formatted_results?: string;
  token: string;
  id?: string;
  response_data?: any;
  products?: { name: string };
}

interface TransactionListProps {
  transactions: Transaction[];
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions }) => {
  if (transactions.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <Separator className="mb-4" />
      <h3 className="font-semibold mb-3">Transactions Found:</h3>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {transactions.map((transaction, index) => (
          <div key={transaction.id || index} className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-2">
              <p className="font-medium text-gray-800">Transaction ID: {transaction.id || transaction.transaction_id || 'N/A'}</p>
            </div>
            <div className="flex justify-between items-start mb-2">
              <span className="font-medium">
                {transaction.product_name || 'Unknown Product'}
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                transaction.status === 'success' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {transaction.status || 'Unknown'}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              <p>Quantity: {transaction.qty || 0}</p>
              <p>Date: {new Date(transaction.timestamp).toLocaleString('en-US')}</p>
              
              {transaction.output_result && transaction.output_result.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium">Output:</p>
                  <ul className="bg-white p-2 rounded text-xs font-mono">
                    {transaction.output_result.map((result, idx) => (
                      <li key={idx}>{result}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionList;
