
import React from 'react';
import { Button } from "@/components/ui/button";

interface Service {
  id: string;
  name: string;
  disabled: boolean;
}

interface ServiceNavigationProps {
  services: Service[];
  activeService: string;
  onServiceChange: (serviceId: string) => void;
}

const ServiceNavigation: React.FC<ServiceNavigationProps> = ({
  services,
  activeService,
  onServiceChange
}) => {
  return (
    <div className="flex flex-wrap gap-2 mb-8">
      {services.map((service) => (
        <Button
          key={service.id}
          variant={activeService === service.id ? "default" : "outline"}
          onClick={() => !service.disabled && onServiceChange(service.id)}
          disabled={service.disabled}
          className="relative"
        >
          {service.name}
          {service.disabled && (
            <span className="absolute -top-1 -right-1 bg-yellow-500 text-xs text-white px-1 rounded-full">
              Soon
            </span>
          )}
        </Button>
      ))}
    </div>
  );
};

export default ServiceNavigation;
