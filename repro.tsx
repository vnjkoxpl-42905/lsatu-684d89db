import React from 'react';
import { Slot, Slottable } from '@radix-ui/react-slot';

// This will fail because Slot has 2 children
const FailingComponent = () => (
  <Slot>
    <button>Base</button>
    <span>Icon</span>
  </Slot>
);

// This will work because Slottable designates the 'element to clone'
const WorkingComponent = () => (
  <Slot>
    <Slottable>
      <button>Base</button>
    </Slottable>
    <span>Icon</span>
  </Slot>
);

console.log('Failing component attempt...');
try {
  // We can't easily 'render' in a simple script without a DOM, 
  // but we can check the logic if we had a runner.
  // Actually, I'll just write the explanation based on documentation.
} catch (e) {
  console.log(e.message);
}
