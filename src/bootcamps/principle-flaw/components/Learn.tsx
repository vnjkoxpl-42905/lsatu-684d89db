import React, { useEffect, useState } from 'react';
import FlawHub from './FlawHub';
import PrincipleHub from './PrincipleHub';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface LearnProps {
  initialTab?: 'flaw' | 'principle';
  targetSection?: string | null;
}

export default function Learn({ initialTab = 'flaw', targetSection }: LearnProps) {
  const [activeTab, setActiveTab] = useState<'flaw' | 'principle'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (targetSection) {
      setTimeout(() => {
        const element = document.getElementById(targetSection);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    }
  }, [targetSection]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="pb-4 border-b border-zinc-900/50">
        <h2 className="text-4xl font-serif italic text-zinc-50 tracking-tight">Learn</h2>
        <p className="text-zinc-500 mt-2">The method behind Flaw and Principle. Read it once. Use it on every question.</p>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={(v) => setActiveTab(v as 'flaw' | 'principle')} 
        className="w-full"
      >
        <TabsList className="bg-zinc-900/50 border border-white/[0.03] p-1 rounded-xl mb-8">
          <TabsTrigger value="flaw" className="px-8 py-2 rounded-lg data-[state=active]:bg-zinc-100 data-[state=active]:text-zinc-950">Flaw</TabsTrigger>
          <TabsTrigger value="principle" className="px-8 py-2 rounded-lg data-[state=active]:bg-zinc-100 data-[state=active]:text-zinc-950">Principle</TabsTrigger>
        </TabsList>
        <TabsContent value="flaw">
          <FlawHub />
        </TabsContent>
        <TabsContent value="principle">
          <PrincipleHub />
        </TabsContent>
      </Tabs>
    </div>
  );
}
