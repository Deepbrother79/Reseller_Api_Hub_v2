
import React from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Info } from "lucide-react";

interface ProductTooltipProps {
  productName: string;
  description?: string;
  children: React.ReactNode;
}

const ProductTooltip: React.FC<ProductTooltipProps> = ({ 
  productName, 
  description, 
  children 
}) => {
  if (!description) {
    return <>{children}</>;
  }

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="flex items-center gap-2 cursor-help">
          {children}
          <Info className="h-4 w-4 text-gray-400" />
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">{productName}</h4>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export default ProductTooltip;
