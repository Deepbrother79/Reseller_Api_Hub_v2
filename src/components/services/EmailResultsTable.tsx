
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Clock, FileText, Hash } from "lucide-react";
import EmailContentCell from "@/components/EmailContentCell";

interface EmailResult {
  mail: string;
  from: string;
  time: string;
  content: string;
  code: string;
}

interface EmailResultsTableProps {
  results: EmailResult[];
  onCopy: (text: string) => void;
}

const EmailResultsTable: React.FC<EmailResultsTableProps> = ({ results, onCopy }) => {
  if (results.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Email Results
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mail</TableHead>
              <TableHead>From</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Content</TableHead>
              <TableHead>Code</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{result.mail}</TableCell>
                <TableCell>{result.from}</TableCell>
                <TableCell className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {result.time}
                </TableCell>
                <TableCell>
                  <EmailContentCell content={result.content} />
                </TableCell>
                <TableCell>
                  {result.code && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onCopy(result.code)}
                      className="flex items-center gap-1"
                    >
                      <Hash className="h-3 w-3" />
                      {result.code}
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default EmailResultsTable;
