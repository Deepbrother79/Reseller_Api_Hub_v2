
import React from 'react';
import { Button } from "@/components/ui/button";

interface Product {
  id: string;
  name: string;
  category: string;
  subcategory: string;
}

interface CategoryFilterProps {
  products: Product[];
  selectedCategory: string;
  selectedSubcategory: string;
  onCategoryChange: (category: string) => void;
  onSubcategoryChange: (subcategory: string) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  products,
  selectedCategory,
  selectedSubcategory,
  onCategoryChange,
  onSubcategoryChange
}) => {
  // Get unique categories from products
  const categories = Array.from(new Set(products.map(p => p.category)));
  
  // Get subcategories for selected category
  const subcategories = selectedCategory === 'All' 
    ? []
    : Array.from(new Set(products
        .filter(p => p.category === selectedCategory)
        .map(p => p.subcategory)
      ));

  return (
    <div className="space-y-4">
      {/* Category Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === 'All' ? "default" : "outline"}
          onClick={() => onCategoryChange('All')}
          size="sm"
        >
          All
        </Button>
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            onClick={() => onCategoryChange(category)}
            size="sm"
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Subcategory Buttons - only show if a specific category is selected */}
      {selectedCategory !== 'All' && subcategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedSubcategory === 'All' ? "default" : "outline"}
            onClick={() => onSubcategoryChange('All')}
            size="sm"
            className="text-xs"
          >
            All {selectedCategory}
          </Button>
          {subcategories.map((subcategory) => (
            <Button
              key={subcategory}
              variant={selectedSubcategory === subcategory ? "default" : "outline"}
              onClick={() => onSubcategoryChange(subcategory)}
              size="sm"
              className="text-xs"
            >
              {subcategory}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryFilter;
