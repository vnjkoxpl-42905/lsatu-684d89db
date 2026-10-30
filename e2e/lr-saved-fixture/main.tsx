import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SavedSets from '../../src/pages/SavedSets';
import '../../src/index.css';

createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={['/practice/sets']}>
  <p role="status" className="border-b p-3 text-sm">Synthetic LR saved sets. No live account or backend access. Changes are not saved.</p>
  <Routes><Route path="/practice/sets" element={<SavedSets />} /><Route path="*" element={<p className="p-6">Fixture navigation completed. No drill was started.</p>} /></Routes>
</MemoryRouter>);
