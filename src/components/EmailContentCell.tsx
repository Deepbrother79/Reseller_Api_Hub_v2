
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Expand, FileText } from "lucide-react";

interface EmailContentCellProps {
  content: string;
}

const EmailContentCell: React.FC<EmailContentCellProps> = ({ content }) => {
  const [isOpen, setIsOpen] = useState(false);
  const truncatedContent = content.length > 100 ? content.substring(0, 100) + '...' : content;

  return (
    <div className="max-w-xs">
      <div className="truncate text-sm text-gray-600 mb-2">
        {truncatedContent}
      </div>
      {content.length > 100 && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="flex items-center gap-1">
              <Expand className="h-3 w-3" />
              Expand
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Full Email Content
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg">
                {content}
              </pre>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default EmailContentCell;
