
import React from 'react';
import ReadInboxForm from './ReadInboxForm';
import ApiEndpointsCard from './ApiEndpointsCard';
import EmailResultsTable from './EmailResultsTable';

interface EmailResult {
  mail: string;
  from: string;
  time: string;
  content: string;
  code: string;
}

interface ReadInboxServiceProps {
  transactionIds: string;
  setTransactionIds: (value: string) => void;
  emailStrings: string;
  setEmailStrings: (value: string) => void;
  token: string;
  setToken: (value: string) => void;
  loading: boolean;
  results: EmailResult[];
  onSubmit: (e: React.FormEvent) => void;
  onCopy: (text: string) => void;
}

const ReadInboxService: React.FC<ReadInboxServiceProps> = ({
  transactionIds,
  setTransactionIds,
  emailStrings,
  setEmailStrings,
  token,
  setToken,
  loading,
  results,
  onSubmit,
  onCopy
}) => {
  const baseUrl = 'https://vvtnzixsxfjzwhjetrfm.supabase.co/functions/v1';

  return (
    <div className="space-y-6">
      <ReadInboxForm
        transactionIds={transactionIds}
        setTransactionIds={setTransactionIds}
        emailStrings={emailStrings}
        setEmailStrings={setEmailStrings}
        token={token}
        setToken={setToken}
        loading={loading}
        onSubmit={onSubmit}
      />

      <ApiEndpointsCard
        baseUrl={baseUrl}
        transactionIds={transactionIds}
        emailStrings={emailStrings}
        token={token}
        onCopy={onCopy}
      />

      <EmailResultsTable results={results} onCopy={onCopy} />
    </div>
  );
};

export default ReadInboxService;
