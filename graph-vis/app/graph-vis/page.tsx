'use client';

import React from 'react';
import { GraphProvider } from '@/components/GraphContext';
import GraphContainer from '@/components/graph/GraphContainer';

export default function Home() {
  return (
    <GraphProvider>
      <GraphContainer />
    </GraphProvider>
  );
}
