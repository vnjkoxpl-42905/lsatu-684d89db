import { DynamicIslandTOC } from "@/components/ui/dynamic-island-toc";
import { useParams } from 'react-router-dom';
import { EmptyState } from '@/bootcamps/main-conclusion/components/primitives/EmptyState';
import { IntegratedPathRail } from '@/bootcamps/main-conclusion/components/IntegratedPathRail';
import { Drill3_1 } from './Drill3_1';
import { Drill3_2 } from './Drill3_2';
import { Drill3_3 } from './Drill3_3';
import { Drill3_4 } from './Drill3_4';
import { Drill3_5 } from './Drill3_5';
import { Drill3_6 } from './Drill3_6';
import { Drill3_7 } from './Drill3_7';
import { Drill3_8 } from './Drill3_8';
import { Drill3_9 } from './Drill3_9';

export function DrillShell() {
  const { drillId } = useParams<{ drillId: string }>();
  
  let content;
  switch (drillId) {
    case '3.1':
      content = <Drill3_1 />;
      break;
    case '3.2':
      content = <Drill3_2 />;
      break;
    case '3.3':
      content = <Drill3_3 />;
      break;
    case '3.4':
      content = <Drill3_4 />;
      break;
    case '3.5':
      content = <Drill3_5 />;
      break;
    case '3.6':
      content = <Drill3_6 />;
      break;
    case '3.7':
      content = <Drill3_7 />;
      break;
    case '3.8':
      content = <Drill3_8 />;
      break;
    case '3.9':
      content = <Drill3_9 />;
      break;
    default:
      content = (
        <EmptyState
          title="Drill not found"
          body="Drill IDs are 3.1 through 3.9."
          surfaceId={`drill/${drillId ?? '?'}`}
        />
      );
  }

  return (
    <div className="flex h-full">
      <IntegratedPathRail />
      <div className="flex-1 overflow-y-auto">
        {content}
        <DynamicIslandTOC />
      </div>
    </div>
  );
}
