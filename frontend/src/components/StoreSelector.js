import React from 'react';
import { Button } from './ui/button';
import { Store } from 'lucide-react';

export const StoreSelector = ({ stores, selectedStore, onSelectStore }) => {
  return (
    <div className="space-y-2" data-testid="store-selector">
      <label className="text-sm font-medium text-muted-foreground">Select Store</label>
      <div className="flex gap-2 flex-wrap">
        {stores.map((store) => (
          <Button
            key={store.id}
            onClick={() => onSelectStore(store)}
            variant={selectedStore?.id === store.id ? 'default' : 'secondary'}
            className={`gap-2 rounded-full ${
              selectedStore?.id === store.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground'
            }`}
            data-testid={`store-option-${store.id}`}
          >
            <Store className="w-4 h-4" strokeWidth={1.5} />
            {store.name}
          </Button>
        ))}
      </div>
    </div>
  );
};